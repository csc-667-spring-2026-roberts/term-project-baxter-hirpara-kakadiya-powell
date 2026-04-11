/**
 * @file env.ts
 * @authors Tyler Baxter
 * @date 2026-16-03
 *
 * Global constants and other TS environment variables.
 */

import type { GameConfig } from "./types.js";

// allowed query parameter commands, so users can't pass arbitrary commands
export const CMDS: Record<string, string> = {
  expire: "Your session has expired, please log in again",
};

export const TITLE: string = "Texas Hold'em Poker II";
export const DECK_SIZE: number = 52;

export const MIN_SEATS: number = 6;
export const MAX_SEATS: number = 9;
export const MAX_MONEY: number = 1000.0;

/** game status */
export enum GameStatus {
  WAITING = 0,
  PLAYING = 1,
  PAUSED = 2,
  ENDED = 3,
}

/**
 * get GameStatus as a string.
 */
export function gameStatus(status: GameStatus): string {
  switch (status) {
    case GameStatus.WAITING:
      return "Waiting";
    case GameStatus.PLAYING:
      return "Active";
    case GameStatus.PAUSED:
      return "Paused";
    case GameStatus.ENDED:
      return "Ended";
    default:
      return "Undefined";
  }
}

/** user status within a game */
export enum UserStatus {
  ACTIVE = 0,
  INACTIVE = 1,
  PAUSED = 2,
}

/**
 * get UserStatus as a string.
 */
export function userStatus(status: UserStatus): string {
  switch (status) {
    case UserStatus.ACTIVE:
      return "Active";
    case UserStatus.INACTIVE:
      return "Inactive";
    case UserStatus.PAUSED:
      return "Paused";
    default:
      return "Undefined";
  }
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

/**
 * Valid blind configs for each GameConfig.
 */
const blindConfigs = {
  low: { smallBlind: 1, bigBlind: 2 },
  mid: { smallBlind: 5, bigBlind: 10 },
  high: { smallBlind: 10, bigBlind: 20 },
} satisfies Record<string, { smallBlind: number; bigBlind: number }>;

/**
 * Valid GameConfigs, for templating/validating against.
 */
export const GAME_CONFIGS: Record<string, GameConfig> = {
  low6: { ...blindConfigs.low, maxSeats: 6 },
  low9: { ...blindConfigs.low, maxSeats: 9 },
  mid6: { ...blindConfigs.mid, maxSeats: 6 },
  mid9: { ...blindConfigs.mid, maxSeats: 9 },
  high6: { ...blindConfigs.high, maxSeats: 6 },
  high9: { ...blindConfigs.high, maxSeats: 9 },
};
