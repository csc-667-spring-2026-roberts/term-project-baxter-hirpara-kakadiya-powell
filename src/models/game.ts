/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unused-vars */
// stub file, disable linting
/**
 * @file models/game.ts
 * @author Tyler Baxter, Kat Powell
 * @date 2026-03-16
 * @modified 2026-03-27
 *
 * Game model and repository.
 */

import db, { pgp } from "../db/connection.js";
import logger from "../util/logger.js";
import { validatePosition, restoreBalance } from "../shared/util.js";
import { RollbackError } from "../util/error.js";
import { DECK_SIZE, GameStatus, UserStatus, Action, CardLocation } from "../shared/env.js";
import {
  MOCK_USER,
  MOCK_GAME,
  MOCK_GAMES,
  MOCK_GAME_USERS,
  MOCK_GAME_ACTIONS,
  MOCK_GAME_CARDS,
} from "../mock.js";
import { Game, GameUser, GameCard, GameAction, IRepository } from "./types.js";
import { MIN_SEATS, MAX_SEATS } from "../env.js";

/**
 * Game repository.
 * @param id - The ID of the game
 * @returns The game if found, otherwise null
 */
class GameRepository implements IRepository<Game> {

  /** find a game by ID */
  async findById(id: string): Promise<Game | null> {
  try {
    const game = await db.oneOrNone(
      "SELECT * FROM games WHERE id = $1",
      [id]
    );
    return game ?? MOCK_GAME; // fallback to mock
  } catch (err) {
    logger.error("findById error:", err);
    return MOCK_GAME; // fallback to mock
  }
  }

