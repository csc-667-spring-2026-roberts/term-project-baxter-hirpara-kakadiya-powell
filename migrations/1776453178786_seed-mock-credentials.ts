import { ColumnDefinitions, MigrationBuilder } from 'node-pg-migrate';
import bcrypt from 'bcrypt';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  const credentials = [
    { username: 'test', email: 'test@sfsu.edu', password: 'test' },
    { username: 'user1', email: 'user1@sfsu.edu', password: 'test' },
    { username: 'user2', email: 'user2@sfsu.edu', password: 'test' },
  ];

  for (const cred of credentials) {
    const hashed = await bcrypt.hash(cred.password, 10);
    pgm.sql(`
      INSERT INTO users (username, email, password, balance)
      VALUES ('${cred.username}', '${cred.email}', '${hashed}', 1000)
      ON CONFLICT (email) DO UPDATE SET password = EXCLUDED.password;
    `);
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    DELETE FROM users WHERE email IN (
      'test@sfsu.edu',
      'user1@sfsu.edu',
      'user2@sfsu.edu'
    );
  `);
}
