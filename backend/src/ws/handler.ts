import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { verifyWsToken } from '../middleware/auth';
import type { JwtPayload } from '../middleware/auth';
import type { Annotation } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

type C2SMsg =
  | { type: 'auth'; token: string }
  | { type: 'join_doc'; docId: string }
  | { type: 'leave_doc'; docId: string }
  | { type: 'presence_typing'; docId: string }
  | { type: 'doc_update'; docId: string; content: string; author: string }
  | { type: 'annotation_add'; docId: string; annotation: Annotation }
  | { type: 'annotation_delete'; docId: string; annotationId: string };

interface PresenceUser {
  username: string;
  color: string;
  status: 'viewing' | 'editing';
}

type S2CMsg =
  | { type: 'DOC_UPDATE'; docId: string; content: string; author: string }
  | { type: 'ANNOTATION_ADD'; docId: string; annotation: Annotation }
  | { type: 'ANNOTATION_DELETE'; docId: string; id: string }
  | { type: 'PRESENCE_UPDATE'; docId: string; users: PresenceUser[] }
  | { type: 'error'; message: string };

// ── Room registry ─────────────────────────────────────────────────────────────

// docId → set of connected clients in that document room
const rooms = new Map<string, Set<WebSocket>>();

// client metadata (userId / username / current room)
interface ClientMeta {
  user: JwtPayload | null;
  docId: string | null;
  status: 'viewing' | 'editing';
  typingTimer: ReturnType<typeof setTimeout> | null;
}
const clientMeta = new WeakMap<WebSocket, ClientMeta>();

const TYPING_TIMEOUT_MS = 2000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function send(ws: WebSocket, msg: S2CMsg): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function broadcast(docId: string, msg: S2CMsg, exclude?: WebSocket): void {
  const room = rooms.get(docId);
  if (!room) return;
  const payload = JSON.stringify(msg);
  for (const client of room) {
    if (client === exclude) continue;
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function buildPresenceList(docId: string): PresenceUser[] {
  const room = rooms.get(docId);
  if (!room) return [];
  const users: PresenceUser[] = [];
  for (const client of room) {
    const meta = clientMeta.get(client);
    if (meta?.user) {
      users.push({ username: meta.user.username, color: meta.user.color, status: meta.status });
    }
  }
  return users;
}

function broadcastPresence(docId: string): void {
  const room = rooms.get(docId);
  if (!room) return;
  const users = buildPresenceList(docId);
  const payload = JSON.stringify({ type: 'PRESENCE_UPDATE', docId, users } satisfies S2CMsg);
  for (const client of room) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function joinRoom(ws: WebSocket, docId: string): void {
  leaveCurrentRoom(ws);
  const meta = clientMeta.get(ws);
  if (meta) {
    meta.docId = docId;
    meta.status = 'viewing';
  }
  if (!rooms.has(docId)) rooms.set(docId, new Set());
  rooms.get(docId)!.add(ws);
  broadcastPresence(docId);
}

function leaveCurrentRoom(ws: WebSocket): void {
  const meta = clientMeta.get(ws);
  if (!meta?.docId) return;
  const prevDocId = meta.docId;
  const room = rooms.get(prevDocId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(prevDocId);
  }
  if (meta.typingTimer) {
    clearTimeout(meta.typingTimer);
    meta.typingTimer = null;
  }
  meta.docId = null;
  meta.status = 'viewing';
  // notify remaining users that this user left
  broadcastPresence(prevDocId);
}

// ── Setup ─────────────────────────────────────────────────────────────────────

export function setupWs(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    clientMeta.set(ws, { user: null, docId: null, status: 'viewing', typingTimer: null });

    ws.on('message', (raw) => {
      let msg: C2SMsg;
      try {
        msg = JSON.parse(raw.toString()) as C2SMsg;
      } catch {
        return;
      }

      const meta = clientMeta.get(ws)!;

      // ── Auth handshake ─────────────────────────────────────────────────────
      if (msg.type === 'auth') {
        const payload = verifyWsToken(msg.token);
        if (!payload) {
          send(ws, { type: 'error', message: 'Invalid or expired token' });
          return;
        }
        meta.user = payload;
        return;
      }

      // All other messages require a valid authenticated user
      if (!meta.user) {
        send(ws, { type: 'error', message: 'Not authenticated' });
        return;
      }

      // ── Room management ────────────────────────────────────────────────────
      if (msg.type === 'join_doc') {
        joinRoom(ws, msg.docId);
        return;
      }

      if (msg.type === 'leave_doc') {
        leaveCurrentRoom(ws);
        return;
      }

      // ── Presence ──────────────────────────────────────────────────────────
      if (msg.type === 'presence_typing') {
        if (!meta.docId) return;
        meta.status = 'editing';
        if (meta.typingTimer) clearTimeout(meta.typingTimer);
        meta.typingTimer = setTimeout(() => {
          meta.status = 'viewing';
          meta.typingTimer = null;
          if (meta.docId) broadcastPresence(meta.docId);
        }, TYPING_TIMEOUT_MS);
        broadcastPresence(meta.docId);
        return;
      }

      // ── Real-time broadcasts ───────────────────────────────────────────────
      if (msg.type === 'doc_update') {
        broadcast(
          msg.docId,
          { type: 'DOC_UPDATE', docId: msg.docId, content: msg.content, author: msg.author },
          ws, // exclude sender – they already applied the change locally
        );
        return;
      }

      if (msg.type === 'annotation_add') {
        broadcast(
          msg.docId,
          { type: 'ANNOTATION_ADD', docId: msg.docId, annotation: msg.annotation },
          ws,
        );
        return;
      }

      if (msg.type === 'annotation_delete') {
        broadcast(
          msg.docId,
          { type: 'ANNOTATION_DELETE', docId: msg.docId, id: msg.annotationId },
          ws,
        );
        return;
      }
    });

    ws.on('close', () => {
      leaveCurrentRoom(ws);
      clientMeta.delete(ws);
    });
  });
}
