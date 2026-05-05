// Singleton WebSocket client.
// The useWebSocket hook owns the lifecycle; the store uses sendToServer() to
// push change events without needing a reference to the socket directly.

let _socket: WebSocket | null = null;

export function setSocket(ws: WebSocket | null): void {
  _socket = ws;
}

export function getSocket(): WebSocket | null {
  return _socket;
}

export function sendToServer(msg: object): void {
  if (_socket?.readyState === WebSocket.OPEN) {
    _socket.send(JSON.stringify(msg));
  }
}
