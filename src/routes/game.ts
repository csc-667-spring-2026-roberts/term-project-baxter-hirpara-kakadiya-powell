/* eslint-disable @typescript-eslint/no-unnecessary-condition */
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
import GameRepository from "../models/game.js";
import UserRepository from "../models/user.js";
//import { shuffleDeck } from "../util/util.js";
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
      next(new HttpError(404, "Game not found"));
      return;
    }

    const players = await GameRepository.getUsers(id);
    if (!players) {
      next(new HttpError(404, "No players in game"));
      return;
    }

    const communityCards = await GameRepository.getCommunityCards(id);
    if (!communityCards) {
      next(new HttpError(404, "Failed to retrieve community cards"));
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
          next(new HttpError(404, "Failed to retrieve player userdata"));
          return;
        }

        hand = await GameRepository.getHand(id, userId);
        if (!hand) {
          next(new HttpError(404, "Failed to retrieve player hand"));
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
