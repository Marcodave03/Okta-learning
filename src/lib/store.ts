// Storage layer. Uses MySQL when DATABASE_URL is set (production / Vercel),
// otherwise JSON files in ./data (local development without a database).
import { promises as fs } from "fs";
import path from "path";
import mysql from "mysql2/promise";
import seedQuestions from "../../data/questions.json";
import { SCHEMA, UPSERT_QUESTION, questionToRow } from "./schema";
import { DEFAULT_SETTINGS, sanitizeSettings } from "./settings";
import type { Attempt, AttemptItem, AttemptSummary, NewAttempt, Question, TestSettings } from "./types";

export const SEED_QUESTIONS = seedQuestions as Question[];

export interface Store {
  kind: "mysql" | "local";
  getQuestions(): Promise<Question[]>;
  syncQuestions(): Promise<number>;
  getSettings(): Promise<TestSettings>;
  saveSettings(settings: TestSettings): Promise<TestSettings>;
  listAttempts(): Promise<AttemptSummary[]>;
  getAttempt(id: number): Promise<Attempt | null>;
  createAttempt(attempt: NewAttempt): Promise<number>;
  deleteAttempt(id: number): Promise<void>;
}

export function getStore(): Store {
  return process.env.DATABASE_URL ? mysqlStore : localStore;
}

export class StorageError extends Error {}

/* ---------------------------------------------------------------- local --- */

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const ATTEMPTS_FILE = path.join(DATA_DIR, "attempts.json");

interface AttemptsFile {
  nextId: number;
  attempts: Attempt[];
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(file: string, data: unknown) {
  try {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(data, null, 2));
  } catch (err) {
    throw new StorageError(
      `Could not write ${path.basename(file)} (${(err as Error).message}). ` +
        "Local JSON storage only works on your own machine — set DATABASE_URL to use MySQL.",
    );
  }
}

const summarize = ({ id, name, score, total, percent, passed, durationSec, createdAt }: Attempt): AttemptSummary => ({
  id, name, score, total, percent, passed, durationSec, createdAt,
});

const localStore: Store = {
  kind: "local",
  async getQuestions() {
    return SEED_QUESTIONS;
  },
  async syncQuestions() {
    return SEED_QUESTIONS.length;
  },
  async getSettings() {
    return sanitizeSettings(await readJson(SETTINGS_FILE, DEFAULT_SETTINGS));
  },
  async saveSettings(settings) {
    await writeJson(SETTINGS_FILE, settings);
    return settings;
  },
  async listAttempts() {
    const { attempts } = await readJson<AttemptsFile>(ATTEMPTS_FILE, { nextId: 1, attempts: [] });
    return attempts.map(summarize).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async getAttempt(id) {
    const { attempts } = await readJson<AttemptsFile>(ATTEMPTS_FILE, { nextId: 1, attempts: [] });
    return attempts.find((a) => a.id === id) ?? null;
  },
  async createAttempt(attempt) {
    const file = await readJson<AttemptsFile>(ATTEMPTS_FILE, { nextId: 1, attempts: [] });
    const id = file.nextId;
    file.attempts.push({ ...attempt, id, createdAt: new Date().toISOString() });
    file.nextId = id + 1;
    await writeJson(ATTEMPTS_FILE, file);
    return id;
  },
  async deleteAttempt(id) {
    const file = await readJson<AttemptsFile>(ATTEMPTS_FILE, { nextId: 1, attempts: [] });
    file.attempts = file.attempts.filter((a) => a.id !== id);
    await writeJson(ATTEMPTS_FILE, file);
  },
};

/* ---------------------------------------------------------------- mysql --- */

type Row = mysql.RowDataPacket;

const globalForDb = globalThis as unknown as { okPool?: mysql.Pool; okReady?: Promise<void> };

function pool(): mysql.Pool {
  if (!globalForDb.okPool) {
    const url = process.env.DATABASE_URL!;
    const host = new URL(url).hostname;
    const local = host === "localhost" || host === "127.0.0.1";
    const useSsl = process.env.DATABASE_SSL ? process.env.DATABASE_SSL !== "false" : !local;
    globalForDb.okPool = mysql.createPool({
      uri: url,
      connectionLimit: 5,
      timezone: "Z",
      ssl: useSsl
        ? { minVersion: "TLSv1.2", rejectUnauthorized: true, ...(process.env.DATABASE_SSL_CA ? { ca: process.env.DATABASE_SSL_CA.replace(/\\n/g, "\n") } : {}) }
        : undefined,
    });
  }
  return globalForDb.okPool;
}

/** Creates tables and seeds the question bank once per server instance. */
function ready(): Promise<void> {
  globalForDb.okReady ??= (async () => {
    const db = pool();
    for (const sql of SCHEMA) await db.query(sql);
    const [rows] = await db.query<Row[]>("SELECT COUNT(*) AS n FROM questions");
    if (Number(rows[0].n) === 0) await upsertQuestions(db);
  })().catch((err) => {
    globalForDb.okReady = undefined;
    throw err;
  });
  return globalForDb.okReady;
}

async function upsertQuestions(db: mysql.Pool) {
  for (const q of SEED_QUESTIONS) await db.execute(UPSERT_QUESTION, questionToRow(q));
}

// MySQL returns JSON columns parsed; MariaDB returns them as strings.
const parse = <T>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : v) as T;

