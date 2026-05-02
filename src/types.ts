/**
 * @file types.ts
 * @authors Tyler Baxter
 * @date 2026-16-03
 *
 * TS types.
 */

import { Request } from "express";
import { Action } from "./shared/env.js";
import { Maybe } from "./shared/types.js";

declare module "express-session" {
  interface SessionData {
    userId: string;
    returnTo?: string;
  }
}

export interface TypedRequest<T> extends Request {
  body: T;
}

export interface GameRequest<T> extends Request {
  params: { id: string };
  body: T;
}

export type GameParams = {
  id: string;
  config: string;
};

export type UserParams = {
  id: string;
};

export type GameEventBody = {
	userId: string;
  action: Action;
  // value of action (if action has value)
  value: Maybe<number>;
};
