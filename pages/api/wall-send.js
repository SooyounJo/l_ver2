function getIO(res) {
  const server = res.socket.server;
  const io = server.io;
  return io || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ensure socket server initialized even if nobody visited /api/socketio yet
  if (!res.socket.server.io) {
    // lazy import to avoid loading socket.io unless needed
    const { Server } = await import('socket.io');
    const io = new Server(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: { origin: '*' },
    });
    globalThis.__platforml_wall_last = globalThis.__platforml_wall_last || null;
    io.on('connection', (socket) => {
      if (globalThis.__platforml_wall_last) {
        socket.emit('wall:last', globalThis.__platforml_wall_last);
      }
    });
    res.socket.server.io = io;
  }

  const io = getIO(res);
  if (!io) return res.status(200).json({ ok: false, warning: 'Socket server not initialized' });

  const payload = req.body && typeof req.body === 'object' ? req.body : {};
  const safePayload = {
    sentAt: Date.now(),
    text: typeof payload.text === 'string' ? payload.text : '',
    date: typeof payload.date === 'string' ? payload.date : '',
    imageUrl: typeof payload.imageUrl === 'string' ? payload.imageUrl : '',
  };

  globalThis.__platforml_wall_last = safePayload;
  io.emit('card:sent', safePayload);

  return res.status(200).json({ ok: true });
}

