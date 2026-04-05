/**
 * @file database/seed.ts
 * @author Harry Kakadiya
 * @date 2026-03-27
 *
 * Mock data seeding script for local/test DB.
 * Data is sourced from seed.json, which is also imported by src/mock.ts.
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
import { RollbackError } from "../src/util/error.js";
import logger from "../src/util/logger.js";
import seedData from "./seed.json" assert { type: "json" };

async function seed() {
  logger.info("seeding database...");

  try {
    await db.tx(async (t) => {

      // -- Truncate (FK-safe order) ------------------------------------------
      logger.info("truncating tables...");
      await t.none(`
        TRUNCATE messages, game_actions, game_cards, game_users, games, users
        RESTART IDENTITY CASCADE
      `);

      // -- Users --------------------------------------------------------------
      logger.info("seeding users...");
      for (const u of seedData.users) {
        const result = await t.oneOrNone(
          `INSERT INTO users (id, username, email, password, balance, created_at)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [u.id, u.username, u.email, u.password, u.balance, u.created_at]
        );
        if (!result) throw new RollbackError(`failed to insert user: ${u.username}`);
        logger.debug(`inserted user: ${u.username}`);
      }

      // -- Games --------------------------------------------------------------
      logger.info("seeding games...");
      for (const g of seedData.games) {
        const result = await t.oneOrNone(
          `INSERT INTO games
             (id, status, pot_amount, max_seats, small_blind, big_blind,
              last_raise_amount, deck_position, current_player_id,
              created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [
            g.id, g.status, g.pot_amount, g.max_seats,
            g.small_blind, g.big_blind, g.last_raise_amount,
            g.deck_position, g.current_player_id,
            g.created_at, g.updated_at,
          ]
        );
        if (!result) throw new RollbackError(`failed to insert game: ${g.id}`);
        logger.debug(`inserted game: ${g.id}`);
      }

      // -- game_users ---------------------------------------------------------
      logger.info("seeding game_users...");
      for (const gu of seedData.game_users) {
        const result = await t.oneOrNone(
          `INSERT INTO game_users
             (game_id, user_id, seat_no, balance, status, is_dealer, joined_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING user_id`,
          [gu.game_id, gu.user_id, gu.seat_no, gu.balance, gu.status, gu.is_dealer, gu.joined_at]
        );
        if (!result) throw new RollbackError(`failed to insert game_user: ${gu.user_id}`);
        logger.debug(`inserted game_user: ${gu.user_id}`);
      }

      // -- game_cards ---------------------------------------------------------
      logger.info("seeding game_cards...");
      for (const gc of seedData.game_cards) {
        const result = await t.oneOrNone(
          `INSERT INTO game_cards (game_id, position, card, location, user_id)
           VALUES ($1,$2,$3,$4,$5) RETURNING position`,
          [gc.game_id, gc.position, gc.card, gc.location, gc.user_id]
        );
        if (!result) throw new RollbackError(`failed to insert game_card at position: ${gc.position}`);
        logger.debug(`inserted game_card at position: ${gc.position}`);
      }

      // -- game_actions -------------------------------------------------------
      logger.info("seeding game_actions...");
      for (const ga of seedData.game_actions) {
        const result = await t.oneOrNone(
          `INSERT INTO game_actions
             (game_id, user_id, action, amount, deck_position, created_at)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [ga.game_id, ga.user_id, ga.action, ga.amount, ga.deck_position, ga.created_at]
        );
        if (!result) throw new RollbackError(`failed to insert game_action: ${ga.action}`);
        logger.debug(`inserted game_action: ${ga.action}`);
      }

      // -- messages -----------------------------------------------------------
      logger.info("seeding messages...");
      for (const m of [...seedData.game_messages, ...seedData.dms]) {
        const result = await t.oneOrNone(
          `INSERT INTO messages (user_from, game_id, user_to, body, created_at)
           VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [m.user_from, m.game_id, m.user_to, m.body, m.created_at]
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
