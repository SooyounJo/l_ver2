import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

export function useWallLogic() {
  const [status, setStatus] = useState('connecting');
  const [card, setCard] = useState(null);

  useEffect(() => {
    let socket;
    let cancelled = false;

    async function init() {
      try {
        // init server
        await fetch('/api/socketio');
      } catch (_) {
        // ignore
      }

      if (cancelled) return;

      socket = io({
        path: '/api/socketio',
      });

      socket.on('connect', () => setStatus('connected'));
      socket.on('disconnect', () => setStatus('disconnected'));
      socket.on('connect_error', () => setStatus('error'));

      socket.on('wall:last', (payload) => {
        setCard(payload);
      });

      socket.on('card:sent', (payload) => {
        setCard(payload);
      });
    }

    init();

    return () => {
      cancelled = true;
      if (socket) socket.disconnect();
    };
  }, []);

  return { status, card };
}