function rowToQuestion(r: Row): Question {
  return {
    id: r.id,
    topic: r.topic,
    type: r.type,
    context: parse(r.context),
    log: parse(r.log),
    images: parse(r.images),
    imageCaptions: parse(r.image_captions),
    prompt: r.prompt,
    ...(r.pairs != null ? { pairs: parse(r.pairs) } : { options: parse(r.options), correct: parse(r.correct) }),
    explanation: r.explanation,
    corrected: Boolean(r.corrected),
  };
}

function rowToSummary(r: Row): AttemptSummary {
  return {
    id: r.id,
    name: r.name,
    score: r.score,
    total: r.total,
    percent: Number(r.percent),
    passed: Boolean(r.passed),
    durationSec: r.duration_sec,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

const mysqlStore: Store = {
  kind: "mysql",
  async getQuestions() {
    await ready();
    const [rows] = await pool().query<Row[]>("SELECT * FROM questions ORDER BY id");
    return rows.map(rowToQuestion);
  },
  async syncQuestions() {
    await ready();
    const db = pool();
    await upsertQuestions(db);
    const ids = SEED_QUESTIONS.map((q) => q.id);
    await db.query("DELETE FROM questions WHERE id NOT IN (?)", [ids]);
    return ids.length;
  },
  async getSettings() {
    await ready();
    const [rows] = await pool().query<Row[]>("SELECT data FROM settings WHERE id = 1");
    return sanitizeSettings(rows[0] ? parse(rows[0].data) : DEFAULT_SETTINGS);
  },
  async saveSettings(settings) {
    await ready();
    await pool().execute(
      "INSERT INTO settings (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
      [JSON.stringify(settings)],
    );
    return settings;
  },
  async listAttempts() {
    await ready();
    const [rows] = await pool().query<Row[]>(
      "SELECT id, name, score, total, percent, passed, duration_sec, created_at FROM attempts ORDER BY created_at DESC, id DESC",
    );
    return rows.map(rowToSummary);
  },
  async getAttempt(id) {
    await ready();
    const db = pool();
    const [rows] = await db.query<Row[]>("SELECT * FROM attempts WHERE id = ?", [id]);
    if (!rows[0]) return null;
    const [answers] = await db.query<Row[]>(
      "SELECT * FROM attempt_answers WHERE attempt_id = ? ORDER BY position",
      [id],
    );
    const items: AttemptItem[] = answers.map((a) => ({
      question: parse(a.question),
      order: parse(a.display_order),
      rightChoices: parse(a.right_choices),
      answer: parse(a.answer),
      isCorrect: Boolean(a.is_correct),
    }));
    return { ...rowToSummary(rows[0]), settings: sanitizeSettings(parse(rows[0].settings)), items };
  },
  async createAttempt(a) {
    await ready();
    const conn = await pool().getConnection();
    try {
      await conn.beginTransaction();
      const [res] = await conn.execute<mysql.ResultSetHeader>(
        `INSERT INTO attempts (name, score, total, percent, passed, duration_sec, settings, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [a.name, a.score, a.total, a.percent, a.passed ? 1 : 0, a.durationSec, JSON.stringify(a.settings), new Date()],
      );
      const id = res.insertId;
      if (a.items.length) {
        await conn.query(
          `INSERT INTO attempt_answers
            (attempt_id, position, question_id, question, display_order, right_choices, answer, is_correct) VALUES ?`,
          [a.items.map((it, i) => [
            id, i, it.question.id, JSON.stringify(it.question), JSON.stringify(it.order),
            JSON.stringify(it.rightChoices), JSON.stringify(it.answer), it.isCorrect ? 1 : 0,
          ])],
        );
      }
      await conn.commit();
      return id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
  async deleteAttempt(id) {
    await ready();
    const db = pool();
    await db.execute("DELETE FROM attempt_answers WHERE attempt_id = ?", [id]);
    await db.execute("DELETE FROM attempts WHERE id = ?", [id]);
  },
};
