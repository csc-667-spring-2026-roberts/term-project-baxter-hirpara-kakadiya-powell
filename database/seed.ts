/**
 * @file seed.ts
 * @description Mock data seeding script for local/test DB.
 *
 * Uses the same UUIDs as mock.ts so frontend mock data and DB are consistent.
 *
 * MOCK USER CREDENTIALS (bcrypt, cost 10):
 *   email              | password
 *   -------------------+---------
 *   test@sfsu.edu      | test
 *   alice@sfsu.edu     | test
 *   bob@sfsu.edu       | test
 *
 * Usage:
 *   npx ts-node src/seed.ts
 */

import "dotenv/config";
import pgPromise from "pg-promise";
import bcrypt from "bcrypt";

// ---------------------------------------------------------------------------
// DB — mirrors src/db/index.ts setup
// ---------------------------------------------------------------------------

const pgp = pgPromise();
pgp.pg.types.setTypeParser(1700, parseFloat);
pgp.pg.types.setTypeParser(20, BigInt);

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const db = pgp({ connectionString: DATABASE_URL });

// ---------------------------------------------------------------------------
// Enums — mirrors src/env.ts
// ---------------------------------------------------------------------------

const GameStatus = { WAITING: 0, PLAYING: 1, PAUSED: 2, ENDED: 3 };
const UserStatus = { ACTIVE: 0, INACTIVE: 1, PAUSED: 2 };
const CardLocation = { DECK: 0, COMMUNITY: 1, HAND: 2 };
const Action = {
  DEAL_COMMUNITY: 0, DEAL_HAND: 1, BET: 2, CALL: 3,
  RAISE: 4, CHECK: 5, FOLD: 6, ALL_IN: 7, SHOWDOWN: 8, PAYOUT: 9,
};

// ---------------------------------------------------------------------------
// IDs — same as mock.ts so mock data and DB stay in sync
// ---------------------------------------------------------------------------

const MOCK_USER_ID  = "00000000-0000-0000-0000-000000000001"; // test@sfsu.edu
const MOCK_USER2_ID = "00000000-0000-0000-0000-000000000002"; // alice@sfsu.edu
const MOCK_USER3_ID = "00000000-0000-0000-0000-000000000003"; // bob@sfsu.edu

const MOCK_GAME_ID       = "00000000-0000-0000-0000-000000000010"; // PLAYING
const MOCK_GAME2_ID      = "00000000-0000-0000-0000-000000000011"; // PLAYING
const MOCK_LOBBY_GAME_ID = "00000000-0000-0000-0000-000000000020"; // WAITING

// ---------------------------------------------------------------------------
// Seed
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding database...\n");

  await db.tx(async (t) => {

    // ── Truncate (FK-safe order) ───────────────────────────────────────────
    console.log("Truncating tables...");
    await t.none(`
      TRUNCATE messages, game_actions, game_cards, game_users, games, users
      RESTART IDENTITY CASCADE
    `);

    // ── Users ─────────────────────────────────────────────────────────────
    console.log("Seeding users...");
    const COST = 10;
    const hash = await bcrypt.hash("test", COST);

    await t.none(`
      INSERT INTO users (id, username, email, password, balance) VALUES
        ($1, 'test',  'test@sfsu.edu',  $4, 1000),
        ($2, 'alice', 'alice@sfsu.edu', $4, 500),
        ($3, 'bob',   'bob@sfsu.edu',   $4, 750)
    `, [MOCK_USER_ID, MOCK_USER2_ID, MOCK_USER3_ID, hash]);

    // ── Games ─────────────────────────────────────────────────────────────
    console.log("Seeding games...");
    await t.none(`
      INSERT INTO games
        (id, status, pot_amount, max_seats, small_blind, big_blind,
         last_raise_amount, deck_position, current_player_id)
      VALUES
        ($1, $4, 150, 6, 1, 2, 0, 9, $7),
        ($2, $4, 150, 6, 1, 2, 0, 9, $7),
        ($3, $5, 0,   6, 1, 2, 0, 0, NULL)
    `, [
      MOCK_GAME_ID, MOCK_GAME2_ID, MOCK_LOBBY_GAME_ID,
      GameStatus.PLAYING, GameStatus.WAITING,
      GameStatus.ENDED,   // unused but keeps index consistent
      MOCK_USER_ID,
    ]);

    // ── game_users ────────────────────────────────────────────────────────
    console.log("Seeding game_users...");
    await t.none(`
      INSERT INTO game_users
        (game_id, user_id, seat_no, balance, status, is_dealer, joined_at)
      VALUES
        ($1, $4, 1, 88,  $7, TRUE,  NOW()),
        ($1, $5, 2, 95,  $7, FALSE, NOW()),
        ($1, $6, 3, 100, $7, FALSE, NOW())
    `, [
      MOCK_GAME_ID,
      MOCK_GAME2_ID,      // unused placeholder
      MOCK_LOBBY_GAME_ID, // unused placeholder
      MOCK_USER_ID, MOCK_USER2_ID, MOCK_USER3_ID,
      UserStatus.ACTIVE,
    ]);

    // ── game_cards ────────────────────────────────────────────────────────
    console.log("Seeding game_cards...");
    await t.none(`
      INSERT INTO game_cards (game_id, position, card, location, user_id) VALUES
        ($1, 6, 12, $2, NULL),
        ($1, 7, 37, $2, NULL),
        ($1, 8,  4, $2, NULL),
        ($1, 0, 25, $3, $4),
        ($1, 1, 38, $3, $4)
    `, [
      MOCK_GAME_ID,
      CardLocation.COMMUNITY,
      CardLocation.HAND,
      MOCK_USER_ID,
    ]);

    // ── game_actions ──────────────────────────────────────────────────────
    console.log("Seeding game_actions...");
    await t.none(`
      INSERT INTO game_actions
        (game_id, user_id, action, amount, deck_position, created_at)
      VALUES
        ($1, $4, $6, NULL, 2, NOW()),
        ($1, $4, $7, 10,   6, NOW()),
        ($1, NULL, $8, NULL, 9, NOW())
    `, [
      MOCK_GAME_ID,
      MOCK_GAME2_ID,      // unused placeholder
      MOCK_LOBBY_GAME_ID, // unused placeholder
      MOCK_USER_ID,
      MOCK_USER2_ID,      // unused placeholder
      Action.DEAL_HAND,
      Action.BET,
      Action.DEAL_COMMUNITY,
    ]);

    // ── messages ──────────────────────────────────────────────────────────
    console.log("Seeding messages...");

    // Game chat
    await t.none(`
      INSERT INTO messages (user_from, game_id, body, created_at) VALUES
        ($1, $4, 'gl everyone', NOW()),
        ($2, $4, 'ty u2',       NOW()),
        ($3, $4, 'lets go',     NOW())
    `, [MOCK_USER_ID, MOCK_USER2_ID, MOCK_USER3_ID, MOCK_GAME_ID]);

    // DMs
    await t.none(`
      INSERT INTO messages (user_from, user_to, body, created_at) VALUES
        ($1, $2, 'gg last game', NOW()),
        ($2, $1, 'yeah wp',      NOW())
    `, [MOCK_USER_ID, MOCK_USER2_ID]);

  });

  console.log("\n✅ Seed complete");
  console.log("   Users:   test, alice, bob  (password: test)");
  console.log("   Games:   2x PLAYING, 1x WAITING");
  console.log("   Cards:   3 community + 2 hand cards in MOCK_GAME");
  console.log("   Actions: DEAL_HAND, BET, DEAL_COMMUNITY");
  console.log("   Messages: 3 game chat + 2 DMs");

  await db.$pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
