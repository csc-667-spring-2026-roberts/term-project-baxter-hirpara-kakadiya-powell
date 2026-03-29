/**
 * @file mock.ts
 * @author Tyler Baxter, Harry Kakadiya
 * @modified 2026-03-29
 * @date 2026-03-21
 *
 */

import { Game, GameUser, GameCard, GameAction, User, Message } from "./models/types.js";
import { GameStatus, CardLocation, Action } from "./env.js";
import seedData from "../database/seed.json" assert { type: "json" };

// Users

function requireUser(index: number): User {
  const u = seedData.users[index];
  if (!u) throw new Error("seed.json missing user at index " + String(index));
  return { ...u, created_at: new Date(u.created_at) };
}

function requireGame(index: number): Game {
  const g = seedData.games[index];
  if (!g) throw new Error("seed.json missing game at index " + String(index));
  return {
    ...g,
    created_at: new Date(g.created_at),
    updated_at: new Date(g.updated_at),
    ended_at: null,
    turn_deadline_at: null,
  };
}

export const MOCK_USER: User = requireUser(0);
export const MOCK_USER2: User = requireUser(1);
export const MOCK_USER3: User = requireUser(2);
export const MOCK_USERS: User[] = [MOCK_USER, MOCK_USER2, MOCK_USER3];

// Games

export const MOCK_GAME: Game = { ...requireGame(0), status: GameStatus.PLAYING };
export const MOCK_GAME2: Game = { ...requireGame(1), status: GameStatus.PLAYING };
export const MOCK_LOBBY_GAME: Game = { ...requireGame(2), status: GameStatus.WAITING };

export const MOCK_GAMES: Game[] = [MOCK_GAME, MOCK_GAME2];
export const MOCK_LOBBY: Game[] = [MOCK_LOBBY_GAME];

// game_users
// username is a join field not in DB -- added here for mock use only

export const MOCK_GAME_USERS: GameUser[] = seedData.game_users.map((gu) => ({
  ...gu,
  username: MOCK_USERS.find((u) => u.id === gu.user_id)?.username ?? "",
  joined_at: gu.joined_at ? new Date(gu.joined_at) : null,
}));

// game_cards

export const MOCK_GAME_CARDS: GameCard[] = seedData.game_cards.map((gc) => ({
  ...gc,
  location: gc.location as CardLocation,
}));

// game_actions

export const MOCK_GAME_ACTIONS: GameAction[] = seedData.game_actions.map((ga, i) => ({
  id: i + 1,
  ...ga,
  action: ga.action as Action,
  created_at: new Date(ga.created_at),
}));

// messages
// username is a join field not in DB -- added here for mock use only

export const MOCK_GAME_MESSAGES: Message[] = seedData.game_messages.map((m, i) => ({
  id: i + 1,
  ...m,
  username: MOCK_USERS.find((u) => u.id === m.user_from)?.username ?? "",
  created_at: new Date(m.created_at),
}));

export const MOCK_DMS: Message[] = seedData.dms.map((m, i) => ({
  id: 10 + i,
  ...m,
  username: MOCK_USERS.find((u) => u.id === m.user_from)?.username ?? "",
  created_at: new Date(m.created_at),
}));

// vim: set ts=2 sw=2 sts=2 noet filetype=typescript:
