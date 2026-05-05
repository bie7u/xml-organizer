import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH =
  process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'xml_organizer.db');

// Ensure the data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(DB_PATH);

// WAL mode for better concurrent read performance; enforce FK constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Thin pg-compatible pool shim
//
// Routes call `await pool.query<T>(sql, params)` which returns `{ rows: T[] }`.
// better-sqlite3 is synchronous, but `await` on a plain value resolves
// immediately, so the async/await usage in routes works without any changes.
//
// The shim converts pg-style `$1 $2 ...` placeholders to SQLite `?` and
// dispatches to `.all()` (for SELECT / RETURNING) or `.run()` (DML).
// ---------------------------------------------------------------------------
type QueryResult<T> = { rows: T[] };

export const pool = {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): QueryResult<T> {
    const normalized = sql.replace(/\$\d+/g, '?');
    const stmt = db.prepare(normalized);
    if (/^\s*(SELECT|WITH)/i.test(normalized) || /RETURNING/i.test(normalized)) {
      return { rows: stmt.all(...(params ?? [])) as T[] };
    }
    stmt.run(...(params ?? []));
    return { rows: [] };
  },
};

export async function initDb(): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'user',
      color         TEXT NOT NULL DEFAULT '#4f86c6',
      created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id         TEXT PRIMARY KEY,
      doc_id     TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      type       TEXT NOT NULL,
      target     TEXT NOT NULL,
      text       TEXT NOT NULL,
      author     TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_annotations_doc_id ON annotations(doc_id);
  `);
}
