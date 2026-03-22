 
/**
 * @file mock.ts
 * @author Tyler Baxter, generated with Claude Opus 4.6 by Anthropic
 * @data 2026-03-21
 *
 */

import { Game, GameUser, GameCard, GameAction, User, Message } from "./models/types.js";
import { GameStatus, UserStatus, CardLocation, Action } from "./env.js";

// users
export const MOCK_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  username: "testuser",
  email: "test@sfsu.edu",
  password: "hashed",
  balance: 1000,
  created_at: new Date(),
};

export const MOCK_USER2: User = {
  id: "00000000-0000-0000-0000-000000000002",
  username: "alice",
  email: "alice@sfsu.edu",
  password: "hashed",
  balance: 500,
  created_at: new Date(),
};

export const MOCK_USER3: User = {
  id: "00000000-0000-0000-0000-000000000003",
  username: "bob",
  email: "bob@sfsu.edu",
  password: "hashed",
  balance: 750,
  created_at: new Date(),
};

export const MOCK_USERS: User[] = [MOCK_USER, MOCK_USER2, MOCK_USER3];

// games
export const MOCK_GAME: Game = {
  id: "00000000-0000-0000-0000-000000000010",
  status: GameStatus.PLAYING,
  created_at: new Date(),
  ended_at: null,
  updated_at: new Date(),
  pot_amount: 150,
  turn_deadline_at: null,
  current_player_id: MOCK_USER.id,
  max_seats: 6,
  small_blind: 1,
  big_blind: 2,
  last_raise_amount: 0,
  deck_position: 9,
};

export const MOCK_GAME2: Game = {
  id: "00000000-0000-0000-0000-000000000001",
  status: GameStatus.PLAYING,
  created_at: new Date(),
  ended_at: null,
  updated_at: new Date(),
  pot_amount: 150,
  turn_deadline_at: null,
  current_player_id: MOCK_USER.id,
  max_seats: 6,
  small_blind: 1,
  big_blind: 2,
  last_raise_amount: 0,
  deck_position: 9,
};

export const MOCK_LOBBY_GAME: Game = {
  id: "00000000-0000-0000-0000-000000000020",
  status: GameStatus.WAITING,
  created_at: new Date(),
  ended_at: null,
  updated_at: new Date(),
  pot_amount: 0,
  turn_deadline_at: null,
  current_player_id: null,
  max_seats: 6,
  small_blind: 1,
  big_blind: 2,
  last_raise_amount: 0,
  deck_position: 0,
};

export const MOCK_GAMES: Game[] = [MOCK_GAME, MOCK_GAME2];
export const MOCK_LOBBY: Game[] = [MOCK_LOBBY_GAME];

// game users
export const MOCK_GAME_USERS: GameUser[] = [
  {
    game_id: MOCK_GAME.id,
    user_id: MOCK_USER.id,
    seat_no: 1,
    balance: 88,
    status: UserStatus.ACTIVE,
    is_dealer: true,
    joined_at: new Date(),
  },
  {
    game_id: MOCK_GAME.id,
    user_id: MOCK_USER2.id,
    seat_no: 2,
    balance: 95,
    status: UserStatus.ACTIVE,
    is_dealer: false,
    joined_at: new Date(),
  },
  {
    game_id: MOCK_GAME.id,
    user_id: MOCK_USER3.id,
    seat_no: 3,
    balance: 100,
    status: UserStatus.ACTIVE,
    is_dealer: false,
    joined_at: new Date(),
  },
];

// game cards
export const MOCK_GAME_CARDS: GameCard[] = [
  { game_id: MOCK_GAME.id, position: 6, card: 12, location: CardLocation.COMMUNITY, user_id: null },
  { game_id: MOCK_GAME.id, position: 7, card: 37, location: CardLocation.COMMUNITY, user_id: null },
  { game_id: MOCK_GAME.id, position: 8, card: 4, location: CardLocation.COMMUNITY, user_id: null },
];

// game actions
export const MOCK_GAME_ACTIONS: GameAction[] = [
  {
    id: 1,
    game_id: MOCK_GAME.id,
    user_id: MOCK_USER.id,
    action: Action.DEAL_HAND,
    amount: null,
    deck_position: 2,
    created_at: new Date(),
  },
  {
    id: 2,
    game_id: MOCK_GAME.id,
    user_id: MOCK_USER.id,
    action: Action.BET,
    amount: 10,
    deck_position: 6,
    created_at: new Date(),
  },
  {
    id: 3,
    game_id: MOCK_GAME.id,
    user_id: null,
    action: Action.DEAL_COMMUNITY,
    amount: null,
    deck_position: 9,
    created_at: new Date(),
  },
];

// messages
export const MOCK_GAME_MESSAGES: Message[] = [
  {
    id: 1,
    user_from: MOCK_USER.id,
    game_id: MOCK_GAME.id,
    user_to: null,
    body: "gl everyone",
    created_at: new Date(),
  },
  {
    id: 2,
    user_from: MOCK_USER2.id,
    game_id: MOCK_GAME.id,
    user_to: null,
    body: "ty u2",
    created_at: new Date(),
  },
  {
    id: 3,
    user_from: MOCK_USER3.id,
    game_id: MOCK_GAME.id,
    user_to: null,
    body: "lets go",
    created_at: new Date(),
  },
];

export const MOCK_DMS: Message[] = [
  {
    id: 10,
    user_from: MOCK_USER.id,
    game_id: null,
    user_to: MOCK_USER2.id,
    body: "gg last game",
    created_at: new Date(),
  },
  {
    id: 11,
    user_from: MOCK_USER2.id,
    game_id: null,
    user_to: MOCK_USER.id,
    body: "yeah wp",
    created_at: new Date(),
  },
];

// vim: set ts=2 sw=2 sts=2 noet filetype=typescript:
