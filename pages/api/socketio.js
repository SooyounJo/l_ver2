import { Server } from 'socket.io';

function getIO(res) {
  const server = res.socket.server;
  if (!server.io) {
    const io = new Server(server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: '*',
      },
    });

    // 최근 전송 payload를 메모리에 저장 (서버 재시작 시 초기화됨)
    globalThis.__platforml_wall_last = globalThis.__platforml_wall_last || null;

    io.on('connection', (socket) => {
      if (globalThis.__platforml_wall_last) {
        socket.emit('wall:last', globalThis.__platforml_wall_last);
      }
      socket.on('disconnect', () => {});
    });

    server.io = io;
  }
  return server.io;
}

export default function handler(req, res) {
  getIO(res);
  res.status(200).json({ ok: true });
}

