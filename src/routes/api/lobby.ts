/**
 * @file routes/api/lobby.ts
 * @author Tyler Baxter
 * @date 2026-04-09
 *
 * Lobby API routes. SSE stream for lobby-wide events (game list updates).
 */

import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware.js";
import { addClient } from "../../sse.js";

const router = Router();

/**
 * SSE stream for lobby events. Clients subscribe here to receive
 * GamesEventEnum.GAMES_UPDATED pushes when the game list changes.
 */
router.get("/lobby/sse", requireAuth, (req: Request, res: Response) => {
  // add client to lobby sse clients list
  addClient(res, req.session.userId as string);
});

export default router;
