/**
 * @file env.ts
 * @authors Tyler Baxter
 * @date 2026-16-03
 *
 * Global constants and other TS environment variables.
 */

// allowed query parameter commands, so users can't pass arbitrary commands
export const CMDS: Record<string, string> = {
  expire: "Your session has expired, please log in again",
};

// Use environment variable or fallback to string
export const PORT: string = process.env.PORT ?? "3000";
export const TITLE: string = "Texas Hold'em Poker II";
