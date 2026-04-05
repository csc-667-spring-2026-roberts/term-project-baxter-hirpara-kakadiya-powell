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
router.post("/users/:id/username", requireAuth, (_req: Request, res: Response) => {
  res.redirect("back");
});

/**
 * Update user email.
 * xxx
 */
router.post("/users/:id/email", requireAuth, (_req: Request, res: Response) => {
  res.redirect("back");
});

/**
 * Update user password.
 * xxx
 */
router.post("/users/:id/password", requireAuth, (_req: Request, res: Response) => {
  res.redirect("back");
});

/**
 * User's game history.
 * xxx STRETCH
 */
router.get("/users/:id/games", (_req: Request, res: Response) => {
  res.render("/");
});

/**
 * User's balance history.
 * xxx STRETCH
 */
router.get("/users/:id/balance", (_req: Request, res: Response) => {
  res.render("/");
});

export default router;
