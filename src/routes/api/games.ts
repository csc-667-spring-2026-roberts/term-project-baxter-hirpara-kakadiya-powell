/**
 * @file routes/api/games.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * Game API routes.
 */
import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware.js";
import { GameParams } from "../../types.js";

const router = Router();

// SSE client registry: gameId -> list of response objects
const sseClients: Map<string, Response[]> = new Map();

function broadcast(gameId: string, event: string, data: object): void {
  const clients = sseClients.get(gameId) ?? [];
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach((client) => client.write(payload));
}

/**
 * Create a new game.
 */
router.post("/games", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * Join a game.
 */
router.post("/games/:id/join", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * Exit a game.
 */
router.post("/games/:id/exit", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.redirect("/");
});

/**
 * User actions (bet, call, raise, check, fold, all-in).
 */
router.post("/games/:id/action", requireAuth, (req: Request<GameParams>, res: Response) => {
  const gameId = req.params.id;
  const userId = req.session.userId;
  const { action, amount } = req.body as { action: number; amount?: number };

  // TODO: validate action, persist via GameRepository, update game state
  // For now: broadcast the action to all SSE clients in this game
  broadcast(gameId, "action", {
    userId,
    action,
    amount: amount ?? null,
  });

  res.status(200).json({ ok: true });
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
router.get("/games/:id/events", requireAuth, (req: Request<GameParams>, res: Response) => {
  const gameId = req.params.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Register client
  if (!sseClients.has(gameId)) sseClients.set(gameId, []);
  const clients = sseClients.get(gameId) ?? [];
  clients.push(res);
  sseClients.set(gameId, clients);

  // Send a heartbeat every 30s to keep connection alive
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 30000);

  // Clean up on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    const clients = sseClients.get(gameId) ?? [];
    sseClients.set(gameId, clients.filter((c) => c !== res));
  });
});

/**
 * Get play-by-play for a game.
 * STRETCH
 */
router.get("/games/:id/history", requireAuth, (_req: Request<GameParams>, res: Response) => {
  res.render("/");
});

export default router;