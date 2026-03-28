/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
// stub file, disable linting
/**
 * @file models/game.ts
 * @author Tyler Baxter
 * @date 2026-03-16
 *
 * Game model and repository.
 */

import db, { pgp } from "../db/connection.js";
import logger from "../util/logger.js";
import { validatePosition } from "../util/util.js";
import { RollbackError } from "../util/error.js";
import { DECK_SIZE, GameStatus, UserStatus, Action, CardLocation } from "../env.js";
import {
  MOCK_USER,
  MOCK_GAME,
  MOCK_GAMES,
  MOCK_GAME_USERS,
  MOCK_GAME_ACTIONS,
  MOCK_GAME_CARDS,
} from "../mock.js";
import { Game, GameUser, GameCard, GameAction, IRepository } from "./types.js";

/**
 * Game repository.
 */
class GameRepository implements IRepository<Game> {
  /** find a game by ID */
  async findById(id: string): Promise<Game | null> {
    try {
      const game = await db.oneOrNone(
        "SELECT * FROM games WHERE id = $1",
        [id]
      );
      return game;
    } catch (err) {
      logger.error("findById error:", err);
      return null;
    }
  }

  /** create a new game */
  async create(data: Partial<Game>): Promise<Game | null> {
    try {
      const game = await db.one(
        `INSERT INTO games (status, small_blind, big_blind)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.status, data.small_blind, data.big_blind]
      );
      return game;
    } catch (err) {
      logger.error("create error:", err);
      return null;
    }
  }

  /** update a game by ID */
  async update(id: string, data: Partial<Game>): Promise<boolean> {
    try {
      const res = await db.result(
        "UPDATE games SET status = $1 WHERE id = $2",
        [data.status, id]
      );
      return res.rowCount > 0;
    } catch (err) {
      logger.error("update error:", err);
      return false;
    }
  }

  /** delete a game by ID */
  async delete(id: string): Promise<boolean> {
    try {
      const res = await db.result(
        "DELETE FROM games WHERE id = $1",
        [id]
      );
      return res.rowCount > 0;
    } catch (err) {
      logger.error("delete error:", err);
      return false;
    }
  }

  async findByUserId(userId: string): Promise<Game[] | null> {
    try {
      const games = await db.any(
        `SELECT *
         FROM games
         WHERE id IN (
           SELECT game_id FROM game_users WHERE user_id = $1
         )`,
        [userId]
      );
      return games.length ? games : null;
    } catch (err) {
      logger.error("findByUserId error:", err);
      return null;
    }
  }

  /**
   * Find available games matching blind levels, sorted on index
   * IDX_games_status_created_at.
   */
  async findAvailableBlind(smallBlind: number, bigBlind: number): Promise<Game[] | null> {
    try {
      const games = await db.any(
        `SELECT *
         FROM games
         WHERE status = 'waiting'
           AND small_blind = $1
           AND big_blind = $2
         ORDER BY created_at ASC`,
        [smallBlind, bigBlind]
      );
      return games.length ? games : null;
    } catch (err) {
      logger.error("findAvailableBlind error:", err);
      return null;
    }
  }

  /**
   * Find all available games, sorted on index IDX_games_status_created_at.
   */
  async findAvailableAll(): Promise<Game[] | null> {
    try {
      const games = await db.any(
        `SELECT *
         FROM games
         WHERE status = 'waiting'
         ORDER BY created_at ASC`
      );
      return games.length ? games : null;
    } catch (err) {
      logger.error("findAvailableAll error:", err);
      return null;
    }
  }

  /** add a player to a game, deduct buy-in from user balance */
  async addUser(
    _gameId: string,
    _userId: string,
    _seatNo: number,
    _buyIn: number,
  ): Promise<boolean> {
    return false;
  }

  async removeUser(_gameId: string, _userId: string): Promise<boolean> {
    return false;
  }

  /** get all players in a game */
  async getUsers(_gameId: string): Promise<GameUser[] | null> {
    return MOCK_GAME_USERS;
  }

  /** get a specific player in a game */
  async getUser(_gameId: string, _userId: string): Promise<GameUser | null> {
    return MOCK_GAME_USERS[0] ?? null;
  }

  /** update a User's balance (after bet/payout) */
  async updateUserBalance(_gameId: string, _userId: string, _amount: number): Promise<boolean> {
    return false;
  }

  /** update a user's status */
  async updateUserStatus(_gameId: string, _userId: string, _status: UserStatus): Promise<boolean> {
    return false;
  }

  /** update the dealer for a game */
  async updateDealer(_gameId: string, _userId: string): Promise<boolean> {
    return false;
  }

  /**
   * Upsert a card deck for a game (52 rows).
   * @pre Controller shuffles deck.
   * @param gameId - The game's ID
   * @param cards - Cards array of DECK_SIZE to upsert
   * @returns TRUE for SUCCESS, FALSE for FAILURE
   */
  async upsertCards(gameId: string, cards: number[]): Promise<boolean> {
    if (cards.length !== DECK_SIZE) {
      logger.warn("invalid cards");
      return false;
    }

    try {
      const vals = cards.map((card, position) => ({
        game_id: gameId,
        position,
        card,
        location: CardLocation.DECK,
        user_id: null,
      }));

      const cs = new pgp.helpers.ColumnSet(["game_id", "position", "card", "location", "user_id"], {
        table: "game_cards",
      });

      const q =
        pgp.helpers.insert(vals, cs) +
        " " +
        "ON CONFLICT (game_id, position) DO UPDATE SET " +
        "card = EXCLUDED.card, location = EXCLUDED.location, user_id = EXCLUDED.user_id";

      const res = await db.result(q);

      if (res.rowCount !== cards.length) {
        logger.warn(`update cards for game_id (${gameId}) failed`);
        return false;
      }

      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Draw the next card from the deck, returns card number. DB rollback on
   * operation failure.
   *
   * @param gameId - The game's ID
   * @param location - Location for the card to be drawn to
   * @returns The card number, or null if operation failed
   */
  async drawCard(gameId: string, location: CardLocation): Promise<number | null> {
    if (!gameId) {
      logger.warn(`invalid game_id: ${gameId}`);
      return null;
    }

    try {
      return await db.tx(async (t) => {
        const pos = await t.oneOrNone<{ deck_position: number }>(
          "UPDATE games SET deck_position = deck_position + 1 WHERE id = $1 RETURNING deck_position - 1 AS deck_position",
          [gameId],
        );

        if (!pos) {
          logger.warn(`query for deck_position in game_id (${gameId}) failed`);
          throw new RollbackError();
        }

        const card = await t.oneOrNone<{ card: number }>(
          "SELECT card FROM game_cards WHERE game_id = $1 AND position = $2",
          [gameId, pos.deck_position],
        );

        if (!card) {
          logger.warn(
            `query for card at position (${String(pos.deck_position)}) in game_id (${gameId}) failed`,
          );
          throw new RollbackError();
        }

        const res = await t.result(
          "UPDATE game_cards SET location = $1 WHERE game_id = $2 AND position = $3",
          [location, gameId, pos.deck_position],
        );

        if (res.rowCount <= 0) {
          logger.warn(
            `update location (${String(location)}) of card (${String(card.card)} in game_id (${gameId}) failed`,
          );
          throw new RollbackError();
        }

        return card.card;
      });
    } catch (err) {
      if (err instanceof RollbackError) {
        logger.warn(`DB rollback for game_id: ${gameId}`);
        return null;
      }
      logger.error(String(err));
      throw err;
    }
  }

  /** get a user's hand */
  async getHand(_gameId: string, _userId: string): Promise<GameCard[]> {
    return MOCK_GAME_CARDS.filter((c: GameCard) => c.location === CardLocation.HAND);
  }

  /** get community cards (flop, turn, river) */
  async getCommunityCards(_gameId: string): Promise<GameCard[]> {
    return MOCK_GAME_CARDS.filter((c: GameCard) => c.location === CardLocation.COMMUNITY);
  }

  /** get all cards for a game */
  async getAllCards(_gameId: string): Promise<GameCard[]> {
    return [];
  }

  /**
   * Record a game action
   *
   * @param gameId - The game's ID
   * @param userId - The user's ID, or null if no user
   * @param action - The Action
   * @param deckPosition - The deck position of the Action
   * @param amount - Amount delta, if present
   * @returns TRUE for SUCCESS, FALSE for FAILURE
   */
  private async recordAction(
    gameId: string,
    userId: string | null,
    action: Action,
    deckPosition: number,
    amount?: number,
  ): Promise<boolean> {
    if (!gameId || !action || !validatePosition(deckPosition)) {
      logger.warn("invalid parameters");
      return false;
    }

    try {
      const res = await db.result(
        "INSERT INTO game_actions (game_id, user_id, action, amount, deck_position) VALUES ($1, $2, $3, $4, $5)",
        [gameId, userId, action, amount ?? null, deckPosition],
      );

      return res.rowCount > 0;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /** get all actions for a game (play-by-play) */
  async getActions(_gameId: string): Promise<GameAction[] | null> {
    return MOCK_GAME_ACTIONS;
  }

  /** get all actions by a user (balance history) */
  async getUserActions(_userId: string): Promise<GameAction[] | null> {
    return MOCK_GAME_ACTIONS;
  }

  /** get actions by a user in a specific game */
  async getUserGameActions(_gameId: string, _userId: string): Promise<GameAction[] | null> {
    return null;
  }
}

export default new GameRepository();

// vim: set ts=2 sw=2 sts=2 noet filetype=typescript:
