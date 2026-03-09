import "dotenv/config";
import pgPromise from "pg-promise";

const pgp = pgPromise();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const db = pgp({
  connectionString: DATABASE_URL,
});

export default db;
