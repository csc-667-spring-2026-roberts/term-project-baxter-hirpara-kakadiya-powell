/**
 * @file types.ts
 * @authors Tyler Baxter
 * @date 2026-16-03
 *
 * TS types.
 */

declare module "express-session" {
  interface SessionData {
    userId: string;
    returnTo?: string;
  }
}

export type GameParams = {
  id: string;
};

export type UserParams = {
  id: string;
};
