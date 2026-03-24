import { useEffect, useRef, useState } from 'react';
import { connectSocket } from '@/lib/socket/client';
import { EVENTS } from '@/lib/socket/events';

function attachReloadListener(socket) {
  if (!socket || socket.__platforml_reload_listener) return;
  socket.__platforml_reload_listener = true;
  socket.on(EVENTS.RELOAD_ALL, () => {
    if (typeof window !== 'undefined') window.location.reload();
  });
}

const PAUSE_TILES_MS = 2500;
const TILES_BURST_INTERVAL_MS = 5 * 60 * 1000;
/** 그리드 정렬 + 아카이빙 주기 (1분) */
const ARCHIVE_INTERVAL_MS = 60 * 1000;
const ARCHIVE_ACTIVE_MS = 42000;

export function useWallLogic() {
  const [status, setStatus] = useState('connecting');
  const [cards, setCards] = useState([]);
  const [lastInputAt, setLastInputAt] = useState(0);
  const [tilesBurst, setTilesBurst] = useState('none'); // none|lt|rb
  const [burstRunId, setBurstRunId] = useState(0);
  const [archiveRunId, setArchiveRunId] = useState(0);
  const [archiveActive, setArchiveActive] = useState(false);
  const [archiveTextOverride, setArchiveTextOverride] = useState('');
  /** 0: 균일 그리드, 1: 번갈아 지그재그 배치 */
  const [gridVariant, setGridVariant] = useState(0);
  const lastArchivedSentAtRef = useRef(null);
  const cardsRef = useRef([]);
  const burstTimeoutRef = useRef(null);
  const archiveActiveTimeoutRef = useRef(null);

  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  useEffect(() => {
    let socket;
    let cancelled = false;

    async function init() {
      if (cancelled) return;

      socket = await connectSocket();
      attachReloadListener(socket);

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

  useEffect(() => {
    let cancelled = false;
    let corner = 'lt';

    function trigger() {
      if (cancelled) return;
      setTilesBurst(corner);
      setBurstRunId((v) => v + 1);
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
      const clearT = setTimeout(() => {
        if (!cancelled) setTilesBurst('none');
      }, 4500);
      burstTimeoutRef.current = clearT;
      corner = corner === 'lt' ? 'rb' : 'lt';
      return clearT;
    }

    // start soon, then every 5 minutes
    const t0 = setTimeout(() => trigger(), 2000);
    const id = setInterval(() => trigger(), TILES_BURST_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(t0);
      clearInterval(id);
      if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const id = setInterval(() => {
      if (cancelled) return;
      const list = cardsRef.current;
      const latest = list && list.length ? list[list.length - 1] : null;
      const sentAt = latest && (typeof latest.sentAt === 'number' || typeof latest.sentAt === 'string') ? latest.sentAt : null;

      setGridVariant((v) => (v + 1) % 2);
      setArchiveTextOverride('');
      setArchiveRunId((v) => v + 1);
      setArchiveActive(true);
      if (archiveActiveTimeoutRef.current) clearTimeout(archiveActiveTimeoutRef.current);
      archiveActiveTimeoutRef.current = setTimeout(() => setArchiveActive(false), ARCHIVE_ACTIVE_MS);

      if (sentAt != null && lastArchivedSentAtRef.current !== sentAt) {
        lastArchivedSentAtRef.current = sentAt;
        try {
          fetch('/api/log-interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: typeof latest.text === 'string' ? latest.text : '',
              imageUrl: typeof latest.imageUrl === 'string' ? latest.imageUrl : '',
            }),
            keepalive: true,
          }).catch(() => {});
        } catch (_) {}
      }
    }, ARCHIVE_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      if (archiveActiveTimeoutRef.current) clearTimeout(archiveActiveTimeoutRef.current);
    };
  }, []);

  const triggerBurstLT = () => {
    setTilesBurst('lt');
    setBurstRunId((v) => v + 1);
    if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = setTimeout(() => setTilesBurst('none'), 4500);
  };

  const triggerBurstRB = () => {
    setTilesBurst('rb');
    setBurstRunId((v) => v + 1);
    if (burstTimeoutRef.current) clearTimeout(burstTimeoutRef.current);
    burstTimeoutRef.current = setTimeout(() => setTilesBurst('none'), 4500);
  };

  const triggerArchiveNow = (overrideText) => {
    setArchiveTextOverride(typeof overrideText === 'string' ? overrideText : '');
    setGridVariant((v) => (v + 1) % 2);
    setArchiveRunId((v) => v + 1);
    setArchiveActive(true);
    if (archiveActiveTimeoutRef.current) clearTimeout(archiveActiveTimeoutRef.current);
    archiveActiveTimeoutRef.current = setTimeout(() => setArchiveActive(false), ARCHIVE_ACTIVE_MS);
  };

  const triggerTestMobileInput = (overrideText) => {
    // Test용: 모바일에서 엽서 슬라이드로 보냈던 "큰 엽서" 모션을 바로 재현
    setArchiveTextOverride('');
    setArchiveActive(false);
    setLastInputAt(Date.now());

    (async () => {
      try {
        const r = await fetch('/api/random-public-image?count=1');
        const data = await r.json().catch(() => ({}));
        const url = typeof data?.url === 'string' ? data.url : Array.isArray(data?.urls) ? data.urls[0] : null;
        setCards([
          {
            sentAt: Date.now(),
            text: typeof overrideText === 'string' ? overrideText : '행복한 하루',
            imageUrl: url || '',
          },
        ]);
      } catch (_) {
        setCards([
          {
            sentAt: Date.now(),
            text: typeof overrideText === 'string' ? overrideText : '행복한 하루',
            imageUrl: '',
          },
        ]);
      }
    })();
  };

  return {
    status,
    cards,
    lastInputAt,
    pauseTilesMs: PAUSE_TILES_MS,
    tilesBurst,
    burstRunId,
    archiveRunId,
    archiveActive,
    archiveTextOverride,
    triggerBurstLT,
    triggerBurstRB,
    triggerArchiveNow,
    triggerTestMobileInput,
    gridVariant,
  };
}

