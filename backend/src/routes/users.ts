import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { verifyToken, requireAdmin } from '../middleware/auth';

const AVATAR_COLORS = [
  '#4f86c6', '#e07b39', '#5cb85c', '#9b59b6',
  '#e74c3c', '#1abc9c', '#f39c12', '#3498db',
];

const router = Router();

// All user-management routes require admin role
router.use(verifyToken, requireAdmin);

// GET /api/users
router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query<{
      id: string; username: string; role: string; color: string;
    }>('SELECT id, username, role, color FROM users ORDER BY username');
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST /api/users
router.post('/', async (req, res, next) => {
  try {
    const { username, password, role } = req.body as {
      username?: string; password?: string; role?: string;
    };
    if (!username?.trim() || !password?.trim() || !role) {
      res.status(400).json({ message: 'username, password, and role are required' });
      return;
    }

    const { rows: existing } = await pool.query<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)',
      [username],
    );
    if (existing[0]) {
      res.status(409).json({ message: `Użytkownik "${username}" już istnieje.` });
      return;
    }

    const { rows: countRows } = await pool.query<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const color = AVATAR_COLORS[countRows[0].count % AVATAR_COLORS.length];
    const hash = await bcrypt.hash(password, 10);
    const id = `u-${Date.now()}`;

    const { rows } = await pool.query<{
      id: string; username: string; role: string; color: string;
    }>(
      'INSERT INTO users (id, username, password_hash, role, color) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role, color',
      [id, username.trim(), hash, role, color],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const { rows: target } = await pool.query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1',
      [req.params.id],
    );
    if (!target[0]) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    if (target[0].role === 'admin') {
      const { rows: admins } = await pool.query<{ count: number }>(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'",
      );
      if (admins[0].count <= 1) {
        res.status(400).json({ message: 'Nie można usunąć ostatniego administratora.' });
        return;
      }
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
