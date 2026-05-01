/**
 * @file shared/types.ts
 * @authors Tyler Baxter
 * @date 2026-16-03
 *
 * Shared TS backend/frontend types.
 */

import { Suit, Rank } from "./env.js";

/**
 * GameConfig parameters.
 */
export type GameConfig = {
  smallBlind: number;
  bigBlind: number;
  maxSeats: number;
};

export interface ActiveGame {
  id: string;
}

export type Maybe<T> = T | null | undefined;

/**
 * Card type with Rank and Suit string types.
 */
export interface Card {
  rank: Rank;
  suit: Suit;
}

/**
 * Index of Card as it's stored in database's Cards array.
 */
export type CardIndex = number;

/**
 * Bit-packed card for hand evaluator
 */
export type PackedCard = number;
