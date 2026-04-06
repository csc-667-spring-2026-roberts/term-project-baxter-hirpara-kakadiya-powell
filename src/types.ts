/**
 * @file types.ts
 * @authors Tyler Baxter
 * @date 2026-16-03
 *
 * TS types.
 */

import { Request } from "express";

declare module "express-session" {
  interface SessionData {
    userId: string;
    returnTo?: string;
  }
}

export interface TypedRequest<T> extends Request {
  body: T;
}

export interface LoginRequest extends Request {
  email: string;
  password: string;
}

export type GameParams = {
  id: string;
  config: string;
};

export type UserParams = {
  id: string;
};
