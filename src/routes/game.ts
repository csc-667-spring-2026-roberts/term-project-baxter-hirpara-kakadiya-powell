/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unused-vars */
/**
 * @file routes/game.ts
 * @author Tyler Baxter
 * @date 2026-03-16
 *
 * Game routes.
 */

import { Router, Request, Response, NextFunction } from "express";
import { HttpError } from "../util/error.js";
import { TITLE, DECK_SIZE } from "../env.js";
import logger from "../util/logger.js";
//import GameRepository from "../models/game.js";
import { shuffleDeck } from "../util/util.js";
import { GameParams } from "../types.js";

const router = Router();

/**
 * Render game page.
 */
router.get("/game/:id", async (req: Request<GameParams>, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    // tmp mockup until game model is complete
    //const game = await GameRepository.findById(id);
    const game = { id };

    if (!game) {
      next(new HttpError(404, "Game not found"));
      return;
    }

    const player = Boolean(req.session.userId);

    res.render("game", {
      title: `${TITLE} - Game ${id}`,
      styles: ["game"],
      layout: "layouts/main",
      game,
      player,
    });
  } catch (err) {
    logger.error(String(err));
    next(err);
  }
});

export default router;
