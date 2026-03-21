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
import { TITLE } from "../env.js";
import logger from "../util/logger.js";
//import GameRepository from "../models/game.js";
import crypto from "crypto";

const router = Router();

type GameParams = {
  id: string;
};

function shuffleDeck(): number[] {
  const DECK_SIZE = 52;
  const deck: number[] = new Array(DECK_SIZE);

  // initialize deck
  for (let i = 0; i < DECK_SIZE; i++) {
    deck[i] = i;
  }

  // fisher-yates shuffle
  // SOURCE: https://en.wikipedia.org/wiki/Fisher-Yates_shuffle
  for (let i = deck.length - 1; i >= 1; i--) {
    // CSPRNG
    const j = crypto.randomInt(0, i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

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
