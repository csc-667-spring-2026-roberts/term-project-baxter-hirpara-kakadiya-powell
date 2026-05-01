/**
 * @file sse.ts
 * @author Tyler Baxter
 * @date 2026-04-09
 *
 * Server-Sent Events: unidirectional server -> client push.
 * Clients are scoped optionally by gameId for per-room broadcasts.
 */

import { Response } from "express";
import logger from "./util/logger.js";

interface Client {
  response: Response;
  userId: string;
  gameId?: string;
}

const clients = new Map<number, Client>();
// integer rollover 64-bit is unfeasible
let nextClientId = 0;

export function addClient(response: Response, userId: string, gameId?: string): number {
  const id = nextClientId++;

  response.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // kick the stream so the client's onopen fires immediately
  response.write("\n\n");

  clients.set(id, { response, userId, gameId });
  logger.info(`sse: client ${String(id)} connected (user=${userId}, game=${gameId ?? "lobby"})`);

  response.on("close", () => {
    removeClient(id);
  });

  return id;
}

export function removeClient(id: number): void {
  // xxx should we do more here?
  if (clients.delete(id)) {
    logger.info(`sse: client ${String(id)} disconnected`);
  }
}

export function broadcast(data: object, pred?: (client: Client) => boolean): void {
  if (!pred) {
    pred = (): boolean => true;
  }

  const msg = `data: ${JSON.stringify(data)}\n\n`;

  for (const [, client] of clients) {
    if (pred(client)) {
      client.response.write(msg);
    }
  }
}
