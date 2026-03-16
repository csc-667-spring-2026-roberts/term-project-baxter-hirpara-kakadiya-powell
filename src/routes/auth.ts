import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import db from "../db/connection.js";

const router = Router();

/* LOGIN */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await db.oneOrNone("SELECT * FROM users WHERE email=$1", [email]);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  req.session.userId = user.id;

  res.json({ message: "Login successful" });
});

/* LOGOUT */
router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

export default router;
