/* eslint-disable @typescript-eslint/require-await */
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
import {
  validatePosition,
  restoreBalance,
  validateMoney,
  validateGameConfig,
  validateSeats,
  validateBlinds,
  validateStatus,
} from "../shared/util.js";
import { RollbackError } from "../util/error.js";
import {
  DECK_SIZE,
  GameStatus,
  UserStatus,
  Action,
  CardLocation,
  gameStatus,
} from "../shared/env.js";
import { MOCK_GAME_ACTIONS } from "../mock.js";
import { Game, GameUser, GameCard, GameAction, IRepository } from "./types.js";
import { GameConfig, Maybe } from "../shared/types.js";

/**
 * Game repository.
 */
class GameRepository implements IRepository<Game> {
  /**
   * find a game by ID
   * @param id - The ID of the game
   * @returns The game if found, otherwise null
   */
  async findById(id: string): Promise<Game | null> {
    if (!id) {
      logger.warn(`invalid game_id: ${id}`);
      return null;
    }

    try {
      return await db.oneOrNone("SELECT * FROM games WHERE id = $1", [id]);
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  private validateDeadline(
    turn_deadline_at: Maybe<Date>,
    current_player_id: Maybe<string>,
  ): boolean {
    return (
      (turn_deadline_at == null && current_player_id == null) ||
      (turn_deadline_at != null && current_player_id != null)
    );
  }

  /**
   * create a new game
   * @param _data - Partial game data used to create the game
   * @returns A mock game object representing the created game
   */
  // eslint-disable-next-line complexity
  async create(data: Partial<Game>): Promise<Game | null> {
    if (!data.big_blind || !data.small_blind || !data.max_seats) {
      logger.warn(
        "create game with invalid GameConfig: " + "missing: big_blind || small_blind || max_seats",
      );
      return null;
    }

    const cfg: GameConfig = {
      smallBlind: data.small_blind,
      bigBlind: data.big_blind,
      maxSeats: data.max_seats,
    };

    if (!validateGameConfig(cfg)) {
      logger.warn(`create game with invalid GameConfig: ${JSON.stringify(cfg)}`);
      return null;
    }

    if (!validateMoney(data.small_blind, data.big_blind, data.pot_amount, data.last_raise_amount)) {
      logger.warn(
        "create game with invalid money-types: " +
          "small_blind || big_blind || pot_amount || last_raise_amount",
      );
      return null;
    }

    data.status = data.status ?? GameStatus.WAITING;
    if (!validateStatus(data.status) || data.status !== GameStatus.WAITING) {
      logger.warn(`create game with invalid status: ${gameStatus(data.status)}`);
      return null;
    }

    data.pot_amount = data.pot_amount ?? 0;
    data.last_raise_amount = data.last_raise_amount ?? 0;
    if (data.pot_amount !== 0 || data.last_raise_amount !== 0) {
      logger.warn(
        "create game with invalid starting money-types (expect 0): " +
          "pot_amount || last_raise_amount",
      );
      return null;
    }

    if (!this.validateDeadline(data.turn_deadline_at, data.current_player_id)) {
      logger.warn("turn_deadline_at and current_player_id must be both null or both set");
      return null;
    }

    data.deck_position = data.deck_position ?? 0;
    if (data.deck_position !== 0) {
      logger.warn("New game cannot have non-zero position");
      return null;
    }

    try {
      const game = await db.one<Game>(
        `INSERT INTO games
         (status, max_seats, small_blind, big_blind, deck_position, pot_amount, turn_deadline_at, current_player_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          data.status,
          data.max_seats,
          data.small_blind,
          data.big_blind,
          data.deck_position,
          data.pot_amount,
          data.turn_deadline_at ?? null,
          data.current_player_id ?? null,
        ],
      );

      return game;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * update a game by ID
   * @param _id - The ID of the game to update
   * @param _data - Partial game data containing fields to update
   * @returns True if update was successful, otherwise false
   */
  async update(id: string, data: Partial<Game>): Promise<boolean> {
    if (!id) {
      logger.warn(`invalid game_id: ${id}`);
      return false;
    }

    // only validate fields that are provided:
    if (data.max_seats != null && !validateSeats(data.max_seats)) {
      logger.warn(`Invalid max_seats: ${String(data.max_seats)}`);
      return false;
    }

    if (data.deck_position != null && !validatePosition(data.deck_position)) {
      logger.warn(`Invalid position: ${String(data.deck_position)}`);
      return false;
    }

    // validate any money-types are valid:
    if (!validateMoney(data.small_blind, data.big_blind, data.pot_amount, data.last_raise_amount)) {
      logger.warn(
        "update game with invalid money-types: " +
          "small_blind || big_blind || pot_amount || last_raise_amount",
      );
      return false;
    }

    // Conditional fields check:
    if (!this.validateDeadline(data.turn_deadline_at, data.current_player_id)) {
      logger.warn("turn_deadline_at and current_player_id must be both null or both set");
      return false;
    }

    try {
      const res = await db.result(
        `UPDATE games SET
        status = COALESCE($1, status),
        max_seats = COALESCE($2, max_seats),
        small_blind = COALESCE($3, small_blind),
        big_blind = COALESCE($4, big_blind),
        deck_position = COALESCE($5, deck_position),
        pot_amount = COALESCE($6, pot_amount),
        turn_deadline_at = COALESCE($7, turn_deadline_at),
        current_player_id = COALESCE($8, current_player_id)
        WHERE id = $9`,
        [
          data.status,
          data.max_seats,
          data.small_blind,
          data.big_blind,
          data.deck_position,
          data.pot_amount,
          data.turn_deadline_at,
          data.current_player_id,
          id,
        ],
      );

      if (res.rowCount <= 0) {
        logger.warn(`game with game_id (${id}) not found`);
        return false;
      }

      logger.debug(`Success - Updated ${String(res.rowCount)} row(s)`);
      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
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
    if (!gameId) {
      logger.warn(`invalid game_id: ${gameId}`);
      return false;
    }
    try {
      return await db.tx(async (t) => {
        // delete game_actions
        const actions = await t.result("DELETE FROM game_actions WHERE game_id = $1", [gameId]);
        if (actions.rowCount <= 0) {
          logger.warn(`no game_actions found for game_id: ${gameId}`);
          throw new RollbackError();
        }
        // delete game_cards
        const cards = await t.result("DELETE FROM game_cards WHERE game_id = $1", [gameId]);
        if (cards.rowCount <= 0) {
          logger.warn(`no game_cards found for game_id: ${gameId}`);
          throw new RollbackError();
        }
        // delete game_users
        const users = await t.result("DELETE FROM game_users WHERE game_id = $1", [gameId]);
        if (users.rowCount <= 0) {
          logger.warn(`no game_users found for game_id: ${gameId}`);
          throw new RollbackError();
        }
        // delete the game itself
        const game = await t.result("DELETE FROM games WHERE id = $1", [gameId]);
        if (game.rowCount <= 0) {
          logger.warn(`no game found for game_id: ${gameId}`);
          throw new RollbackError();
        }
        // if all succeeds, transaction commits atomically
        return true;
      });
    } catch (err) {
      if (err instanceof RollbackError) {
        logger.warn(`DB rollback for game_id: ${gameId}`);
        return false;
      }
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Retrieves all games associated with a specific user.
   *
   * @param userId - The ID of the user
   * @returns A list of mock games, or null if none found
   */
  async findByUserId(userId: string): Promise<Game[] | null> {
    if (!userId) {
      logger.warn(`invalid user_id: ${userId}`);
      return null;
    }
    try {
      // sorts by status -> created_at DESC, so pending statusus bubble to the
      // top
      // xxx do we just want created_at to dominate though?
      return await db.any(
        `
				SELECT g.*
				FROM games g
				JOIN game_users gu ON gu.game_id = g.id
				WHERE gu.user_id = $1
				ORDER BY status, g.created_at DESC`,
        [userId],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Find available games matching blind levels, sorted on index
   * IDX_games_status_created_at.
   *
   * @param smallBlind - small blind of GameConfig
   * @param bigBlind - big blind of GameConfig
   * @returns List of Games that match blinds of GameConfig (empty list if none
   * found), or null if invalid config
   */
  async findAvailableBlind(smallBlind: number, bigBlind: number): Promise<Game[] | null> {
    if (!validateBlinds(smallBlind, bigBlind)) {
      logger.warn(`invalid blinds (SB: ${String(smallBlind)}, BB: ${String(bigBlind)}) for find`);
      return null;
    }

    try {
      // xxx do we want want to sort ASC, or provide a predicate for sort?
      // order by status first (recall: WAITING = 0, PLAYING = 1, ...) which
      // will push pending games to the top, then order by created_at ASC to
      // find oldest games for players to join
      const games = await db.any<Game>(
        `
				SELECT g.*, COUNT(gu.user_id) AS player_count
				FROM games g
				LEFT JOIN game_users gu ON gu.game_id = g.id
				WHERE g.small_blind = $1
					AND g.big_blind = $2
					AND g.status != $3
				GROUP BY g.id
				HAVING COUNT(gu.user_id) < g.max_seats
				ORDER BY status, created_at ASC`,
        [smallBlind, bigBlind, GameStatus.ENDED],
      );
      return games;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Find all available games, sorted on index IDX_games_status_created_at.
   *
   * @returns List of Games that match blinds of GameConfig (empty list if none
   * found), or null if invalid.
   */
  async findAvailableAll(): Promise<Game[] | null> {
    try {
      // order by status first (recall: WAITING = 0, PLAYING = 1, ...) which
      // will push pending games to the top, then order by created_at ASC to
      // find oldest games for players to join
      return await db.any<Game>(
        `
				SELECT g.*, COUNT(gu.user_id) AS player_count
				FROM games g
				LEFT JOIN game_users gu ON gu.game_id = g.id
				WHERE g.status != $1
				GROUP BY g.id
				HAVING COUNT(gu.user_id) < g.max_seats
        ORDER BY status, created_at ASC`,
        [GameStatus.ENDED],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
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
        const game = await t.oneOrNone<{ id: string }>(
          "SELECT id FROM games WHERE id = $1 AND status = $2",
          [gameId, GameStatus.WAITING],
        );
        if (!game) {
          logger.warn(`game (${gameId}) not found or not in WAITING status`);
          throw new RollbackError();
        }

        const existing = await t.oneOrNone<{ user_id: string }>(
          "SELECT user_id FROM game_users WHERE game_id = $1 AND user_id = $2",
          [gameId, userId],
        );
        if (existing) {
          logger.warn(`user (${userId}) already in game (${gameId})`);
          throw new RollbackError();
        }

        const seatTaken = await t.oneOrNone<{ seat_no: number }>(
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
