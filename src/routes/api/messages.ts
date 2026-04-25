/**
 * @file routes/api/messages.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * Message API routes.
 */

import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware.js";
import MessageRepository from "../../models/message.js";
import { GameParams } from "../../types.js";
import logger from "../../util/logger.js";
import { RequestError } from "../../util/error.ts";

const router = Router();

/**
 * Get game chat messages.
 */
router.get(
  "/games/:id/messages",
  requireAuth,
  async (req: Request<GameParams>, res: Response, next: NextFunction) => {
    const id = req.params.id;

    try {
      const msgs = await MessageRepository.getGame(id);
      res.json(msgs);
    } catch (err) {
      logger.error(String(err));
      next(err);
    }
  },
);

/**
 * Send a game chat message.
 */
router.post(
  "/games/:id/messages",
  requireAuth,
  async (
    req: Request<GameParams, unknown, { body: string }>,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userFrom = req.session.userId;
      if (!userFrom) {
        throw new RequestError("Unable to complete request: missing user_from", 400);
      }

      const msgBody = req.body.body;
      if (!msgBody) {
        throw new RequestError("Unable to complete request: missing body", 400);
      }

      const gameId = req.params.id;
      if (!gameId) {
        throw new RequestError("Unable to complete request: missing game_id", 400);
      }

      const msg = await MessageRepository.create({
        user_from: userFrom,
        body: msgBody,
        game_id: gameId,
      });

      res.json(msg);
    } catch (err) {
      logger.error(String(err));
      next(err);
    }
  },
);

/**
 * Get DM inbox.
 * xxx STRETCH
 */
router.get("/messages", requireAuth, (_req: Request, res: Response) => {
  res.json(null);
});

/**
 * Get chat with a user.
 * xxx STRETCH
 */
router.get("/messages/:userId", requireAuth, (_req: Request, res: Response) => {
  res.json(null);
});

/**
 * Send a DM to a recipient user.
 * xxx STRETCH
 */
router.post("/messages/:userId", requireAuth, (_req: Request, res: Response) => {
  res.redirect("back");
});

export default router;
