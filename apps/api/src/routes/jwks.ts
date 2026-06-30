import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { getJwks } from "../services/jwks";

const router: Router = Router();

/**
 * @openapi
 * /v1/jwks:
 *   get:
 *     summary: JWKS (mounted under /.well-known too)
 *     description: >
 *       Returns the JSON Web Key Set used to verify JWTs issued by
 *       `/v1/tokens/issue`. Cached publicly for 1 hour. Also served at
 *       `/.well-known/jwks.json` for OIDC-style discovery.
 *     tags: [JWKS]
 *     operationId: getJwks
 *     responses:
 *       200:
 *         description: JWKS document.
 *         headers:
 *           Cache-Control:
 *             schema: { type: string, example: "public, max-age=3600" }
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [keys]
 *               properties:
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: JWK (RFC 7517) — kid, kty, alg, use, crv, x, y.
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const jwks = await getJwks();
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json(jwks);
  })
);

export default router;
