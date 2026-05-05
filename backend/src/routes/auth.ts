import { Router } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db';
import { signToken, verifyToken } from '../middleware/auth';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      res.status(400).json({ message: 'username and password are required' });
      return;
    }

    const { rows } = await pool.query<{
      id: string; username: string; password_hash: string; role: string; color: string;
    }>(
      'SELECT id, username, password_hash, role, color FROM users WHERE LOWER(username) = LOWER($1)',
      [username],
    );

    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
      return;
    }

    const token = signToken({ userId: user.id, username: user.username, role: user.role });
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role, color: user.color },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  – returns the current user from the JWT
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const { rows } = await pool.query<{
      id: string; username: string; role: string; color: string;
    }>(
      'SELECT id, username, role, color FROM users WHERE id = $1',
      [req.user!.userId],
    );
    if (!rows[0]) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
