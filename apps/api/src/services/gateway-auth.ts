/**
 * Gateway-authority auth: wallet-sign challenge → short-lived JWT.
 *
 * Reuses the JWKS signing key (services/jwks) so verification flows through
 * the existing middleware/auth verifyToken path. The JWT carries a `gateway`
 * claim (the gateway pubkey); requireGatewayAuth enforces it matches the
 * route's :gateway param.
 *
 * Ponytail: nonce store is in-memory (Map). Single-instance ceiling — if the
 * API ever scales horizontally, swap to redis (the same redis the websocket
 * adapter already uses). Nonces are short-lived (60s) and single-use.
 */

import { SignJWT } from "jose";
import { randomBytes, randomUUID } from "crypto";
import { Connection, PublicKey } from "@solana/web3.js";
import { getCurrentSigningKey, importPrivateKey } from "./jwks";

const JWT_ISSUER = process.env.JWT_ISSUER || "https://api.tributary.so";
// ponytail: reuse the existing audience; the `gateway` claim discriminates.
// A separate audience would force a parallel verify path — not worth it.
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "tributary-checkout";
const JWT_GATEWAY_TTL_SECONDS = parseInt(
  process.env.JWT_GATEWAY_TTL_SECONDS || "900", // 15min
  10
);
const NONCE_TTL_MS = 60_000;
const SOLANA_RPC =
  process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

// ponytail: in-memory nonce store. Single-instance ceiling; see file header.
const nonces = new Map<string, { nonce: string; expiresAt: number }>();

export interface ChallengeResponse {
  nonce: string;
  gateway: string;
  expiresAt: number;
}

export interface VerifyRequest {
  gateway: string;
  signer: string;
  signature: Uint8Array; // 64-byte ed25519 signature over `nonce`
}

export interface VerifyResponse {
  token: string;
  expiresIn: number;
}

export function createChallenge(gateway: string): ChallengeResponse {
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + NONCE_TTL_MS;
  nonces.set(gateway, { nonce, expiresAt });
  return { nonce, gateway, expiresAt };
}

export function getChallenge(gateway: string): string | null {
  const entry = nonces.get(gateway);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    nonces.delete(gateway);
    return null;
  }
  return entry.nonce;
}

export function consumeChallenge(gateway: string): string | null {
  const nonce = getChallenge(gateway);
  if (nonce) nonces.delete(gateway);
  return nonce;
}

/**
 * Verify a wallet signature against a stored nonce. Two checks:
 *   1. nonce was issued by us for this gateway (and not yet consumed)
 *   2. signer IS the on-chain authority of the gateway account
 *
 * The on-chain fetch is the trust root — without it, any wallet that knows
 * the gateway pubkey could sign and pass.
 */
export async function verifyGatewayAuthority(
  req: VerifyRequest
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const nonce = consumeChallenge(req.gateway);
  if (!nonce) {
    return { ok: false, reason: "Challenge missing or expired" };
  }

  // Verify the signature: signer signed the nonce string bytes.
  const msgBytes = Buffer.from(nonce, "utf8");
  let verified: boolean;
  try {
    verified = await verifyEd25519(req.signer, msgBytes, req.signature);
  } catch {
    return { ok: false, reason: "Signature verification failed" };
  }
  if (!verified) {
    return { ok: false, reason: "Bad signature" };
  }

  // On-chain authority check.
  try {
    const connection = new Connection(SOLANA_RPC, "confirmed");
    const accountInfo = await connection.getAccountInfo(
      new PublicKey(req.gateway),
      "confirmed"
    );
    if (!accountInfo) {
      return { ok: false, reason: "Gateway account not found" };
    }
    // owner is the program; first 32 bytes after the 8-byte discriminator
    // hold the `authority: Pubkey`. The PaymentGateway account layout is:
    //   discriminator(8) | authority(32) | fee_recipient(32) | ...
    // We could use borsh via anchor, but slicing avoids an anchor dependency
    // here and matches the canonical layout frozen in ADR-0022.
    if (accountInfo.data.length < 8 + 32) {
      return { ok: false, reason: "Gateway account malformed" };
    }
    const authorityOnChain = new PublicKey(
      accountInfo.data.subarray(8, 8 + 32)
    );
    if (authorityOnChain.toString() !== req.signer) {
      return { ok: false, reason: "Signer is not the gateway authority" };
    }
  } catch (err: any) {
    return { ok: false, reason: err?.message ?? "RPC error" };
  }

  return { ok: true };
}

async function verifyEd25519(
  signer: string,
  msg: Buffer,
  signature: Uint8Array
): Promise<boolean> {
  // ponytail: Node's built-in crypto.verify supports ed25519 since v12 — no
  // extra dep. A raw 32-byte ed25519 pubkey must be wrapped in SPKI (RFC
  // 8410) before createPublicKey accepts it.
  const { createPublicKey, verify } = await import("crypto");
  try {
    const raw = new PublicKey(signer).toBuffer();
    // SPKI DER for Ed25519: 0x30 0x2a 0x30 0x05 0x06 0x03 0x2b 0x65 0x70
    //                        0x03 0x21 0x00 <32-byte key>
    const spkiDer = Buffer.concat([
      Buffer.from("302a300506032b6570032100", "hex"),
      raw,
    ]);
    const keyObj = createPublicKey({
      key: spkiDer,
      format: "der",
      type: "spki",
    });
    return verify(null, msg, keyObj, Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function issueGatewayToken(
  gateway: string,
  signer: string
): Promise<VerifyResponse> {
  const signingKey = await getCurrentSigningKey();
  if (!signingKey) {
    throw new Error("No signing key available");
  }
  const privateKey = await importPrivateKey(signingKey.privateKey);

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + JWT_GATEWAY_TTL_SECONDS;

  const jwt = await new SignJWT({ gateway })
    .setProtectedHeader({ alg: "ES256", kid: signingKey.kid, typ: "JWT" })
    .setSubject(signer)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .setNotBefore(now)
    .setJti(randomUUID())
    .sign(privateKey);

  return { token: jwt, expiresIn: JWT_GATEWAY_TTL_SECONDS };
}
