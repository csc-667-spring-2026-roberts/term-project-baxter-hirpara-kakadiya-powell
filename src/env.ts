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
export const DECK_SIZE: number = 52;

export const MIN_SEATS = 2;
export const MAX_SEATS = 10;

/** game status */
export enum GameStatus {
  WAITING = 0,
  PLAYING = 1,
  PAUSED = 2,
  ENDED = 3,
}

/** user status within a game */
export enum UserStatus {
  ACTIVE = 0,
  INACTIVE = 1,
  PAUSED = 2,
}

/** card location on the board */
export enum CardLocation {
  DECK = 0,
  COMMUNITY = 1,
  HAND = 2,
}

/** game action types */
export enum Action {
  DEAL_COMMUNITY = 0,
  DEAL_HAND = 1,
  BET = 2,
  CALL = 3,
  RAISE = 4,
  CHECK = 5,
  FOLD = 6,
  ALL_IN = 7,
  SHOWDOWN = 8,
  PAYOUT = 9,
}
