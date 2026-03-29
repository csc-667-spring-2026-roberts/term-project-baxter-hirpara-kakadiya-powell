/* eslint-disable @typescript-eslint/require-await */
/**
 * @file models/message.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * Message model and repository.
 */

import db from "../db/connection.js";
import logger from "../util/logger.js";
import { IRepository, Message } from "./types.js";

/**
 * Message repository.
 */
class MessageRepository implements IRepository<Message> {
  /** find a message by ID */
  async findById(_id: string): Promise<Message | null> {
    return null;
  }

  /**
   * Create a message (game chat or DM).
   *
   * @param data - Partial Message with user_from, body, and either game_id
   *   or user_to
   * @returns The created Message, or null on invalid input
   */
  async create(data: Partial<Message>): Promise<Message | null> {
    if (!data.user_from || !data.body) {
      logger.warn("invalid user_from or body for create");
      return null;
    }

    // must be either game chat (game_id) or DM (user_to), never both
    if (!data.game_id && !data.user_to) {
      logger.warn("message must have either game_id or user_to");
      return null;
    }

    if (data.game_id && data.user_to) {
      logger.warn("message cannot have both game_id and user_to");
      return null;
    }

    try {
      return await db.one<Message>(
        `INSERT INTO messages (user_from, game_id, user_to, body)
         VALUES ($1, $2, $3, $4)
         RETURNING *, (SELECT username FROM users WHERE id = $1) AS username`,
        [data.user_from, data.game_id ?? null, data.user_to ?? null, data.body],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /** update a message by ID */
  async update(_id: string, _data: Partial<Message>): Promise<boolean> {
    return false;
  }

  /** delete a message by ID */
  async delete(_id: string): Promise<boolean> {
    return false;
  }

  /**
   * Get all messages for a game lobby, joined with username.
   *
   * @param gameId - The game's ID
   * @returns Array of Messages, or null on invalid input
   */
  async getGame(gameId: string): Promise<Message[] | null> {
    if (!gameId) {
      logger.warn(`invalid game_id: ${gameId}`);
      return null;
    }

    try {
      return await db.manyOrNone<Message>(
        `SELECT m.*, u.username FROM messages m
         JOIN users u ON m.user_from = u.id
         WHERE m.game_id = $1
         ORDER BY m.created_at`,
        [gameId],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Get DM conversation between two users, joined with username.
   *
   * @param userId1 - First user's ID
   * @param userId2 - Second user's ID
   * @returns Array of Messages (empty if no conversation), or null on
   *   invalid input
   */
  async getPrivate(userId1: string, userId2: string): Promise<Message[] | null> {
    if (!userId1 || !userId2) {
      logger.warn(`invalid user_id: ${userId1} or ${userId2}`);
      return null;
    }

    try {
      return await db.manyOrNone<Message>(
        `SELECT m.*, u.username FROM messages m
         JOIN users u ON m.user_from = u.id
         WHERE (m.user_from = $1 AND m.user_to = $2)
            OR (m.user_from = $2 AND m.user_to = $1)
         ORDER BY m.created_at`,
        [userId1, userId2],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Get all DMs received by a user, joined with username.
   *
   * @param userId - The user's ID
   * @returns Array of Messages, or null on invalid input
   */
  async getReceived(userId: string): Promise<Message[] | null> {
    if (!userId) {
      logger.warn(`invalid user_id: ${userId}`);
      return null;
    }

    try {
      return await db.manyOrNone<Message>(
        `SELECT m.*, u.username FROM messages m
         JOIN users u ON m.user_from = u.id
         WHERE m.user_to = $1
         ORDER BY m.created_at`,
        [userId],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Get all DMs sent by a user, joined with username.
   *
   * @param userId - The user's ID
   * @returns Array of Messages, or null on invalid input
   */
  async getSent(userId: string): Promise<Message[] | null> {
    if (!userId) {
      logger.warn(`invalid user_id: ${userId}`);
      return null;
    }

    try {
      return await db.manyOrNone<Message>(
        `SELECT m.*, u.username FROM messages m
         JOIN users u ON m.user_from = u.id
         WHERE m.user_from = $1 AND m.user_to IS NOT NULL
         ORDER BY m.created_at`,
        [userId],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Get all unique conversations for a user (inbox). Returns the most
   * recent message from each conversation, joined with username.
   *
   * @param userId - The user's ID
   * @returns Array of Messages (one per conversation), or null on invalid
   *   input
   */
  async getInbox(userId: string): Promise<Message[] | null> {
    if (!userId) {
      logger.warn(`invalid user_id: ${userId}`);
      return null;
    }

    try {
      return await db.manyOrNone<Message>(
        `SELECT DISTINCT ON (partner) m.*, u.username
         FROM (
           SELECT *,
             CASE WHEN user_from = $1 THEN user_to ELSE user_from END AS partner
           FROM messages
           WHERE (user_from = $1 OR user_to = $1) AND game_id IS NULL
         ) m
         JOIN users u ON m.user_from = u.id
         ORDER BY partner, m.created_at DESC`,
        [userId],
      );
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }
}

export default new MessageRepository();

// vim: set ts=2 sw=2 sts=2 noet filetype=typescript:
