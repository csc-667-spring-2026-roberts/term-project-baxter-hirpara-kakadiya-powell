import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import usersRouter from "./routes/users.js";
import authRouter from "./routes/auth.js";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const app = express();

// Use environment variable or fallback to string
const PORT = process.env.PORT ?? "3000";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, "..", "public")));

// Parse incoming json payloads
app.use(express.json());

// Home route
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

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

app.use("/users", usersRouter);

// add auth routes
app.use("/auth", authRouter);

app.listen(Number(PORT), () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
