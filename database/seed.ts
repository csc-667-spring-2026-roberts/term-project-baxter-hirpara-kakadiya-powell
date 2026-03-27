/**
 * @file database/seed.ts
 * @author Harry Kakadiya
 * @date 2026-03-27
 *
 * Mock data seeding script for local/test DB.
 *
 * Uses the same UUIDs and data as src/mock.ts for consistency.
 *
 * MOCK USER CREDENTIALS (bcrypt, cost 10):
 *   email              | password
 *   -------------------+---------
 *   test@sfsu.edu      | test
 *   alice@sfsu.edu     | test
 *   bob@sfsu.edu       | test
 *
 * Usage:
 *   npx ts-node database/seed.ts
 */

import db from "../src/db/connection.js";
import { GameStatus, UserStatus, CardLocation, Action } from "../src/env.js";
import type { User, Game, GameUser, GameCard, GameAction, Message } from "../src/models/types.js";
import { RollbackError } from "../src/util/error.js";
import logger from "../src/util/logger.js";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// IDs -- same as mock.ts so mock data and DB stay in sync
// ---------------------------------------------------------------------------

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"; // test@sfsu.edu
const MOCK_USER2_ID = "00000000-0000-0000-0000-000000000002"; // alice@sfsu.edu
const MOCK_USER3_ID = "00000000-0000-0000-0000-000000000003"; // bob@sfsu.edu

const MOCK_GAME_ID = "00000000-0000-0000-0000-000000000010"; // PLAYING
const MOCK_GAME2_ID = "00000000-0000-0000-0000-000000000011"; // PLAYING
const MOCK_LOBBY_GAME_ID = "00000000-0000-0000-0000-000000000020"; // WAITING

