import "dotenv/config";
import pgPromise, { IDatabase, IMain } from "pg-promise";

const pgp: IMain = pgPromise();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const db: IDatabase<Record<string, never>> = pgp({
  connectionString: DATABASE_URL,
});

export default db;
