/**
 * @file routes/api/games.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * Game API routes.
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware.js";
// import GameRepository from "../../models/game.js";
// import { shuffleDeck } from "../../util/util.js";
import { GameParams } from "../../types.js";

const router = Router();

/**
 * Create a new game.
 */
router.post("/games", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * Join a game.
 * xxx
 */
router.post("/games/:id/join", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * Exit a game.
 * xxx
 */
router.post("/games/:id/exit", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * User actions (bet, call, raise, check, fold, all-in).
 */
router.post("/games/:id/action", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * Deal hands to all players (start of hand).
 */
router.post("/games/:id/deal", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * SSE endpoint for live game state.
 */
router.get("/games/:id/events", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.status(200);
});

/**
 * Get play-by-play for a game.
 * xxx STRETCH
 */
router.get("/games/:id/history", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.render("/");
});

export default router;
