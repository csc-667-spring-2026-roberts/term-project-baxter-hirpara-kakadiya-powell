import "dotenv/config";
import pgPromise, { IDatabase, IMain } from "pg-promise";

const pgp: IMain = pgPromise();

// receive types from pg-promise as expected
// SOURCE: https://github.com/vitaly-t/pg-promise/wiki/BigInt
pgp.pg.types.setTypeParser(1700, parseFloat);
pgp.pg.types.setTypeParser(20, BigInt);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const db: IDatabase<Record<string, never>> = pgp({
  connectionString: DATABASE_URL,
});

export default db;
