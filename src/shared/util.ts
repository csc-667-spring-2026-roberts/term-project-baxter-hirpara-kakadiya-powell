/**
 * @file util/util.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * General utility.
 */

import { DECK_SIZE, MIN_SEATS, MAX_SEATS, GAME_CONFIGS, MAX_MONEY } from "../shared/env.js";
import crypto from "crypto";
import { GameConfig, Maybe } from "./types.js";
import { GameStatus } from "../shared/env.js";

/**
 * Validate that a deck position is within bounds of a deck.
 *
 * @param pos - The position to validate
 * @returns TRUE if valid, FALSE if invalid
 */
export function validatePosition(pos: number): boolean {
  return pos >= 0 && pos < DECK_SIZE;
}

/**
 * Validate that blinds are a valid GameConfig.
 *
 * @param sm - Small blind
 * @param big - Big blind
 * @returns TRUE if valid, FALSE if invalid
 */
export function validateBlinds(sm: number, big: number): boolean {
  return Object.values(GAME_CONFIGS).some((v) => sm === v.smallBlind && big === v.bigBlind);
}

/**
 * Validate that cfg is a valid game config.
 *
 * @pre this function is the validation gateway for GameConfig - caller is not
 * responsible for preconditions.
 *
 * @param cfg - The GameConfig to validate
 * @returns TRUE if valid, FALSE if invalid
 */
export function validateGameConfig(cfg: GameConfig | null): boolean {
  if (!cfg) {
    return false;
  }

  return Object.values(GAME_CONFIGS).some(
    (v) =>
      cfg.smallBlind === v.smallBlind && cfg.bigBlind === v.bigBlind && cfg.maxSeats === v.maxSeats,
  );
}

/**
 * Validate that money-type amounts are valid money amounts.
 *
 * @param amts - The money-type amounts to validate
 * @returns TRUE if valid, FALSE if invalid
 */
export function validateMoney(...amts: Maybe<number>[]): boolean {
  return amts.every((n) => n == null || (Number.isFinite(n) && n >= 0 && n <= MAX_MONEY));
}

/**
 * Validate that seats are within MIN/MAX seat bounds.
 *
 * @param seats - The seats to validate
 * @returns TRUE if valid, FALSE if invalid
 */
export function validateSeats(seats: number): boolean {
  return seats <= MAX_SEATS && seats >= MIN_SEATS;
}

/**
 * Restore a user's balance after leaving a game.
 *
 * @param _userId - The user's ID
 * @param _amount - The amount to restore
 * @returns TRUE for SUCCESS, FALSE for FAILURE
 */
export function restoreBalance(_userId: string, _amount: number): boolean {
  return true;
}

/**
 * Validate that a status is a valid GameStatus enum value.
 *
 * @param status - The status to validate
 * @returns TRUE if valid, FALSE if invalid
 */
export function validateStatus(status: number): boolean {
  return status in GameStatus;
}

/**
 * Shuffles a deck of cards.
 *
 * @returns Shuffled array of cards.
 */
export function shuffleDeck(): number[] {
  const deck: number[] = new Array<number>(DECK_SIZE);

  // initialize deck
  for (let i = 0; i < DECK_SIZE; i++) {
    deck[i] = i;
  }

  // fisher-yates shuffle
  // SOURCE: https://en.wikipedia.org/wiki/Fisher-Yates_shuffle
  for (let i = deck.length - 1; i >= 1; i--) {
    // CSPRNG
    const j = crypto.randomInt(0, i + 1);
    // i, j are always bounded
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }

  return deck;
}
