import { Router } from 'express';
import { pool } from '../db';
import { verifyToken, requireAdmin } from '../middleware/auth';
import type { Annotation } from '../types';

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const router = Router();

// All document routes require a valid JWT
router.use(verifyToken);

// GET /api/documents
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{
      id: string; name: string; updated_at: string; annotation_count: number;
    }>(`
      SELECT d.id, d.name, d.updated_at,
             COUNT(a.id) AS annotation_count
      FROM documents d
      LEFT JOIN annotations a ON a.doc_id = d.id
      GROUP BY d.id
      ORDER BY d.updated_at DESC
    `);
    res.json(rows.map((r) => ({
      id: r.id,
      name: r.name,
      updatedAt: r.updated_at,
      annotationCount: r.annotation_count,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/documents
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name?.trim()) {
      res.status(400).json({ message: 'name is required' });
      return;
    }
    const id = genId('doc');
    const content = `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n  \n</root>`;
    const { rows } = await pool.query<{
      id: string; name: string; content: string; updated_at: string;
    }>(
      'INSERT INTO documents (id, name, content) VALUES ($1, $2, $3) RETURNING id, name, content, updated_at',
      [id, name.trim(), content],
    );
    const d = rows[0];
    res.status(201).json({
      id: d.id,
      name: d.name,
      content: d.content,
      annotations: [],
      updatedAt: d.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { rows: docRows } = await pool.query<{
      id: string; name: string; content: string; updated_at: string;
    }>('SELECT id, name, content, updated_at FROM documents WHERE id = $1', [req.params.id]);

    if (!docRows[0]) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }
    const doc = docRows[0];

    const { rows: annRows } = await pool.query<{
      id: string; type: string; target: string;
      text: string; author: string; created_at: string;
    }>(
      'SELECT id, type, target, text, author, created_at FROM annotations WHERE doc_id = $1 ORDER BY created_at',
      [doc.id],
    );

    res.json({
      id: doc.id,
      name: doc.name,
      content: doc.content,
      annotations: annRows.map((r) => ({
        id: r.id,
        type: r.type,
        target: JSON.parse(r.target) as Annotation['target'],
        text: r.text,
        author: r.author,
        createdAt: r.created_at,
      })),
      updatedAt: doc.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/documents/:id  – update content
router.put('/:id', async (req, res, next) => {
  try {
    const { content } = req.body as { content?: string };
    if (content === undefined) {
      res.status(400).json({ message: 'content is required' });
      return;
    }
    const { rows } = await pool.query<{ updated_at: string }>(
      "UPDATE documents SET content = $1, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now') WHERE id = $2 RETURNING updated_at",
      [content, req.params.id],
    );
    if (!rows[0]) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }
    res.json({ updatedAt: rows[0].updated_at });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id  – admin only
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/annotations
router.get('/:id/annotations', async (req, res, next) => {
  try {
    const { rows } = await pool.query<{
      id: string; type: string; target: string;
      text: string; author: string; created_at: string;
    }>(
      'SELECT id, type, target, text, author, created_at FROM annotations WHERE doc_id = $1 ORDER BY created_at',
      [req.params.id],
    );
    res.json(rows.map((r) => ({
      id: r.id, type: r.type,
      target: JSON.parse(r.target) as Annotation['target'],
      text: r.text, author: r.author, createdAt: r.created_at,
    })));
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/:id/annotations
router.post('/:id/annotations', async (req, res, next) => {
  try {
    const ann = req.body as Annotation;
    if (!ann.id || !ann.type || !ann.text) {
      res.status(400).json({ message: 'id, type, and text are required' });
      return;
    }
    // Author is always the authenticated user – client-supplied value is ignored
    const author = req.user!.username;
    const createdAt = new Date().toISOString();
    await pool.query(
      'INSERT INTO annotations (id, doc_id, type, target, text, author, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [ann.id, req.params.id, ann.type, JSON.stringify(ann.target), ann.text, author, createdAt],
    );
    res.status(201).json({ ...ann, author, createdAt });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id/annotations/:annId
router.delete('/:id/annotations/:annId', async (req, res, next) => {
  try {
    await pool.query(
      'DELETE FROM annotations WHERE id = $1 AND doc_id = $2',
      [req.params.annId, req.params.id],
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
