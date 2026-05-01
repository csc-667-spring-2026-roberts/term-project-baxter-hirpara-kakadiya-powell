/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @file models/hand.ts
 * @author Tyler Baxter
 * @date 2026-04-27
 *
 * Texas Hold'em hand evaluator. Pure module.
 *
 * HANDS lists categories worst -> best. eval7 iterates in reverse (best
 * first) and returns the first match as [categoryIndex, ...kickers], where
 * categoryIndex is the category's position in HANDS. Higher value wins;
 * equal arrays tie.
 */

import { Card, Maybe } from "../shared/types.js";
import { RANKS, Suit } from "../shared/env.js";

const HAND_SIZE = 5;
const HOLDEM_CARDS = 7; // 2 hole + 5 community
const ACE_HIGH = RANKS.length + 1; // 14
const STRAIGHT_GAP = HAND_SIZE - 1; // 4
const WHEEL = [ACE_HIGH, 2, 3, 4, 5];

const r = (c: Card): number => {
  const i = RANKS.indexOf(c.rank);
  if (i < 0) {
    throw new Error(`invalid Card.rank: ${c.rank}`);
  }
  return i === 0 ? ACE_HIGH : i + 1;
};

const counts = (cards: Card[]): [number, number][] => {
  const m = new Map<number, number>();
  for (const c of cards) {
    m.set(r(c), (m.get(r(c)) ?? 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
};

const flushSuit = (cards: Card[]): Maybe<Suit> => {
  const m = new Map<Suit, number>();
  for (const c of cards) {
    m.set(c.suit, (m.get(c.suit) ?? 0) + 1);
  }
  for (const [s, n] of m) {
    if (n >= HAND_SIZE) {
      return s;
    }
  }
  return null;
};

const straightTop = (rs: number[]): number => {
  const u = [...new Set(rs)].sort((a, b) => b - a);
  for (let i = 0; i + STRAIGHT_GAP < u.length; i++) {
    if (u[i]! - u[i + STRAIGHT_GAP]! === STRAIGHT_GAP) {
      return u[i]!;
    }
  }
  if (WHEEL.every((x) => u.includes(x))) {
    return WHEEL[WHEEL.length - 1]!; // 5
  }
  return 0;
};

// Worst -> best. Iterate in reverse so higher-category matches claim a hand
// before lower ones (e.g. [3,2] hits fullHouse, not threeKind).
const HANDS = {
  highCard: (cards: Card[]): number[] => {
    return cards
      .map(r)
      .sort((a, b) => b - a)
      .slice(0, HAND_SIZE);
  },
  onePair: (cards: Card[]): Maybe<number[]> => {
    const c = counts(cards);
    if (c[0]![1] !== 2) {
      return null;
    }
    return [c[0]![0], c[1]![0], c[2]![0], c[3]![0]];
  },
  twoPair: (cards: Card[]): Maybe<number[]> => {
    const c = counts(cards);
    if (c[0]![1] !== 2 || c[1]![1] !== 2) {
      return null;
    }
    return [c[0]![0], c[1]![0], c[2]![0]];
  },
  threeKind: (cards: Card[]): Maybe<number[]> => {
    const c = counts(cards);
    if (c[0]![1] !== 3) {
      return null;
    }
    return [c[0]![0], c[1]![0], c[2]![0]];
  },
  straight: (cards: Card[]): Maybe<number[]> => {
    const t = straightTop(cards.map(r));
    if (!t) {
      return null;
    }
    return [t];
  },
  flush: (cards: Card[]): Maybe<number[]> => {
    const s = flushSuit(cards);
    if (!s) {
      return null;
    }
    const rs = cards
      .filter((c) => c.suit === s)
      .map(r)
      .sort((a, b) => b - a);
    return rs.slice(0, HAND_SIZE);
  },
  fullHouse: (cards: Card[]): Maybe<number[]> => {
    const c = counts(cards);
    if (c[0]![1] !== 3 || c[1]![1] < 2) {
      return null;
    }
    return [c[0]![0], c[1]![0]];
  },
  fourKind: (cards: Card[]): Maybe<number[]> => {
    const c = counts(cards);
    if (c[0]![1] !== 4) {
      return null;
    }
    return [c[0]![0], c[1]![0]];
  },
  straightFlush: (cards: Card[]): Maybe<number[]> => {
    const s = flushSuit(cards);
    if (!s) {
      return null;
    }
    const t = straightTop(cards.filter((c) => c.suit === s).map(r));
    if (!t) {
      return null;
    }
    return [t];
  },
};

const HAND_KEYS = Object.keys(HANDS) as (keyof typeof HANDS)[];

export function eval7(cards: Card[]): number[] {
  if (cards.length !== HOLDEM_CARDS) {
    throw new Error(
      `eval7 requires exactly ${String(HOLDEM_CARDS)} cards, got ${String(cards.length)}`,
    );
  }
  for (let i = HAND_KEYS.length - 1; i >= 0; i--) {
    const fn = HANDS[HAND_KEYS[i]!];
    const hit = fn(cards);
    if (hit) {
      return [i, ...hit];
    }
  }
  throw new Error("unreachable");
}

export function evalPlayers(
  players: { userId: string; hole: [Card, Card] }[],
  community: Card[],
): { userId: string; tiebreakers: number[] }[] {
  if (players.length === 0) {
    throw new Error("evalPlayers needs at least one player");
  }
  const ranked = players.map((p) => ({
    userId: p.userId,
    tiebreakers: eval7([...p.hole, ...community]),
  }));
  ranked.sort((a, b) => {
    const len = Math.max(a.tiebreakers.length, b.tiebreakers.length);
    for (let i = 0; i < len; i++) {
      if (a.tiebreakers[i] !== b.tiebreakers[i]) {
        return (b.tiebreakers[i] ?? 0) - (a.tiebreakers[i] ?? 0);
      }
    }
    return 0;
  });
  return ranked.filter((p) => {
    return p.tiebreakers.every((v, i) => v === ranked[0]!.tiebreakers[i]);
  });
}
