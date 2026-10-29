// Creates the MySQL tables and loads data/questions.json into the questions table.
// Usage: npm run db:setup   (reads DATABASE_URL from .env.local / .env or the environment)
// The app also does this automatically on its first request, so this is optional.
import { readFileSync, existsSync } from "node:fs";
import mysql from "mysql2/promise";
import { SCHEMA, UPSERT_QUESTION, questionToRow } from "../src/lib/schema.ts";

for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add it to .env.local, e.g. mysql://user:pass@host:3306/okta_prep");
  process.exit(1);
}

const host = new URL(url).hostname;
const local = host === "localhost" || host === "127.0.0.1";
const useSsl = process.env.DATABASE_SSL ? process.env.DATABASE_SSL !== "false" : !local;

const db = await mysql.createConnection({
  uri: url,
  timezone: "Z",
  ssl: useSsl
    ? { minVersion: "TLSv1.2", rejectUnauthorized: true, ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n") } : {}) }
    : undefined,
});

try {
  for (const sql of SCHEMA) await db.query(sql);
  console.log("Tables ready.");

  const questions = JSON.parse(readFileSync(new URL("../data/questions.json", import.meta.url), "utf8"));
  for (const q of questions) await db.execute(UPSERT_QUESTION, questionToRow(q));
  await db.query("DELETE FROM questions WHERE id NOT IN (?)", [questions.map((q) => q.id)]);
  console.log(`Loaded ${questions.length} questions.`);
} finally {
  await db.end();
}
