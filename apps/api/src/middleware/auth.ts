import { Request, Response, NextFunction } from "express";
import { jwtVerify, importJWK } from "jose";
import { getSigningKeyByKid } from "../services/jwks";

const JWT_ISSUER = process.env.JWT_ISSUER || "https://api.tributary.so";
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || "tributary-checkout";

export interface JwtPayload {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  subscriptions?: any[];
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

export async function verifyToken(token: string): Promise<JwtPayload> {
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

  const { payload } = await jwtVerify(token, publicKey, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  return payload as JwtPayload;
}