  /**
  * create a new game
  * @param _data - Partial game data used to create the game
  * @returns A mock game object representing the created game
  */
  async create(data: Partial<Game>): Promise<Game | null> {
    try {
      const maxSeats = data.max_seats ?? 0;
      if (maxSeats < MIN_SEATS || maxSeats > MAX_SEATS) {
        logger.warn(`Invalid max_seats: ${maxSeats}. Must be between ${MIN_SEATS}-${MAX_SEATS}`);
        return null;
      }
  
      const position = data.position ?? 0;
      const potAmount = data.pot_amount ?? 0;
      if (position !== 0 || potAmount !== 0) {
        logger.warn("New game cannot have non-zero position or pot_amount");
        return null;
      }
  
      const ALLOWED_BLINDS = [
        { small: 1, big: 2 },
        { small: 5, big: 10 },
        { small: 10, big: 20 },
      ];
      const blindsValid = ALLOWED_BLINDS.some(
        (b) => b.small === data.small_blind && b.big === data.big_blind
      );
      if (!blindsValid) {
        logger.warn(`Invalid blind combination: ${data.small_blind}/${data.big_blind}`);
        return null;
      }
  
      const bothNullOrBothNotNull =
        (data.turn_deadline_at == null && data.current_player_id == null) ||
        (data.turn_deadline_at != null && data.current_player_id != null);
      if (!bothNullOrBothNotNull) {
        logger.warn("turn_deadline_at and current_player_id must be both null or both set");
        return null;
      }
  
      const game = await db.one(
        `INSERT INTO games
         (status, max_seats, small_blind, big_blind, position, pot_amount, turn_deadline_at, current_player_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.status ?? GameStatus.WAITING,
          maxSeats,
          data.small_blind,
          data.big_blind,
          position,
          potAmount,
          data.turn_deadline_at ?? null,
          data.current_player_id ?? null,
        ]
      );
  
      return game;
    } catch (err) {
      logger.error("create error:", err);
      return null;
    }
  }

  /**
  * update a game by ID
  * @param _id - The ID of the game to update
  * @param _data - Partial game data containing fields to update
  * @returns True if update was successful, otherwise false
  */
  async update(id: string, data: Partial<Game>): Promise<boolean> {
    try {
      // ----- Optional: only validate fields that are provided -----
      if (data.max_seats && (data.max_seats < MIN_SEATS || data.max_seats > MAX_SEATS)) {
        logger.warn(`Invalid max_seats: ${data.max_seats}`);
        return false;
      }

      if (data.position != null && !validatePosition(data.position)) {
        logger.warn(`Invalid position: ${data.position}`);
        return false;
      }

      // Conditional fields check
      if (
        (data.turn_deadline_at != null && data.current_player_id == null) ||
        (data.turn_deadline_at == null && data.current_player_id != null)
      ) {
        logger.warn("turn_deadline_at and current_player_id must be both null or both set");
        return false;
      }

      const res = await db.result(
        `UPDATE games SET
        status = COALESCE($1, status),
        max_seats = COALESCE($2, max_seats),
        small_blind = COALESCE($3, small_blind),
        big_blind = COALESCE($4, big_blind),
        position = COALESCE($5, position),
        pot_amount = COALESCE($6, pot_amount),
        turn_deadline_at = COALESCE($7, turn_deadline_at),
        current_player_id = COALESCE($8, current_player_id)
        WHERE id = $9`,
        [
          data.status,
          data.max_seats,
          data.small_blind,
          data.big_blind,
          data.position,
          data.pot_amount,
          data.turn_deadline_at,
          data.current_player_id,
          id,
        ]
      );

      return res.rowCount > 0;
    } catch (err) {
      logger.error("update error:", err);
      return false;
    }
  }

  /**
   * Delete a game and all related data (users, cards, actions) by game ID.
   * This operation is atomic: if any part fails, all changes are rolled back.
   *
   * @param gameId - The ID of the game to delete
   * @returns True if the deletion (including all related data) was successful, otherwise false
   */
  async delete(gameId: string): Promise<boolean> {
    try {
      return await db.tx(async (t) => {
        // delete game_actions
        await t.none("DELETE FROM game_actions WHERE game_id = $1", [gameId]);

        // delete game_cards
        await t.none("DELETE FROM game_cards WHERE game_id = $1", [gameId]);

        // delete game_users
        await t.none("DELETE FROM game_users WHERE game_id = $1", [gameId]);

        // delete the game itself
        const res = await t.result("DELETE FROM games WHERE id = $1", [gameId]);
        if (res.rowCount === 0) {
          throw new Error(`Game with id ${gameId} not found`);
        }

        // if all succeeds, transaction commits automatically
        return true;
      });
    } catch (err) {
      logger.error("delete error:", err);
      return false; // rollback happens automatically on error
    }
  }

  /**
   * Retrieves all games associated with a specific user.
   *
   * @param _userId - The ID of the user
   * @returns A list of mock games, or null if none found
   */
  async findByUserId(userId: string): Promise<Game[] | null> {
    try {
      const games = await db.any(
        `SELECT * FROM games
         WHERE id IN (SELECT game_id FROM game_users WHERE user_id = $1)`,
        [userId]
      );
      return games.length ? games : MOCK_GAMES; // fallback
    } catch {
      return MOCK_GAMES; // fallback
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
        `SELECT * FROM games WHERE status = 'waiting' ORDER BY created_at ASC`
      );
      return games.length ? games : MOCK_GAMES; // fallback
    } catch {
      return MOCK_GAMES; // fallback
    }
  }

  /**
   * Add a player to a game, deduct buy-in from user balance. DB rollback on
   * operation failure.
   *
   * @param gameId - The game's ID
   * @param userId - The user's ID
   * @param seatNo - The seat number to assign
   * @param buyIn - The buy-in amount to deduct from user balance
   * @returns TRUE for SUCCESS, FALSE for FAILURE
   */
  // xxx do we need buyIn? do we want to just have a set amount, or a
  // user-specified as some multiple of bb? for now, let's start simple and just
  // use a constant in the routes for the buyIn
  async addUser(gameId: string, userId: string, seatNo: number, buyIn: number): Promise<boolean> {
    // xxx update player_count and seatNo of player
    if (!gameId || !userId || seatNo < 0 || buyIn <= 0) {
      logger.warn("invalid parameters for addUser");
      return false;
    }

    try {
      return await db.tx(async (t) => {
        const game = await t.oneOrNone("SELECT id FROM games WHERE id = $1 AND status = $2", [
          gameId,
          GameStatus.WAITING,
        ]);
        if (!game) {
          logger.warn(`game (${gameId}) not found or not in WAITING status`);
          throw new RollbackError();
        }

        const existing = await t.oneOrNone(
          "SELECT user_id FROM game_users WHERE game_id = $1 AND user_id = $2",
          [gameId, userId],
        );
        if (existing) {
          logger.warn(`user (${userId}) already in game (${gameId})`);
          throw new RollbackError();
        }

        const seatTaken = await t.oneOrNone(
          "SELECT seat_no FROM game_users WHERE game_id = $1 AND seat_no = $2",
          [gameId, seatNo],
        );
        if (seatTaken) {
          logger.warn(`seat (${String(seatNo)}) already taken in game (${gameId})`);
          throw new RollbackError();
        }

        const user = await t.oneOrNone<{ balance: number }>(
          "SELECT balance FROM users WHERE id = $1",
          [userId],
        );
        if (!user || user.balance < buyIn) {
          logger.warn(`user (${userId}) not found or insufficient balance for buy-in`);
          throw new RollbackError();
        }

        const deduct = await t.result("UPDATE users SET balance = balance - $1 WHERE id = $2", [
          buyIn,
          userId,
        ]);
        if (deduct.rowCount <= 0) {
          logger.warn(`failed to deduct buy-in from user (${userId})`);
          throw new RollbackError();
        }

        const insert = await t.result(
          "INSERT INTO game_users (game_id, user_id, seat_no, balance, status, is_dealer, joined_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
          [gameId, userId, seatNo, buyIn, UserStatus.ACTIVE, false],
        );
        if (insert.rowCount <= 0) {
          logger.warn(`failed to insert game_user for user (${userId}) in game (${gameId})`);
          throw new RollbackError();
        }

        return true;
      });
    } catch (err) {
      if (err instanceof RollbackError) {
        logger.warn(`DB rollback for addUser: game_id (${gameId}), user_id (${userId})`);
        return false;
      }
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Remove a player from a game, restore balance via restoreBalance. DB
   * rollback on operation failure.
   *
   * @param gameId - The game's ID
   * @param userId - The user's ID
   * @returns TRUE for SUCCESS, FALSE for FAILURE
   */
  async removeUser(gameId: string, userId: string): Promise<boolean> {
    if (!gameId || !userId) {
      logger.warn("invalid parameters for removeUser");
      return false;
    }

    try {
      return await db.tx(async (t) => {
        const gameUser = await t.oneOrNone<{ balance: number }>(
          "SELECT balance FROM game_users WHERE game_id = $1 AND user_id = $2",
          [gameId, userId],
        );
        if (!gameUser) {
          logger.warn(`game_user not found for game (${gameId}), user (${userId})`);
          throw new RollbackError();
        }

        if (!restoreBalance(userId, gameUser.balance)) {
          logger.warn(`restoreBalance failed for user (${userId})`);
          throw new RollbackError();
        }

        const del = await t.result("DELETE FROM game_users WHERE game_id = $1 AND user_id = $2", [
          gameId,
          userId,
        ]);
        if (del.rowCount <= 0) {
          logger.warn(`failed to delete game_user for game (${gameId}), user (${userId})`);
          throw new RollbackError();
        }

        // don't touch game_cards here — the user's dealt cards become dead
        // cards for the rest of the hand. upsertCards resets all 52 positions
        // on the next shuffle/deal.
        return true;
      });
    } catch (err) {
      if (err instanceof RollbackError) {
        logger.warn(`DB rollback for removeUser: game_id (${gameId}), user_id (${userId})`);
        return false;
      }
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Get all players in a game, joined with username.
   *
   * @param gameId - The game's ID
   * @returns Array of GameUser objects, or null on invalid input
   */
  async getUsers(gameId: string): Promise<GameUser[] | null> {
    if (!gameId) {
      logger.warn(`invalid game_id: ${gameId}`);
      return null;
    }

    try {
      return await db.manyOrNone<GameUser>(
        "SELECT gu.*, u.username FROM game_users gu JOIN users u ON gu.user_id = u.id WHERE gu.game_id = $1 ORDER BY gu.seat_no",
        [gameId],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Get a specific player in a game, joined with username.
   *
   * @param gameId - The game's ID
   * @param userId - The user's ID
   * @returns The GameUser object, or null if not found
   */
  async getUser(gameId: string, userId: string): Promise<GameUser | null> {
    if (!gameId || !userId) {
      logger.warn(`invalid game_id: ${gameId} or user_id: ${userId}`);
      return null;
    }

    try {
      return await db.oneOrNone<GameUser>(
        "SELECT gu.*, u.username FROM game_users gu JOIN users u ON gu.user_id = u.id WHERE gu.game_id = $1 AND gu.user_id = $2",
        [gameId, userId],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Update a user's in-game balance with a delta (after bet/payout).
   *
   * @param gameId - The game's ID
   * @param userId - The user's ID
   * @param amount - The delta to apply to the balance
   * @returns TRUE for SUCCESS, FALSE for FAILURE
   */
  async updateUserBalance(gameId: string, userId: string, amount: number): Promise<boolean> {
    if (!gameId || !userId) {
      logger.warn(`invalid game_id: ${gameId} or user_id: ${userId}`);
      return false;
    }

    try {
      const result = await db.result(
        "UPDATE game_users SET balance = balance + $1 WHERE game_id = $2 AND user_id = $3",
        [amount, gameId, userId],
      );

      if (result.rowCount <= 0) {
        logger.warn(`updateUserBalance failed for game (${gameId}), user (${userId})`);
        return false;
      }

      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Update a user's status within a game.
   *
   * @param gameId - The game's ID
   * @param userId - The user's ID
   * @param status - The new UserStatus
   * @returns TRUE for SUCCESS, FALSE for FAILURE
   */
  async updateUserStatus(gameId: string, userId: string, status: UserStatus): Promise<boolean> {
    if (!gameId || !userId) {
      logger.warn(`invalid game_id: ${gameId} or user_id: ${userId}`);
      return false;
    }

    try {
      const result = await db.result(
        "UPDATE game_users SET status = $1 WHERE game_id = $2 AND user_id = $3",
        [status, gameId, userId],
      );

      if (result.rowCount <= 0) {
        logger.warn(`updateUserStatus failed for game (${gameId}), user (${userId})`);
        return false;
      }

      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Update the dealer for a game. Unsets all current dealers, then sets the
   * specified user as dealer. DB rollback on operation failure.
   *
   * @param gameId - The game's ID
   * @param userId - The user's ID to set as dealer
   * @returns TRUE for SUCCESS, FALSE for FAILURE
   */
  async updateDealer(gameId: string, userId: string): Promise<boolean> {
    if (!gameId || !userId) {
      logger.warn(`invalid game_id: ${gameId} or user_id: ${userId}`);
      return false;
    }

    try {
      return await db.tx(async (t) => {
        await t.result("UPDATE game_users SET is_dealer = FALSE WHERE game_id = $1", [gameId]);

        const res = await t.result(
          "UPDATE game_users SET is_dealer = TRUE WHERE game_id = $1 AND user_id = $2",
          [gameId, userId],
        );

        if (res.rowCount <= 0) {
          logger.warn(`user (${userId}) not found in game (${gameId}) for updateDealer`);
          throw new RollbackError();
        }

        return true;
      });
    } catch (err) {
      if (err instanceof RollbackError) {
        logger.warn(`DB rollback for updateDealer: game_id (${gameId}), user_id (${userId})`);
        return false;
      }
      logger.error(String(err));
      throw err;
    }
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

  /**
   * Get a user's hand (hole cards).
   *
   * @param gameId - The game's ID
   * @param userId - The user's ID
   * @returns Array of GameCard objects for the user's hand,
   * or null on invalid input
   */
  async getHand(gameId: string, userId: string): Promise<GameCard[] | null> {
    if (!gameId) {
      logger.warn(`invalid game_id: ${gameId}`);
      return null;
    }

    if (!userId) {
      logger.warn(`invalid user_id: ${userId}`);
      return null;
    }

    try {
      return await db.manyOrNone<GameCard>(
        "SELECT * FROM game_cards WHERE game_id = $1 AND user_id = $2 AND location = $3",
        [gameId, userId, CardLocation.HAND],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Get community cards (flop, turn, river).
   *
   * @param gameId - The game's ID
   * @returns Array of GameCard objects on the community board,
   * or null on invalid input
   */
  async getCommunityCards(gameId: string): Promise<GameCard[] | null> {
    if (!gameId) {
      logger.warn(`invalid game_id: ${gameId}`);
      return null;
    }

    try {
      return await db.manyOrNone<GameCard>(
        "SELECT * FROM game_cards WHERE game_id = $1 AND location = $2",
        [gameId, CardLocation.COMMUNITY],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Get all cards for a game, ordered by deck position.
   *
   * @param gameId - The game's ID
   * @returns Array of all GameCard objects in the game,
   * or null on invalid input
   */
  async getAllCards(gameId: string): Promise<GameCard[] | null> {
    if (!gameId) {
      logger.warn(`invalid game_id: ${gameId}`);
      return null;
    }

    try {
      return await db.manyOrNone<GameCard>(
        "SELECT * FROM game_cards WHERE game_id = $1 ORDER BY position",
        [gameId],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
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
