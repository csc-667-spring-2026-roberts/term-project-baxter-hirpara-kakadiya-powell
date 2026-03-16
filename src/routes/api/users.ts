import { Router, Request, Response } from "express";
import db from "../../db/connection.js";
import { User } from "../../models/user.js";

const router = Router();

/**
 * Retrieve user information by username.
 *
 * @param  username  username of the user you want to query
 */
router.get("/:username", async (req: Request, res: Response): Promise<void> => {
  const user: User | null = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [
    req.params.username,
  ]);

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
// xxx add back async
router.post("/", (req: Request, res: Response): void => {
  const { username } = req.body as { username?: string };

  if (!username) {
    res.status(400).json({ error: "username is required" });
    return;
  }

  // xxx update to user model
  const user = null;
  //const user = await db.one("INSERT INTO users (username) VALUES ($1) RETURNING *", [username]);
  res.status(201).json(user);
});

export default router;
