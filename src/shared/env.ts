/**
 * @file env.ts
 * @authors Tyler Baxter
 * @date 2026-16-03
 *
 * Global constants and other TS environment variables.
 */

import { Action } from "@excalidraw/excalidraw/components/OverwriteConfirm/OverwriteConfirmActions";
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
export const ActionEnum = {
  GAME_STARTED: 0,
  DEAL_COMMUNITY: 1,
  DEAL_HAND: 2,
  BET: 3,
  CALL: 4,
  RAISE: 5,
  CHECK: 6,
  FOLD: 7,
  ALL_IN: 8,
  SHOWDOWN: 9,
  PAYOUT: 10,
  GAME_ENDED: 11,
  PLAYER_JOINED: 12,
  PLAYER_LEFT: 13,
} as const satisfies Record<string, number>;
export type Action = (typeof ActionEnum)[keyof typeof ActionEnum];

/*
 * STATES OF POKER:
 *  0 (tertiary). GameStatus.WAITING
 *  1 (tertiary). GameStatus.PLAYING (game started)
 *  2. community cards are dealt
*   3. hands are dealt
*   4. for each player...
*     a. call, raise, check, fold, all_in
*   5. community cards are dealt
*   6. showdown, no-showdown (other player folded)
*   7. payout (can occur after showdown or after no-showdown)
*   8 (tertiary). GameStatus.ENDED (game ended)
*   9 (tertiary). player_joined, player_left, player_paused
*     * can't play until next turn
*/
export const ACTION_MAP: Record<Action, string> = {
  [ActionEnum.GAME_STARTED]: "game_started",
  [ActionEnum.DEAL_COMMUNITY]: "deal_community",
  [ActionEnum.DEAL_HAND]: "deal_hand",
  [ActionEnum.BET]: "bet",
  [ActionEnum.CALL]: "call",
  [ActionEnum.RAISE]: "raise",
  [ActionEnum.CHECK]: "check",
  [ActionEnum.FOLD]: "fold",
  [ActionEnum.ALL_IN]: "all_in",
  [ActionEnum.SHOWDOWN]: "showdown",
  [ActionEnum.PAYOUT]: "payout",
  [ActionEnum.GAME_ENDED]: "game_ended",
  [ActionEnum.PLAYER_JOINED]: "player_joined",
  [ActionEnum.PLAYER_LEFT]: "player_left",
};

export const GamesEventEnum = {
  GAMES_UPDATED: "games_updated",
} as const satisfies Record<string, string>;
export type GamesEvent = (typeof GamesEventEnum)[keyof typeof GamesEventEnum];

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
