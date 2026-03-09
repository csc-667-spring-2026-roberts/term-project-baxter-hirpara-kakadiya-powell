import { Router, Request, Response } from "express";
import db from "../db/connection.js";

const router = Router();

/**
 * Retrieve user information by username.
 *
 * @param  username  username of the user you want to query
 */
router.get("/:username", async (req: Request, res: Response): Promise<void> => {
  const user = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [req.params.username]);

  if (!user) {
    res.status(404).json({ error: "user not found" });
    return;
  }

  res.json(user);
});

/**
 * Update a user's username.
 *
 * @param  username  user's requested username
 */
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { username } = req.body as { username?: string };

  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  const user = await db.one("INSERT INTO users (username) VALUES ($1) RETURNING *", [username]);
  res.status(201).json(user);
});

export default router;
