import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import flash from "connect-flash";
import morgan from "morgan";
import expressLayouts from "express-ejs-layouts";
import livereload from "livereload";
import connectLiveReload from "connect-livereload";

import usersRouter from "./routes/api/users.js";
import authRouter from "./routes/auth.js";
import logger from "./util/logger.js";
import UserRepository from "./models/user.js";
import GameRepository from "./models/game.js";
import { CMDS, GAME_CONFIGS } from "./shared/env.js";
import { errorHandler } from "./routes/middleware.js";
import publicRouter from "./routes/public.js";
import gameRouter from "./routes/game.js";
import gamesRouter from "./routes/api/games.js";
import messagesRouter from "./routes/api/messages.js";
import userRouter from "./routes/user.js";
import lobbyRouter from "./routes/lobby.js";
import lobbyApiRouter from "./routes/api/lobby.js";

// Use environment variable or fallback to string
export const PORT: string = process.env.PORT ?? "3000";

const app = express();

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_DIR = path.join(__dirname, "..", "public");
const VIEWS_DIR = path.join(__dirname, "..", "views");

// don't use livereload in prod
if (process.env.NODE_ENV !== "production") {
  const liveReloadServer = livereload.createServer({
    // all frontend files, pages reload on change
    exts: ["ejs", "css", "js", "ts"],
  });

  // watch frontend dirs
  liveReloadServer.watch([STATIC_DIR, VIEWS_DIR]);

  app.use(connectLiveReload());
}

// ejs setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "..", "views"));
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Serve static files
app.use(express.static(STATIC_DIR));

// Parse incoming json payloads
app.use(express.json());

// querystring for flat key-value pairs
app.use(express.urlencoded({ extended: false }));

// query parameter commands
app.use((req, res, next) => {
  const cmd = req.query.cmd as string;
  res.locals.cmd = null;
  if (cmd) {
    // xxx do we want to do more if it's an invalid command? that's a security
    // risk
    res.locals.cmd = CMDS[cmd] ?? null;
  }
  next();
});

// globals on every response
app.use((_req, res, next) => {
  res.locals.gameConfigs = GAME_CONFIGS;
  next();
});

// request logging
app.use(
  morgan("combined", {
    // pipe through logger
    stream: { write: (msg: string) => logger.info(msg.trimEnd()) },
  }),
);

// Create PostgreSQL session store
// This allows session data to be stored in PostgreSQL instead of memory
const PgSession = connectPgSimple(session);

// Configure session middleware
app.use(
  session({
    // Store sessions in PostgreSQL
    store: new PgSession({
      conString: process.env.DATABASE_URL, // connection string from .env
    }),

    // Secret used to sign session cookies
    secret: process.env.SESSION_SECRET || "secret",

    // Prevent session from being saved if nothing changed
    resave: false,

    // Do not create session until something is stored
    saveUninitialized: false,

    // Cookie configuration for security
    cookie: {
      httpOnly: true, // prevents JavaScript from accessing cookies
      sameSite: "lax", // helps prevent CSRF attacks
    },
  }),
);

// flash (must have session)
app.use(flash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

// refresh data from db middleware
app.use(async (req, res, next) => {
  res.locals.user = null;
  res.locals.games = null;
  const id = req.session.userId;

  if (!id) {
    next();
    return;
  }

  // fatal auth errors:
  try {
    const user = await UserRepository.findById(id);
    if (!user) {
      req.session.destroy(() => {
        res.redirect("/login?cmd=expire");
      });
      return;
    }
    res.locals.user = user;
  } catch (err) {
    logger.error(String(err));
    req.session.destroy(() => {
      res.redirect("/login?cmd=expire");
    });
    return;
  }

  // non-fatal db lookup errors:
  try {
    res.locals.games = await GameRepository.findByUserId(id);
  } catch (err) {
    logger.error(String(err));
  }

  next();
});

// public routes:
app.use("/", publicRouter);
app.use("/", authRouter);
app.use("/", gameRouter);
app.use("/", userRouter);
app.use("/", lobbyRouter);

// api routes:
app.use("/api", usersRouter);
app.use("/api", gamesRouter);
app.use("/api", messagesRouter);
app.use("/api", lobbyApiRouter);

app.use(errorHandler);

app.listen(Number(PORT), () => {
  logger.info(`Server running at http://localhost:${PORT}`);
});
