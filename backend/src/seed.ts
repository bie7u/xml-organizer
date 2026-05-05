import bcrypt from 'bcrypt';
import { pool } from './db';

const SEED_USERS = [
  { id: 'u-admin', username: 'admin', password: 'admin', role: 'admin', color: '#e05555' },
  { id: 'u-alice', username: 'Alice', password: 'alice', role: 'user',  color: '#4f86c6' },
  { id: 'u-bob',   username: 'Bob',   password: 'bob',   role: 'user',  color: '#e07b39' },
  { id: 'u-carol', username: 'Carol', password: 'carol', role: 'user',  color: '#5cb85c' },
] as const;

const SEED_DOCS = [
  {
    id: 'doc-1',
    name: 'Project XML',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<project name="xml-organizer" version="1.0">
  <description>Collaborative XML editor POC</description>
  <team>
    <member role="lead">
      <name>Alice</name>
      <email>alice@example.com</email>
    </member>
    <member role="developer">
      <name>Bob</name>
      <email>bob@example.com</email>
    </member>
    <member role="tester">
      <name>Carol</name>
      <email>carol@example.com</email>
    </member>
  </team>
  <modules>
    <module id="editor" status="active">XML Editor</module>
    <module id="annotations" status="active">Annotation Engine</module>
    <module id="sync" status="active">Real-time Sync</module>
  </modules>
</project>`,
  },
  {
    id: 'doc-2',
    name: 'Config XML',
    content: `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <database>
    <host>localhost</host>
    <port>5432</port>
    <name>xml_organizer</name>
  </database>
  <server>
    <host>0.0.0.0</host>
    <port>3001</port>
  </server>
</config>`,
  },
] as const;

export async function seedIfEmpty(): Promise<void> {
  const { rows } = await pool.query<{ count: number }>('SELECT COUNT(*) as count FROM users');
  if (rows[0].count > 0) return;

  console.log('Seeding database with default users and documents…');

  for (const u of SEED_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      'INSERT INTO users (id, username, password_hash, role, color) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
      [u.id, u.username, hash, u.role, u.color],
    );
  }

  for (const d of SEED_DOCS) {
    await pool.query(
      'INSERT INTO documents (id, name, content) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
      [d.id, d.name, d.content],
    );
  }

  console.log('Seed complete.');
}
