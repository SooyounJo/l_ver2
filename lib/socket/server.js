import { EVENTS, SOCKET_PATH } from './events.js';

function ensureGlobals() {
  globalThis.__platforml_wall_last = globalThis.__platforml_wall_last || null;
}

function installHandlers(io) {
  ensureGlobals();

  io.on('connection', (socket) => {
    // send last known payloads for quick visual verification
    if (globalThis.__platforml_wall_last) {
      socket.emit(EVENTS.WALL_LAST, globalThis.__platforml_wall_last);
    }
  });
}

export async function ensureIO(server) {
  if (server.io) {
    if (!server.io.__platforml_handlers_installed) {
      installHandlers(server.io);
      server.io.__platforml_handlers_installed = true;
    }
    return server.io;
  }

  const { Server } = await import('socket.io');
  const io = new Server(server, {
    path: SOCKET_PATH,
    addTrailingSlash: false,
    cors: { origin: '*' },
  });

  installHandlers(io);
  io.__platforml_handlers_installed = true;
  server.io = io;
  return io;
}

