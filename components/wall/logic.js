import { useEffect, useState } from 'react';
import { connectSocket } from '@/lib/socket/client';
import { EVENTS } from '@/lib/socket/events';

const PAUSE_TILES_MS = 2500;

export function useWallLogic() {
  const [status, setStatus] = useState('connecting');
  const [cards, setCards] = useState([]);
  const [lastInputAt, setLastInputAt] = useState(0);

  useEffect(() => {
    let socket;
    let cancelled = false;

    async function init() {
      if (cancelled) return;

      socket = await connectSocket();

      socket.on('connect', () => setStatus('connected'));
      socket.on('disconnect', () => setStatus('disconnected'));
      socket.on('connect_error', () => setStatus('error'));

      socket.on(EVENTS.WALL_LAST, (payload) => {
        if (!payload || typeof payload !== 'object') {
          setCards([]);
          return;
        }
        setLastInputAt(Date.now());
        setCards([payload]);
      });

      socket.on(EVENTS.CARD_SENT, (payload) => {
        if (!payload || typeof payload !== 'object') return;
        setLastInputAt(Date.now());
        setCards((prev) => {
          const next = {
            ...payload,
          };
          const existing = prev.some((c) => c && c.sentAt === next.sentAt);
          const merged = existing
            ? prev.map((c) => (c && c.sentAt === next.sentAt ? next : c))
            : [...prev, next];
          return merged.slice(-20);
        });
      });
    }

    init();

    return () => {
      cancelled = true;
      if (socket) socket.disconnect();
    };
  }, []);

  return { status, cards, lastInputAt, pauseTilesMs: PAUSE_TILES_MS };
}

