import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';
import bcrypt from 'bcrypt';

export const shorthands: ColumnDefinitions | undefined = undefined;

const credentials = [
  { id: '00000000-0000-0000-0000-000000000001', username: 'test',  email: 'test@sfsu.edu',  password: 'test', balance: 1000 },
  { id: '00000000-0000-0000-0000-000000000002', username: 'user1', email: 'user1@sfsu.edu', password: 'test', balance: 500  },
  { id: '00000000-0000-0000-0000-000000000003', username: 'user2', email: 'user2@sfsu.edu', password: 'test', balance: 750  },
];

export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const cred of credentials) {
    const hashed = await bcrypt.hash(cred.password, 10);
    pgm.sql(`
      INSERT INTO users (id, username, email, password, balance, created_at)
      VALUES (
        '${cred.id}',
        '${cred.username}',
        '${cred.email}',
        '${hashed}',
        ${cred.balance},
        '2026-03-27T00:00:00.000Z'
      )
      ON CONFLICT (id) DO UPDATE SET password = EXCLUDED.password;
    `);
  }

  pgm.sql(`
    INSERT INTO games (id, status, pot_amount, max_seats, small_blind, big_blind, last_raise_amount, deck_position, current_player_id, created_at, updated_at)
    VALUES
      ('00000000-0000-0000-0000-000000000010', 1, 150, 6, 1, 2, 0, 9, '00000000-0000-0000-0000-000000000001', '2026-03-27T00:00:00.000Z', '2026-03-27T00:00:00.000Z'),
      ('00000000-0000-0000-0000-000000000011', 1, 150, 6, 1, 2, 0, 9, '00000000-0000-0000-0000-000000000001', '2026-03-27T00:00:00.000Z', '2026-03-27T00:00:00.000Z'),
      ('00000000-0000-0000-0000-000000000020', 0, 0,   6, 1, 2, 0, 0, NULL, '2026-03-27T00:00:00.000Z', '2026-03-27T00:00:00.000Z')
    ON CONFLICT (id) DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO game_users (game_id, user_id, seat_no, balance, status, is_dealer, joined_at)
    VALUES
      ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 1, 88,  0, true,  '2026-03-27T00:00:00.000Z'),
      ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 2, 95,  0, false, '2026-03-27T00:00:00.000Z'),
      ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003', 3, 100, 0, false, '2026-03-27T00:00:00.000Z')
    ON CONFLICT DO NOTHING;
  `);

  pgm.sql(`
    INSERT INTO messages (user_from, game_id, user_to, body, created_at)
    VALUES
      ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', NULL, 'gl everyone', '2026-03-27T00:00:00.000Z'),
      ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', NULL, 'ty u2',       '2026-03-27T00:00:00.000Z'),
      ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000010', NULL, 'lets go',     '2026-03-27T00:00:00.000Z'),
      ('00000000-0000-0000-0000-000000000001', NULL, '00000000-0000-0000-0000-000000000002', 'gg last game', '2026-03-27T00:00:00.000Z'),
      ('00000000-0000-0000-0000-000000000002', NULL, '00000000-0000-0000-0000-000000000001', 'yeah wp',     '2026-03-27T00:00:00.000Z')
    ON CONFLICT DO NOTHING;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`DELETE FROM messages WHERE user_from IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003');`);
  pgm.sql(`DELETE FROM game_users WHERE game_id IN ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000020');`);
  pgm.sql(`DELETE FROM games WHERE id IN ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000020');`);
  pgm.sql(`DELETE FROM users WHERE id IN ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003');`);
}
