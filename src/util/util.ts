/**
 * @file util/util.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * General utility.
 */

import { DECK_SIZE } from "../env.js";
import crypto from "crypto";

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
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}
