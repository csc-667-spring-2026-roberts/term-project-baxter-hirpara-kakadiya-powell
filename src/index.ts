import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// Use environment variable or fallback to string
const PORT = process.env.PORT ?? "3000";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files
app.use(express.static(path.join(__dirname, "..", "public")));

// Home route
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(Number(PORT), () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
