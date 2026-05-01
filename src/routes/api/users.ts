/**
 * @file routes/api/user.ts
 * @author Kat Powell, Tyler Baxter
 * @date 2026-03-08
 * @modified 2026-03-21
 *
 * User API routes.
 */

import { Router, Request, Response } from "express";
//import { User } from "../models/user.js";
//import UserRepository from "../models/user.js";
import { requireAuth } from "../middleware.js";
import bcrypt from "bcrypt";
import db from "../../db/connection.js"; // database connection

const router = Router();

/**
 * Retrieve user information by username.
 * xxx
 *
 * @param  username  username of the user you want to query
 */
router.get("/users/:username", (_req: Request, res: Response) => {
  // xxx respond as json so we can do popup to show user
  res.json(null);
});

/**
 * Retrieve user information by id.
 * xxx
 *
 * @param id id of the user you want to query
 */
router.get("/users/:id", (_req: Request, res: Response) => {
  res.json(null);
});

/**
 * Update a user's username.
 * xxx
 *
 * @param  username  user's requested username
 */
router.post("/users/:id/username", requireAuth, async (req: Request, res: Response) => {
  // get user id from URL
  const userId = req.params.id;

  const sessionUser = req.session as unknown as { user?: { id: string | number } };

  // allow only the logged-in user to update their own account
  if (!sessionUser.user || String(sessionUser.user.id) !== String(userId)) {
    return res.status(403).send("Unauthorized");
  }

  // get new username from form
  const { username } = req.body;

  // if no username provided, do nothing
  if (!username) { res.redirect("back"); return; }

  try {
    // update username in database
    await db.none("UPDATE users SET username = $1 WHERE id = $2", [username, userId]);
  } catch (err) {
    console.error("Error updating username:", err);
  }

  // go back to previous page
  res.redirect("back");
});

/**
 * Update user email.
 * xxx
 */
router.post("/users/:id/email", requireAuth, async (req: Request, res: Response) => {
  // get user id from URL
  const userId = req.params.id;

  const sessionUser = req.session as unknown as { user?: { id: string | number } };

  // allow only the logged-in user to update their own account
  if (!sessionUser.user || String(sessionUser.user.id) !== String(userId)) {
    return res.status(403).send("Unauthorized");
  }

  // get new email from form
  const { email } = req.body;

  // if no email provided, do nothing
  if (!email) { res.redirect("back"); return; }

  try {
    // update email in database
    await db.none("UPDATE users SET email = $1 WHERE id = $2", [email, userId]);
  } catch (err) {
    console.error("Error updating email:", err);
  }

  // go back to previous page
  res.redirect("back");
});

/**
 * Update user password.
 * xxx
 */
router.post("/users/:id/password", requireAuth, async (req: Request, res: Response) => {
  // get user id from URL
  const userId = req.params.id;

  const sessionUser = req.session as unknown as { user?: { id: string | number } };

  // allow only the logged-in user to update their own account
  if (!sessionUser.user || String(sessionUser.user.id) !== String(userId)) {
    return res.status(403).send("Unauthorized");
  }

  // get new password from form
  const { password } = req.body;

  // if no password provided, do nothing
  if (!password) { res.redirect("back"); return; }

  try {
    // hash password before saving (security)
    const hashedPassword = await bcrypt.hash(password, 10);

    // update password in database
    await db.none("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId]);
  } catch (err) {
    console.error("Error updating password:", err);
  }

  // go back to previous page
  res.redirect("back");
});

/**
 * User's game history.
 * xxx STRETCH
 */
router.get("/users/:id/games", (_req: Request, res: Response) => {
  res.json(null);
});

/**
 * User's balance history.
 * xxx STRETCH
 */
router.get("/users/:id/balance", (_req: Request, res: Response) => {
  res.json(null);
});

export default router;
