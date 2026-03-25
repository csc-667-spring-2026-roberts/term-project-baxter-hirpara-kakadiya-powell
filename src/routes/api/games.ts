/**
 * @file routes/api/games.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * Game API routes.
 */

import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware.js";
import GameRepository from "../../models/game.js";
// import { shuffleDeck } from "../../util/util.js";
import { GameParams } from "../../types.js";

const router = Router();

/**
 * Get a game by ID. (findById)
 */
router.get("/games/:id", requireAuth, async (req: Request<GameParams>, res: Response, next: NextFunction) => {
  const { id } = req.params;
 
  try {
    const game = await GameRepository.findById(id);
    if (!game) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json(game);
  } catch (err) {
    next(err);
  }
});

/**
 * Create a new game.
 */
router.post("/games", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  const { max_seats, small_blind, big_blind } = req.body as {
    max_seats?: number;
    small_blind?: number;
    big_blind?: number;
  };
 
  try {
    const game = await GameRepository.create({ max_seats, small_blind, big_blind });
    if (!game) {
      res.status(400).json({ error: "Failed to create game" });
      return;
    }
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

/**
 * Update a game by ID. (update)
 */
router.patch("/games/:id", requireAuth, async (req: Request<GameParams>, res: Response, next: NextFunction) => {
  const { id } = req.params;
 
  try {
    const success = await GameRepository.update(id, req.body);
    if (!success) {
      res.status(400).json({ error: "Failed to update game" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete a game by ID. (delete)
 */
router.delete("/games/:id", requireAuth, async (req: Request<GameParams>, res: Response, next: NextFunction) => {
  const { id } = req.params;
 
  try {
    const success = await GameRepository.delete(id);
    if (!success) {
      res.status(404).json({ error: "Game not found or already deleted" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
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
