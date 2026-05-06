import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { initDb } from './db';
import { seedIfEmpty } from './seed';
import authRouter from './routes/auth';
import documentsRouter from './routes/documents';
import usersRouter from './routes/users';
import { setupWs } from './ws/handler';

const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const app = express();

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// General rate limiter – 300 requests per 15 minutes per IP
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/users', usersRouter);

// Global error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: 'Internal server error' });
});

const server = http.createServer(app);
setupWs(server);

async function main(): Promise<void> {
  await initDb();
  await seedIfEmpty();
  server.listen(PORT, () => {
    console.log(`Backend listening on http://localhost:${PORT}`);
    console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
  });
}

main().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
