/* eslint-disable @typescript-eslint/require-await */
// stub file, disable linting
/**
 * @file models/message.ts
 * @author Tyler Baxter
 * @date 2026-03-21
 *
 * Message model and repository.
 */

import { IRepository, Message } from "./types.js";
//import db from "../db/connection.js";
//import logger from "../util/logger.js";
import { MOCK_GAME_MESSAGES } from "../mock.js";

/**
 * Message repository.
 */
class MessageRepository implements IRepository<Message> {
  /** find a message by ID */
  async findById(_id: string): Promise<Message | null> {
    return null;
  }

  /** create a message (game chat or DM) */
  async create(_data: Partial<Message>): Promise<Message | null> {
    return null;
  }

  /** update a message by ID */
  async update(_id: string, _data: Partial<Message>): Promise<boolean> {
    return false;
  }

  /** delete a message by ID */
  async delete(_id: string): Promise<boolean> {
    return false;
  }

  /** get all messages for a game lobby */
  async getGame(_gameId: string): Promise<Message[]> {
    return MOCK_GAME_MESSAGES;
  }

  /**
   * Get DM conversation between two users. Result may be null, because we
   * shouldn't find an empty messages array between two users if they've never
   * messaged.
   *
   * @returns An array of Messages, or null if no messages.
   */
  async getPrivate(_userId1: string, _userId2: string): Promise<Message[] | null> {
    return null;
  }

  /** get all DMs received by a user */
  async getReceived(_userId: string): Promise<Message[]> {
    return [];
  }

  /** get all DMs sent by a user */
  async getSent(_userId: string): Promise<Message[]> {
    return [];
  }

  /** get all unique conversations for a user (inbox) */
  async getInbox(_userId: string): Promise<Message[]> {
    return [];
  }
}

export default new MessageRepository();

// vim: set ts=2 sw=2 sts=2 noet filetype=typescript:
