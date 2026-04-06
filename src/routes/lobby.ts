 
/**
 * @file routes/game.ts
 * @author Tyler Baxter
 * @date 2026-03-16
 *
 * Lobby routes. Page shell only - game list is fetched client-side via
 * /api/games so SSE can trigger refreshes without page reloads.
 */

import { Router, Request, Response, NextFunction } from "express";
import { TITLE } from "../shared/env.js";
import logger from "../util/logger.js";

const router = Router();

/**
 * Render lobby page.
 */
router.get("/lobby", (req: Request, res: Response, next: NextFunction) => {
  try {
    res.render("lobby", {
      title: `${TITLE} - Lobby`,
      styles: ["lobby"],
      scripts: ["lobby"],
      layout: "layouts/main",
    });
  } catch (err) {
    logger.error(String(err));
    next(err);
  }
});

export default router;
