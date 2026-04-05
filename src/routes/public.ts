/**
 * @file routes/public.ts
 * @author Tyler Baxter
 * @date 2026-03-16
 *
 * General public routes that don't require authentication.
 */

import { TITLE } from "../env.js";
import { Router, Request, Response } from "express";

const router = Router();

// root/home page
router.get("/", (_req: Request, res: Response) => {
  res.render("home", {
    title: `${TITLE} - Home`,
    styles: [],
    layout: "layouts/main",
  });
});

export default router;
