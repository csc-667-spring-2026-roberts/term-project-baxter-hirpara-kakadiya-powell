/**
 * @file util/util.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * General utility.
 */

import { DECK_SIZE, MIN_SEATS, MAX_SEATS, GAME_CONFIGS, MAX_MONEY } from "../shared/env.js";
import crypto from "crypto";
import { GameConfig, Maybe, Card, CardIndex, PackedCard } from "./types.js";
import { GameStatus, SUITS, RANKS, Suit, Rank } from "./env.js";

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

export function indexToCard(idx: CardIndex): Card {
  if (!validatePosition(idx)) {
    throw new Error(`invalid CardIndex: ${String(idx)}`);
  }
  return {
    suit: <Suit>SUITS[Math.floor(idx / 13)],
    rank: <Rank>RANKS[idx % 13],
  };
}

export function indexFromCard(card: Card): CardIndex {
  const idx = SUITS.indexOf(card.suit) * 13 + RANKS.indexOf(card.rank);
  if (!validatePosition(idx)) {
    throw new Error(`invalid Card: ${JSON.stringify(card)}`);
  }
  return idx;
}

export function unpackCard(card: PackedCard): Card {
  const rankInt = (card >> 8) & 0xf; // 2..14
  if (rankInt < 2 || rankInt > 14) {
    throw new Error(`invalid PackedCard rank: ${String(rankInt)}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const rankStr = rankInt === 14 ? RANKS[0] : RANKS[rankInt - 1]!;

  const suitBit = card & 0xf000;
  const SUIT_FROM_BIT: Record<number, Suit> = {
    0x2000: "heart",
    0x4000: "diamond",
    0x8000: "club",
    0x1000: "spade",
  };
  const suitStr = SUIT_FROM_BIT[suitBit];
  if (suitStr === undefined) {
    throw new Error(`invalid PackedCard suit bits: 0x${suitBit.toString(16)}`);
  }

  return { rank: rankStr, suit: suitStr };
}

export function packCard(card: Card): PackedCard {
  // Cactus Kev 32-bit layout (matches pokerlib/poker.h):
  //   bits 16-28: rank-bit, one bit set at position (rankInt - 2)
  //   bits 12-15: suit  (CLUB=0x8000, DIAMOND=0x4000, HEART=0x2000, SPADE=0x1000)
  //   bits 8-11:  rank int 2..14 (Ace=14)
  //   bits 0-7:   prime for the rank
  const i = RANKS.indexOf(card.rank);
  if (i < 0) {
    throw new Error(`invalid Card.rank: ${card.rank}`);
  }
  const rankInt = i === 0 ? 14 : i + 1; // RANKS[0]='1' is Ace -> 14
  const rankIdx = rankInt - 2; // 0..12

  const SUIT_BITS: Record<Suit, number> = {
    heart: 0x2000,
    diamond: 0x4000,
    club: 0x8000,
    spade: 0x1000,
  };
  const suitBit = SUIT_BITS[card.suit];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (suitBit == null) {
    throw new Error(`invalid Card.suit: ${card.suit}`);
  }

  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41];
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const prime = PRIMES[rankIdx]!;

  return (1 << (16 + rankIdx)) | suitBit | (rankInt << 8) | prime;
}
