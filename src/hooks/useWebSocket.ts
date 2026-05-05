import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useStore } from '../store/useStore';
import { getToken } from '../api/token';
import { setSocket } from '../ws/client';
import type { BroadcastMsg } from '../store/useStore';

// Derive the correct WS URL from the current page origin so the Vite dev-
// server proxy (and production deployments) work without configuration.
function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

const RECONNECT_DELAY_MS = 3000;

export function useWebSocket(): void {
  const currentUser = useAuthStore((s) => s.currentUser);
  const docId = useStore((s) => s.document?.id ?? null);
  const applyBroadcast = useStore((s) => s.applyBroadcast);

  const wsRef = useRef<WebSocket | null>(null);
  const docIdRef = useRef<string | null>(null);

  // Keep docIdRef in sync so reconnect/onopen can re-join the correct room
  useEffect(() => {
    docIdRef.current = docId;
  }, [docId]);

  // ── Main connection lifecycle ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) {
      wsRef.current?.close();
      wsRef.current = null;
      setSocket(null);
      return;
    }

    let mounted = true;
    const connectRef = { fn: () => {} }; // indirection for recursive reconnect

    function connect(): void {
      if (!mounted) return;
      const token = getToken();
      if (!token) return;

      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;
      setSocket(ws);

      ws.onopen = () => {
        // Authenticate the connection
        ws.send(JSON.stringify({ type: 'auth', token }));
        // Re-join document room if one was already open (e.g. after reconnect)
        if (docIdRef.current) {
          ws.send(JSON.stringify({ type: 'join_doc', docId: docIdRef.current }));
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as BroadcastMsg;
          if (
            msg.type === 'DOC_UPDATE' ||
            msg.type === 'ANNOTATION_ADD' ||
            msg.type === 'ANNOTATION_DELETE'
          ) {
            applyBroadcast(msg);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        setSocket(null);
        wsRef.current = null;
        if (mounted) {
          setTimeout(() => connectRef.fn(), RECONNECT_DELAY_MS);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connectRef.fn = connect;
    connect();

    return () => {
      mounted = false;
      wsRef.current?.close();
      wsRef.current = null;
      setSocket(null);
    };
  }, [currentUser, applyBroadcast]);

  // ── Document room join / leave ─────────────────────────────────────────────
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (docId) {
      ws.send(JSON.stringify({ type: 'join_doc', docId }));
    }

    return () => {
      if (docId && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave_doc', docId }));
      }
    };
  }, [docId]);
}
