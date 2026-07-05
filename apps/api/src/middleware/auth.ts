import { Request, Response, NextFunction } from "express";
import { jwtVerify, importJWK, errors } from "jose";
import { getSigningKeyByKid } from "../services/jwks";
import type { PolicyClaim, PaymentRecord } from "@tributary-so/payments";

const JWT_ISSUER = process.env.JWT_ISSUER || "https://api.tributary.so";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "tributary-checkout";

export interface JwtPayload {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  /**
   * Discriminated `PolicyClaim[]` (per ADR-0023). Was `subscriptions` pre-v2;
   * legacy tokens carrying the old field may still arrive during the rollout
   * window — keep the optional alias so verification does not break.
   */
  policies?: PolicyClaim[];
  /** @deprecated pre-v2 alias of {@link policies}. */
  subscriptions?: PolicyClaim[];
  lastPayments?: PaymentRecord[];
  [key: string]: unknown;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    (req as any).jwtPayload = payload;
    next();
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Invalid token" });
  }
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token, { allowExpired: true });

    (req as any).jwtPayload = payload;
    next();
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Invalid token" });
  }
}

export async function verifyToken(
  token: string,
  options?: { allowExpired?: boolean }
): Promise<JwtPayload> {
  const headerB64 = token.split(".")[0];
  const header = JSON.parse(
    Buffer.from(headerB64, "base64url").toString("utf-8")
  );

  if (!header.kid) {
    throw new Error("Missing kid in token header");
  }

  const signingKey = await getSigningKeyByKid(header.kid);
  if (!signingKey) {
    throw new Error("Unknown signing key");
  }

  if (signingKey.expiresAt && new Date() > signingKey.expiresAt) {
    throw new Error("Signing key has been rotated out");
  }

  const publicKey = await importJWK(signingKey.publicJwk as any, "ES256");

  try {
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as JwtPayload;
  } catch (err) {
    if (err instanceof errors.JWTExpired && options?.allowExpired) {
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(
        Buffer.from(payloadB64, "base64url").toString("utf-8")
      );

      if (payload.iss !== JWT_ISSUER) {
        throw new Error("Invalid token issuer");
      }
      if (payload.aud !== JWT_AUDIENCE) {
        throw new Error("Invalid token audience");
      }

      return payload as JwtPayload;
    }
    throw err;
  }
}
