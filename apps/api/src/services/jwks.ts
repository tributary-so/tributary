import { generateKeyPair, exportJWK, importPKCS8 } from "jose";
import { getDb } from "../db";
import { signingKeys } from "../db/schema";
import { eq, gt, and } from "drizzle-orm";

export interface SigningKeyRecord {
  kid: string;
  privateKey: string;
  publicJwk: Record<string, unknown>;
  algorithm: string;
  isCurrent: boolean;
  createdAt: Date | null;
  expiresAt: Date | null;
  rotatedAt: Date | null;
}

interface JwkKey {
  kty: string;
  crv: string;
  kid: string;
  alg: string;
  use: string;
  x: string;
  y: string;
}

export async function getJwks(): Promise<{ keys: JwkKey[] }> {
  const db = getDb();
  const now = new Date();

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
      and(eq(signingKeys.algorithm, "ES256"), gt(signingKeys.expiresAt, now))
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
  return (rows[0] as SigningKeyRecord) ?? null;
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
  return (rows[0] as SigningKeyRecord) ?? null;
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

  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const privatePem = await exportPKCS8ToPem(privateKey);
  const publicJwk = await exportJWK(publicKey);
  const kid = await generateNextKid();

  await db.insert(signingKeys).values({
    kid,
    privateKey: privatePem,
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

async function exportPKCS8ToPem(key: CryptoKey): Promise<string> {
  const buffer = await crypto.subtle.exportKey("pkcs8", key);
  const base64 = Buffer.from(buffer).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN PRIVATE KEY-----\n${lines.join(
    "\n"
  )}\n-----END PRIVATE KEY-----`;
}
