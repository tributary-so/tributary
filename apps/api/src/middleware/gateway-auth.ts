import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";

/**
 * requireGatewayAuth — validates the JWT (same JWKS path as `requireAuth`)
 * AND enforces that the token's `gateway` claim matches the route's
 * `:gateway` param. This is what scopes every merchant route to "this
 * gateway only, signed by its authority."
 */
export async function requireGatewayAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing Authorization header" });
      return;
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);

    const claimGateway = (payload as { gateway?: string }).gateway;
    const routeGateway = req.params.gateway;

    if (!claimGateway || !routeGateway || claimGateway !== routeGateway) {
      res.status(403).json({ error: "Token not valid for this gateway" });
      return;
    }

    (req as any).gatewayAuth = {
      gateway: claimGateway,
      signer: payload.sub,
    };
    next();
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Invalid token" });
  }
}
