/**
 * @file routes/game.ts
 * @author Tyler Baxter
 * @date 2026-03-16
 *
 * Game routes.
 */

import { Router, Request, Response, NextFunction } from "express";
import { HttpError } from "../util/error.js";
import { TITLE } from "../shared/env.js";
import logger from "../util/logger.js";
import GameRepository from "../models/game.js";
import UserRepository from "../models/user.js";
//import { shuffleDeck } from "../shared/util.js";
import { GameParams } from "../types.js";
import { GameCard, User } from "../models/types.js";

const router = Router();

/**
 * Render game page.
 */
router.get("/game/:id", async (req: Request<GameParams>, res: Response, next: NextFunction) => {
  const id = req.params.id;
  const userId = req.session.userId;
  try {
    // game data:
    const game = await GameRepository.findById(id);
    if (!game) {
      next(new HttpError("Game not found", 404));
      return;
    }

    const players = await GameRepository.getUsers(id);
    if (!players) {
      next(new HttpError("No players in game", 404));
      return;
    }

    const communityCards = await GameRepository.getCommunityCards(id);
    if (!communityCards) {
      next(new HttpError("Failed to retrieve community cards", 404));
      return;
    }

    // user data:
    /** @note if player is TRUE, then hand will always be non-null */

    // NULL if this user is a player in this game, non-NULL they're a spectator
    let player: User | null = null;

    // NULL if this user is a player in this game, non-NULL (at least empty
    // array) they're a spectator
    let hand: GameCard[] | null = null;

    if (userId) {
      const isPlayer = players.some((gu) => gu.user_id === userId);

      if (isPlayer) {
        player = await UserRepository.findById(userId);
        if (!player) {
          next(new HttpError("Failed to retrieve player userdata", 404));
          return;
        }

        hand = await GameRepository.getHand(id, userId);
        if (!hand) {
          next(new HttpError("Failed to retrieve player hand", 404));
          return;
        }
      }
    }

    res.render("game", {
      title: `${TITLE} - Game ${id}`,
      styles: ["game"],
      layout: "layouts/game",
      game,
      players,
      communityCards,
      player,
      hand,
    });
  } catch (err) {
    logger.error(String(err));
    next(err);
  }
});

export default router;
