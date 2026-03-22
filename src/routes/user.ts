/**
 * @file routes/game.ts
 * @author Tyler Baxter
 * @date 2026-03-16
 *
 * User routes.
 */

//eslint-disable @typescript-eslint/require-await */

import { Router, Request, Response } from "express";
import { requireAuth } from "./middleware.js";

const router = Router();

/**
 * Render authenticated user's profile page.
 */
router.get("profile", requireAuth, (_req: Request, res: Response) => {
  res.render("/profile");
});

export default router;
