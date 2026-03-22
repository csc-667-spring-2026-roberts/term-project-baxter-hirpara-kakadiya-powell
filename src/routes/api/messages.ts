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
 * Send game chat message.
 * xxx
 */
router.post("/games/:id/messages", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.json(null);
});

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
