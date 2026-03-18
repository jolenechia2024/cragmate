import dotenv from "dotenv";
import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index";

const { Pool } = pg;

// In production/serverless, DATABASE_URL should be injected via env vars.
// In local dev, load it from the repo-root .env if it's missing.
if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(process.cwd(), ".env");
  dotenv.config({ path: envPath, override: true });
}


if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}


export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
