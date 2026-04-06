/**
 * @file routes/auth.ts
 * @author Tyler Baxter, Kat Powell, Devarsh Hirpara
 * @date 2026-03-16
 *
 * Authentication routes.
 */

import { Router, Request, Response, NextFunction } from "express";
import logger from "../util/logger.js";
import UserRepository from "../models/user.js";
import { TITLE } from "../shared/env.js";

const router = Router();

/* LOGIN */
// GET route for login page
router.get("/login", (_req: Request, res: Response) => {
  res.render("login", {
    title: `${TITLE} - Login`,
    styles: ["login"],
    layout: "layouts/main",
  });
});

// POST route for logging in
router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  // extract login and password from request
  const { login, password } = req.body as { login?: string; password?: string };

  if (!login || !password) {
    req.flash("error", "Email and password are required");
    res.redirect("/login");
    return;
  }

  try {
    const user = await UserRepository.verifyPassword(login, password);
    if (!user) {
      req.flash("error", "Invalid email or password");
      res.redirect("/login");
      return;
    }
    req.session.userId = user.id;

    // restore previous page if available, else redirect to home
    const returnTo = req.session.returnTo || "/";
    delete req.session.returnTo;

    res.redirect(returnTo);
  } catch (err) {
    // xxx fix this so we don't have this type check here
    next(err instanceof Error ? err : new Error(String(err)));
  }
});

/* CREATE ACCOUNT */
// GET route for create account page
router.get("/create-account", (_req: Request, res: Response) => {
  res.render("create-account", {
    title: `${TITLE} - Create Account`,
    styles: ["login"],
    layout: "layouts/main",
  });
});

// POST route for creating a new account
router.post("/create-account", async (req: Request, res: Response, _next: NextFunction) => {
  // extract email and password from request
  const { username, email, password } = req.body as {
    username?: string;
    email?: string;
    password?: string;
  };

  // error check correct state for create-account POST
  if (!username || !email || !password) {
    req.flash("error", "Username, email, and password are required");
    res.redirect("/create-account");
    return;
  }

  try {
    const user = await UserRepository.create({ username, email, password });
    if (!user) {
      req.flash("error", "Username or email already exists");
      res.redirect("/login");
      return;
    }
    req.session.userId = user.id;
    res.redirect("/");
  } catch (err) {
    logger.error(`Account creation error: ${String(err)}`);
    req.flash("error", "Error creating account. Please try again.");
    res.redirect("/create-account");
    return;
  }
});

/* LOGOUT */
// POST route for logout
router.post("/logout", (req: Request, res: Response, next: NextFunction) => {
  req.session.destroy((err) => {
    if (err) {
      next(err);
      return;
    }
    res.redirect("/");
  });
});

export default router;
