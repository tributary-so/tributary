import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware";
import { getJwks } from "../services/jwks";

const router: Router = Router();

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const jwks = await getJwks();
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.json(jwks);
  })
);

export default router;
