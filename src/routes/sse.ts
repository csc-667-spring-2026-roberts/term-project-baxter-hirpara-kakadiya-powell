import { Router } from "express";
import { reqyureAuth } from "./middleware.js";
import SSE from "../sse.js';

const router = Router();

router.get("/", async (_req: Request, resp: Response) => {
  const games = await GameRepository.getAvailableAll();
  resp.json({games});
});

router.post("/", async (_req: Request, resp: Responnse) => {
  const userId = request.session.userId!;

  const game = await GameRepository.create(userId);
  const games = await GameRepository.getAvailableAll();
  SSE.broadcast({ type: "games_updated", games });

  resp.status(201).send();

export default router;
