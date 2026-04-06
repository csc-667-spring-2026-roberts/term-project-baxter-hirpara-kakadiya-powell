/**
 * @file models/types.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * Model and repository types.
 */

// NOTE: frontend also uses these models for their data consumption - DO NOT put
// server dependencies in the model types
import { CardLocation } from "../shared/env.js";

/**
 * Generic repository contract for base CRUD operations.
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T | null>;
  update(id: string, data: Partial<T>): Promise<boolean>;
  delete(id: string): Promise<boolean>;
}

/**
 * User model.
 */
export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  balance: number;
  created_at: Date;
}

/**
 * Game model.
 */
export interface Game {
  id: string;
  status: number;
  created_at: Date;
  ended_at: Date | null;
  updated_at: Date;
  pot_amount: number;
  turn_deadline_at: Date | null;
  current_player_id: string | null;
  max_seats: number;
  small_blind: number;
  big_blind: number;
  last_raise_amount: number;
  deck_position: number;
  // xxx new addition - should we track this?
  player_count: number;
}

/**
 * GameUser model.
 */
export interface GameUser {
  game_id: string;
  user_id: string;
  // not in db, but always join with user table to look this up, since the
  // user_id's username should be metadata for a GameUser.
  username: string;
  seat_no: number;
  balance: number;
  status: number;
  is_dealer: boolean;
  joined_at: Date | null;
}

/**
 * GameCard model.
 */
export interface GameCard {
  game_id: string;
  position: number;
  card: number;
  location: CardLocation;
  user_id: string | null;
}

/**
 * GameAction model.
 */
export interface GameAction {
  id: number;
  game_id: string;
  user_id: string | null;
  action: number;
  amount: number | null;
  deck_position: number;
  created_at: Date;
}

/**
 * Message model.
 * CHECK: exactly one of game_id or recipient_id must be set.
 */
export interface Message {
  id: number;
  user_from: string;
  // not in db, but always join with user table to look this up, since the
  // user_from's username should be metadata for a Message.
  username: string;
  game_id: string | null;
  user_to: string | null;
  body: string;
  created_at: Date;
}
