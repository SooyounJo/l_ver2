import { io } from 'socket.io-client';
import { SOCKET_PATH } from './events';

/**
 * Connects to the shared socket.io server used by this app.
 * Ensures `/api/socketio` is hit once so the server is initialized.
 */
export async function connectSocket(options = {}) {
  return io({
    path: SOCKET_PATH,
    ...options,
  });
}