// Hardcoded to avoid clock skew between DB and JS
const SEED_DATE = "2026-03-27T00:00:00.000Z";

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  logger.info("seeding database...");

  try {
    await db.tx(async (t) => {
      // -- Truncate (FK-safe order) -----------------------------------------
      logger.info("truncating tables...");
      await t.none(`
        TRUNCATE messages, game_actions, game_cards, game_users, games, users
        RESTART IDENTITY CASCADE
      `);

      // -- Users --------------------------------------------------------------
      logger.info("seeding users...");
      const hash = await bcrypt.hash("test", 10);

      const users: Omit<User, "created_at">[] = [
        {
          id: MOCK_USER_ID,
          username: "test",
          email: "test@sfsu.edu",
          password: hash,
          balance: 1000,
        },
        {
          id: MOCK_USER2_ID,
          username: "alice",
          email: "alice@sfsu.edu",
          password: hash,
          balance: 500,
        },
        { id: MOCK_USER3_ID, username: "bob", email: "bob@sfsu.edu", password: hash, balance: 750 },
      ];

      for (const u of users) {
        const result = await t.oneOrNone(
          `INSERT INTO users (id, username, email, password, balance, created_at)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [u.id, u.username, u.email, u.password, u.balance, SEED_DATE],
        );
        if (!result) throw new RollbackError(`failed to insert user: ${u.username}`);
        logger.debug(`inserted user: ${u.username}`);
      }

      // -- Games --------------------------------------------------------------
      logger.info("seeding games...");
      const games: Omit<Game, "ended_at" | "turn_deadline_at">[] = [
        {
          id: MOCK_GAME_ID,
          status: GameStatus.PLAYING,
          created_at: new Date(SEED_DATE),
          updated_at: new Date(SEED_DATE),
          pot_amount: 150,
          current_player_id: MOCK_USER_ID,
          max_seats: 6,
          small_blind: 1,
          big_blind: 2,
          last_raise_amount: 0,
          deck_position: 9,
        },
        {
          id: MOCK_GAME2_ID,
          status: GameStatus.PLAYING,
          created_at: new Date(SEED_DATE),
          updated_at: new Date(SEED_DATE),
          pot_amount: 150,
          current_player_id: MOCK_USER_ID,
          max_seats: 6,
          small_blind: 1,
          big_blind: 2,
          last_raise_amount: 0,
          deck_position: 9,
        },
        {
          id: MOCK_LOBBY_GAME_ID,
          status: GameStatus.WAITING,
          created_at: new Date(SEED_DATE),
          updated_at: new Date(SEED_DATE),
          pot_amount: 0,
          current_player_id: null,
          max_seats: 6,
          small_blind: 1,
          big_blind: 2,
          last_raise_amount: 0,
          deck_position: 0,
        },
      ];

      for (const g of games) {
        const result = await t.oneOrNone(
          `INSERT INTO games
             (id, status, pot_amount, max_seats, small_blind, big_blind,
              last_raise_amount, deck_position, current_player_id,
              created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [
            g.id,
            g.status,
            g.pot_amount,
            g.max_seats,
            g.small_blind,
            g.big_blind,
            g.last_raise_amount,
            g.deck_position,
            g.current_player_id,
            SEED_DATE,
            SEED_DATE,
          ],
        );
        if (!result) throw new RollbackError(`failed to insert game: ${g.id}`);
        logger.debug(`inserted game: ${g.id}`);
      }

      // -- game_users ---------------------------------------------------------
      logger.info("seeding game_users...");
      const gameUsers: GameUser[] = [
        {
          game_id: MOCK_GAME_ID,
          user_id: MOCK_USER_ID,
          seat_no: 1,
          balance: 88,
          status: UserStatus.ACTIVE,
          is_dealer: true,
          joined_at: new Date(SEED_DATE),
        },
        {
          game_id: MOCK_GAME_ID,
          user_id: MOCK_USER2_ID,
          seat_no: 2,
          balance: 95,
          status: UserStatus.ACTIVE,
          is_dealer: false,
          joined_at: new Date(SEED_DATE),
        },
        {
          game_id: MOCK_GAME_ID,
          user_id: MOCK_USER3_ID,
          seat_no: 3,
          balance: 100,
          status: UserStatus.ACTIVE,
          is_dealer: false,
          joined_at: new Date(SEED_DATE),
        },
      ];

      for (const gu of gameUsers) {
        const result = await t.oneOrNone(
          `INSERT INTO game_users
             (game_id, user_id, seat_no, balance, status, is_dealer, joined_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id`,
          [gu.game_id, gu.user_id, gu.seat_no, gu.balance, gu.status, gu.is_dealer, gu.joined_at],
        );
        if (!result) throw new RollbackError(`failed to insert game_user: ${gu.user_id}`);
        logger.debug(`inserted game_user: ${gu.user_id}`);
      }

      // -- game_cards ---------------------------------------------------------
      logger.info("seeding game_cards...");
      const gameCards: GameCard[] = [
        {
          game_id: MOCK_GAME_ID,
          position: 6,
          card: 12,
          location: CardLocation.COMMUNITY,
          user_id: null,
        },
        {
          game_id: MOCK_GAME_ID,
          position: 7,
          card: 37,
          location: CardLocation.COMMUNITY,
          user_id: null,
        },
        {
          game_id: MOCK_GAME_ID,
          position: 8,
          card: 4,
          location: CardLocation.COMMUNITY,
          user_id: null,
        },
        {
          game_id: MOCK_GAME_ID,
          position: 0,
          card: 25,
          location: CardLocation.HAND,
          user_id: MOCK_USER_ID,
        },
        {
          game_id: MOCK_GAME_ID,
          position: 1,
          card: 38,
          location: CardLocation.HAND,
          user_id: MOCK_USER_ID,
        },
      ];

      for (const gc of gameCards) {
        const result = await t.oneOrNone(
          `INSERT INTO game_cards (game_id, position, card, location, user_id)
           VALUES ($1,$2,$3,$4,$5) RETURNING position`,
          [gc.game_id, gc.position, gc.card, gc.location, gc.user_id],
        );
        if (!result)
          throw new RollbackError(`failed to insert game_card at position: ${gc.position}`);
        logger.debug(`inserted game_card at position: ${gc.position}`);
      }

      // -- game_actions -------------------------------------------------------
      logger.info("seeding game_actions...");
      const gameActions: Omit<GameAction, "id">[] = [
        {
          game_id: MOCK_GAME_ID,
          user_id: MOCK_USER_ID,
          action: Action.DEAL_HAND,
          amount: null,
          deck_position: 2,
          created_at: new Date(SEED_DATE),
        },
        {
          game_id: MOCK_GAME_ID,
          user_id: MOCK_USER_ID,
          action: Action.BET,
          amount: 10,
          deck_position: 6,
          created_at: new Date(SEED_DATE),
        },
        {
          game_id: MOCK_GAME_ID,
          user_id: null,
          action: Action.DEAL_COMMUNITY,
          amount: null,
          deck_position: 9,
          created_at: new Date(SEED_DATE),
        },
      ];

      for (const ga of gameActions) {
        const result = await t.oneOrNone(
          `INSERT INTO game_actions
             (game_id, user_id, action, amount, deck_position, created_at)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [ga.game_id, ga.user_id, ga.action, ga.amount, ga.deck_position, ga.created_at],
        );
        if (!result) throw new RollbackError(`failed to insert game_action: ${ga.action}`);
        logger.debug(`inserted game_action: ${ga.action}`);
      }

      // -- messages -----------------------------------------------------------
      logger.info("seeding messages...");
      const messages: Omit<Message, "id" | "username">[] = [
        {
          user_from: MOCK_USER_ID,
          game_id: MOCK_GAME_ID,
          user_to: null,
          body: "gl everyone",
          created_at: new Date(SEED_DATE),
        },
        {
          user_from: MOCK_USER2_ID,
          game_id: MOCK_GAME_ID,
          user_to: null,
          body: "ty u2",
          created_at: new Date(SEED_DATE),
        },
        {
          user_from: MOCK_USER3_ID,
          game_id: MOCK_GAME_ID,
          user_to: null,
          body: "lets go",
          created_at: new Date(SEED_DATE),
        },
        {
          user_from: MOCK_USER_ID,
          game_id: null,
          user_to: MOCK_USER2_ID,
          body: "gg last game",
          created_at: new Date(SEED_DATE),
        },
        {
          user_from: MOCK_USER2_ID,
          game_id: null,
          user_to: MOCK_USER_ID,
          body: "yeah wp",
          created_at: new Date(SEED_DATE),
        },
      ];

      for (const m of messages) {
        const result = await t.oneOrNone(
          `INSERT INTO messages (user_from, game_id, user_to, body, created_at)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [m.user_from, m.game_id, m.user_to, m.body, m.created_at],
        );
        if (!result) throw new RollbackError(`failed to insert message: ${m.body}`);
        logger.debug(`inserted message: ${m.body}`);
      }
    });

    logger.info("seed complete");
    logger.info("  users:   test, alice, bob  (password: test)");
    logger.info("  games:   2x PLAYING, 1x WAITING");
    logger.info("  cards:   3 community + 2 hand cards in MOCK_GAME");
    logger.info("  actions: DEAL_HAND, BET, DEAL_COMMUNITY");
    logger.info("  messages: 3 game chat + 2 DMs");
  } catch (err) {
    logger.error("seed failed, transaction rolled back:", err);
    process.exit(1);
  } finally {
    db.$pool.end();
  }
}

seed();
