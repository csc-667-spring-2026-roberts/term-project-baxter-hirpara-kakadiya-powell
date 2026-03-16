import winston from "winston";
import path from "path";
import fs from "fs";

const LOG_DIR = process.env.LOG_DIR || "secrets/logs";
fs.mkdirSync(LOG_DIR, { recursive: true }); // nop if already exists

const today = new Date().toISOString().split("T")[0] ?? "";

const fmt = winston.format.printf((info) => {
  const level = info.level;
  const message = String(info.message);
  const timestamp = info.timestamp as string | undefined;
  const stack = info.stack as string | undefined;
  const base = `${timestamp ?? ""} | ${level.toUpperCase()} | ${message}`;
  return stack ? `${base}\n${stack}` : base;
});

function createLogger(name: string = "app"): winston.Logger {
  return winston.createLogger({
    level: "debug",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      fmt,
    ),
    transports: [
      new winston.transports.Console({
        stderrLevels: ["error", "warn"],
      }),
      new winston.transports.File({
        filename: path.join(LOG_DIR, `${name}-${today}.log`),
      }),
    ],
  });
}

// global logger
const logger = createLogger();
export default logger;
