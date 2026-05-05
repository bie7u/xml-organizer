import { Pool } from 'pg';

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/xml_organizer',
});

export async function initDb(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            VARCHAR(36)  PRIMARY KEY,
      username      VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role          VARCHAR(10)  NOT NULL DEFAULT 'user',
      color         VARCHAR(20)  NOT NULL DEFAULT '#4f86c6',
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS documents (
      id         VARCHAR(36)  PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      content    TEXT         NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS annotations (
      id         VARCHAR(36)  PRIMARY KEY,
      doc_id     VARCHAR(36)  NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      type       VARCHAR(20)  NOT NULL,
      target     JSONB        NOT NULL,
      text       TEXT         NOT NULL,
      author     VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_annotations_doc_id ON annotations(doc_id);
  `);
}
