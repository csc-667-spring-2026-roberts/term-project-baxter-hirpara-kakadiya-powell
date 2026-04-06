/**
 * @file shared/types.ts
 * @authors Tyler Baxter
 * @date 2026-16-03
 *
 * Shared TS backend/frontend types.
 */

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
