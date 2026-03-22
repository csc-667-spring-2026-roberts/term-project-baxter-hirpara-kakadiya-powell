/**
 * @file models/user.ts
 * @author Tyler Baxter
 * @date 2026-03-15
 *
 * User model and repository.
 */

import bcrypt from "bcrypt";
import db from "../db/connection.js";
import logger from "../util/logger.js";
import { User, IRepository } from "./types.js";

const SALT_ROUNDS = 10;

/**
 * User repository.
 */
class UserRepository implements IRepository<User> {
  /**
   * Find a user by ID
   * @param id - The user's ID
   * @returns The user object or null if not found
   */
  async findById(id: string): Promise<User | null> {
    if (!id) {
      logger.warn(`invalid id: ${id}`);
      return null;
    }

    try {
      // db call
      return await db.oneOrNone("SELECT * FROM users WHERE id = $1", [id]);
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Create a new user
   * @param email - User's email
   * @param password - User's password (plain text)
   */
  async create(data: Partial<User>): Promise<User | null> {
    if (!data.username || !data.email || !data.password) {
      logger.warn("invalid username, email, password");
      return null;
    }

    try {
      const find = await this.findByEmail(data.email);
      if (find) {
        logger.warn(`user with email (${data.email}) already exists`);
        return null;
      }

      // Hash the password
      const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
      logger.debug(`hashed: ${hashed}`);

      // Insert the new user into the database
      const user = await db.one<User>(
        "INSERT INTO users (id, username, email, password, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW()) RETURNING *",
        [data.username, data.email, hashed],
      );

      return user;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Update a user by ID
   * @param id - The user's ID
   * @param data - Fields to update
   */
  async update(id: string, data: Partial<User>): Promise<boolean> {
    try {
      const fields = Object.keys(data);
      if (fields.length <= 0) {
        logger.warn(`no fields to update`);
        return false;
      }

      const setClauses = fields.map((f, i) => `${f} = $${String(i + 1)}`);
      const values: unknown[] = Object.values(data);
      values.push(id);

      const result = await db.result(
        `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${String(values.length)}`,
        values,
      );

      if (result.rowCount <= 0) {
        logger.warn(`update for id (${id}) failed`);
        return false;
      }

      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Delete a user by ID
   * @param id - The user's ID
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await db.result("DELETE FROM users WHERE id = $1", [id]);
      if (result.rowCount <= 0) {
        logger.warn(`delete for id (${id}) failed`);
        return false;
      }
      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Find a user by email
   * @param email - The user's email address
   * @returns The user object or null if not found
   */
  async findByEmail(email: string): Promise<User | null> {
    if (!email) {
      logger.warn(`email cannot be empty`);
      return null;
    }

    try {
      return await db.oneOrNone("SELECT * FROM users WHERE email = $1", [email]);
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Find a user by username
   * @param name - The user's username
   * @returns The user object or null if not found
   */
  async findByUsername(username: string): Promise<User | null> {
    if (!username) {
      logger.warn(`username cannot be empty`);
      return null;
    }

    try {
      return await db.oneOrNone("SELECT * FROM users WHERE username = $1", [username]);
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Verify a user's password
   * @param login - The user's email or username
   * @param password - The plaintext password to verify
   * @returns userId if valid, -1 otherwise
   */
  async verifyPassword(login: string, password: string): Promise<User | null> {
    try {
      // parse for email
      const isEmail = login.includes("@");
      const myuser = isEmail ? await this.findByEmail(login) : await this.findByUsername(login);

      if (!myuser) {
        logger.warn(`user with login (${login}) not found`);
        return null;
      }

      //logger.debug(`plaintext password: ${password}`);
      //logger.debug(`myuser hashed password: ${myuser.password}`);

      const match = await bcrypt.compare(password, myuser.password);
      if (!match) {
        return null;
      }

      return myuser;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Update a user's email
   * @param email - The user's current email
   * @param newEmail - The new email to set
   */
  async updateEmail(email: string, newEmail: string): Promise<boolean> {
    logger.debug("Entered");
    //logger.debug(`email=${email}`);

    try {
      const myuser = await this.findByEmail(email);
      if (!myuser) {
        logger.warn(`user with email (${email}) not found`);
        return false;
      }

      const id = myuser.id;

      // sql command
      const result = await db.result("UPDATE users SET email = $1 WHERE id = $2", [newEmail, id]);

      if (result.rowCount <= 0) {
        logger.warn(`user with id (${id}) not found`);
        return false;
      }

      logger.debug(`Success - Updated ${String(result.rowCount)} row(s)`);
      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Update a user's password
   * @param email - The user's email
   * @param newPassword - The new plaintext password
   */
  async updatePassword(email: string, newPassword: string): Promise<boolean> {
    logger.debug("Entered");
    //logger.debug(`email=${email}`);

    try {
      const myuser = await this.findByEmail(email);
      if (!myuser) {
        logger.warn(`user with email (${email}) not found`);
        return false;
      }

      const id = myuser.id;

      // sql command
      const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
      const result = await db.result("UPDATE users SET password = $1 WHERE id = $2", [hashed, id]);

      if (result.rowCount <= 0) {
        logger.warn(`user with id (${id}) not found`);
        return false;
      }

      logger.debug(`Success - Updated ${String(result.rowCount)} row(s)`);
      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }

  /**
   * Update a user's balance with a delta
   * @param id - The user's id
   * @param delta - The delta from the old balance
   */
  async updateBalance(id: string, delta: number): Promise<boolean> {
    if (!id) {
      logger.warn(`invalid id: ${id}`);
      return false;
    }

    try {
      const result = await db.result("UPDATE users SET balance = balance + $1 WHERE id = $2", [
        delta,
        id,
      ]);

      if (result.rowCount <= 0) {
        logger.warn(`user with id (${id}) not found`);
        return false;
      }

      logger.debug(`Success - Updated ${String(result.rowCount)} row(s)`);
      return true;
    } catch (err) {
      logger.error(String(err));
      throw err;
    }
  }
}

export default new UserRepository();

// vim: set ts=2 sw=2 sts=2 noet filetype=typescript:
