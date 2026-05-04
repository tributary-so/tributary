import { exportJWK, importPKCS8 } from "jose";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { getDb } from "../db";
import { signingKeys } from "../db/schema";
import { eq, gt, and, or, isNull } from "drizzle-orm";
import { JwkKey, SigningKeyRecord } from "../types";

const KEY_ROTATION_DAYS = parseInt(process.env.KEY_ROTATION_DAYS || "30", 10);
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;


function getEncryptionKey(): string | undefined {
  return process.env.SIGNING_KEY_ENCRYPTION_KEY;
}

export function encryptPrivateKey(pem: string): string {
  const key = getEncryptionKey();
  if (!key) return pem;
  const keyBuf = Buffer.from(key, "hex");
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuf, iv);
  const encrypted = Buffer.concat([cipher.update(pem, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decryptPrivateKey(encrypted: string): string {
  const key = getEncryptionKey();
  if (!key) return encrypted;
  if (encrypted.startsWith("-----BEGIN")) return encrypted;
  const keyBuf = Buffer.from(key, "hex");
  const data = Buffer.from(encrypted, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, keyBuf, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

export async function getJwks(): Promise<{ keys: JwkKey[] }> {
  const db = getDb();
  const now = new Date();

  const rows = await db
    .select({
      kid: signingKeys.kid,
      publicJwk: signingKeys.publicJwk,
      algorithm: signingKeys.algorithm,
    })
    .from(signingKeys)
    .where(
      and(
        eq(signingKeys.algorithm, "ES256"),
        or(gt(signingKeys.expiresAt, now), isNull(signingKeys.expiresAt))
      )
    );
  return {
    keys: rows.map((r) => ({
      ...(r.publicJwk as Record<string, unknown>),
      kid: r.kid,
      alg: r.algorithm,
      use: "sig",
    })) as JwkKey[],
  };
}

export async function getCurrentSigningKey(): Promise<SigningKeyRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(signingKeys)
    .where(eq(signingKeys.isCurrent, true))
    .limit(1);

  if (!rows[0]) return null;

  const row = rows[0] as SigningKeyRecord;
  return {
    ...row,
    privateKey: decryptPrivateKey(row.privateKey),
  };
}

export async function getSigningKeyByKid(
  kid: string
): Promise<SigningKeyRecord | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(signingKeys)
    .where(eq(signingKeys.kid, kid))
    .limit(1);

  if (!rows[0]) return null;

  const row = rows[0] as SigningKeyRecord;
  return {
    ...row,
    privateKey: decryptPrivateKey(row.privateKey),
  };
}

export async function importPrivateKey(pem: string) {
  return importPKCS8(pem, "ES256");
}

async function generateNextKid(): Promise<string> {
  const db = getDb();
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const existing = await db
    .select({ kid: signingKeys.kid })
    .from(signingKeys)
    .limit(100);

  const todayPrefix = `trib-${dateStr}-`;
  const usedLetters = new Set<string>();
  for (const row of existing) {
    if (row.kid.startsWith(todayPrefix)) {
      usedLetters.add(row.kid.slice(todayPrefix.length));
    }
  }

  let letter = "a";
  while (usedLetters.has(letter)) {
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  return `${todayPrefix}${letter}`;
}

export async function rotateKey(): Promise<{
  newKid: string;
  oldKid: string | null;
  gracePeriodEndsAt: number;
}> {
  const db = getDb();
  const now = new Date();

  const current = await getCurrentSigningKey();
  let oldKid: string | null = null;

  if (current) {
    oldKid = current.kid;
    await db
      .update(signingKeys)
      .set({
        isCurrent: false,
        rotatedAt: now,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      })
      .where(eq(signingKeys.kid, current.kid));
  }

  const { privateKey, publicKey } = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const privatePem = await exportPKCS8ToPem(privateKey);
  const publicJwk = await exportJWK(publicKey);
  const kid = await generateNextKid();

  await db.insert(signingKeys).values({
    kid,
    privateKey: encryptPrivateKey(privatePem),
    publicJwk: publicJwk as Record<string, unknown>,
    algorithm: "ES256",
    isCurrent: true,
    expiresAt: null,
    rotatedAt: null,
  });

  return {
    newKid: kid,
    oldKid,
    gracePeriodEndsAt: Math.floor((now.getTime() + 24 * 60 * 60 * 1000) / 1000),
  };
}

async function exportPKCS8ToPem(key: any): Promise<string> {
  const buffer = await crypto.subtle.exportKey("pkcs8", key);
  const base64 = Buffer.from(buffer).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join(
    "\n"
  )}\n-----END PRIVATE KEY-----`;
}

export async function checkAndAutoRotate(): Promise<{
  rotated: boolean;
  newKid?: string;
  reason?: string;
}> {
  const db = getDb();

  const [current] = await db
    .select()
    .from(signingKeys)
    .where(eq(signingKeys.isCurrent, true))
    .limit(1);

  if (!current) {
    const result = await rotateKey();
    return { rotated: true, newKid: result.newKid, reason: "No current key" };
  }

  const createdAt = current.createdAt ? new Date(current.createdAt) : null;
  if (!createdAt) {
    return { rotated: false };
  }

  const ageMs = Date.now() - createdAt.getTime();
  const maxAgeMs = KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000;

  if (ageMs > maxAgeMs) {
    const result = await rotateKey();
    return {
      rotated: true,
      newKid: result.newKid,
      reason: `Key age ${Math.floor(
        ageMs / (24 * 60 * 60 * 1000)
      )}d exceeds ${KEY_ROTATION_DAYS}d`,
    };
  }

  return { rotated: false };
}

export function startAutoRotationCheck(
  intervalMs: number = 60 * 60 * 1000
): NodeJS.Timeout {
  const handle = setInterval(async () => {
    try {
      const result = await checkAndAutoRotate();
      if (result.rotated) {
        console.log(
          `[JWKS] Auto-rotated signing key: ${result.newKid} (${result.reason})`
        );
      }
    } catch (err) {
      console.error("[JWKS] Auto-rotation check failed:", err);
    }
  }, intervalMs);

  handle.unref();

  checkAndAutoRotate().catch((err) => {
    console.error("[JWKS] Initial rotation check failed:", err);
  });

  return handle;
}
