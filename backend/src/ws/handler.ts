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
  | { type: 'doc_update'; docId: string; content: string; author: string }
  | { type: 'annotation_add'; docId: string; annotation: Annotation }
  | { type: 'annotation_delete'; docId: string; annotationId: string };

type S2CMsg =
  | { type: 'DOC_UPDATE'; docId: string; content: string; author: string }
  | { type: 'ANNOTATION_ADD'; docId: string; annotation: Annotation }
  | { type: 'ANNOTATION_DELETE'; docId: string; id: string }
  | { type: 'error'; message: string };

// ── Room registry ─────────────────────────────────────────────────────────────

// docId → set of connected clients in that document room
const rooms = new Map<string, Set<WebSocket>>();

// client metadata (userId / username / current room)
interface ClientMeta {
  user: JwtPayload | null;
  docId: string | null;
}
const clientMeta = new WeakMap<WebSocket, ClientMeta>();

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

function joinRoom(ws: WebSocket, docId: string): void {
  leaveCurrentRoom(ws);
  const meta = clientMeta.get(ws);
  if (meta) meta.docId = docId;
  if (!rooms.has(docId)) rooms.set(docId, new Set());
  rooms.get(docId)!.add(ws);
}

function leaveCurrentRoom(ws: WebSocket): void {
  const meta = clientMeta.get(ws);
  if (!meta?.docId) return;
  const room = rooms.get(meta.docId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(meta.docId);
  }
  meta.docId = null;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

export function setupWs(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    clientMeta.set(ws, { user: null, docId: null });

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
