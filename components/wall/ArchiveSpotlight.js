import { useEffect, useRef, useState } from 'react';
import PostcardSequence from './postcardSequence';

/** PostcardSequence 한 사이클(진입~퇴장) 대략 길이 — 다음 카드와 겹치지 않게 간격 확보 */
const ARCHIVE_CARD_GAP_MS = 6800;
const BASE_DELAY_MS = 2000;
const maxItems = 5;

export default function ArchiveSpotlight({ cards = [], runId = 0, active = false, textOverride = '' }) {
  const [playbackCard, setPlaybackCard] = useState(null);
  const timersRef = useRef([]);

  useEffect(() => {
    if (!active || !runId) {
      setPlaybackCard(null);
      return undefined;
    }

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setPlaybackCard(null);

    const candidates = cards
      .filter((c) => c && typeof c === 'object')
      .slice(-16)
      .map((c, idx) => ({
        id: `${runId}-${c.sentAt || idx}-${idx}`,
        imageUrl: typeof c.imageUrl === 'string' ? c.imageUrl : '',
        text: typeof c.text === 'string' ? c.text : '',
      }))
      .filter((c) => c.imageUrl);

    async function run() {
      if (!candidates.length) {
        try {
          const r = await fetch(`/api/random-public-image?count=${maxItems}`);
          const data = await r.json().catch(() => ({}));
          const urls = Array.isArray(data?.urls) ? data.urls : [];
          const queueBase = urls.slice(0, maxItems).map((imageUrl, i) => ({
            id: `${runId}-fallback-${i}`,
            imageUrl,
            text: '',
          }));

          queueBase.forEach((entry, i) => {
            if (!entry.imageUrl) return;
            const t = setTimeout(() => {
              const sentAt = runId * 1_000_000 + i * 100_000 + Date.now();
              setPlaybackCard({
                sentAt,
                imageUrl: entry.imageUrl,
                text: '',
              });
            }, i * ARCHIVE_CARD_GAP_MS + BASE_DELAY_MS);
            timersRef.current.push(t);
          });
        } catch (_) {
          // ignore
        }
        return;
      }

      const urlSeen = new Set();
      const userUniqueInOrder = [];
      for (const c of candidates) {
        const u = (c.imageUrl || '').trim();
        if (!u || urlSeen.has(u)) continue;
        urlSeen.add(u);
        userUniqueInOrder.push(c);
      }
      const userTake = userUniqueInOrder.slice(-maxItems);

      const usedUrls = new Set(userTake.map((c) => (c.imageUrl || '').trim()).filter(Boolean));
      const needFill = Math.max(0, maxItems - userTake.length);
      const fillers = [];
      if (needFill > 0) {
        try {
          const r = await fetch(`/api/random-public-image?count=${needFill + 16}`);
          const data = await r.json().catch(() => ({}));
          const urls = Array.isArray(data?.urls) ? data.urls : [];
          for (const raw of urls) {
            const u = typeof raw === 'string' ? raw.trim() : '';
            if (!u || usedUrls.has(u)) continue;
            usedUrls.add(u);
            fillers.push({
              id: `${runId}-fill-${fillers.length}`,
              imageUrl: u,
              text: '',
            });
            if (fillers.length >= needFill) break;
          }
        } catch (_) {
          // ignore
        }
      }

      const queue = [
        ...userTake.map((c, i) => ({
          id: `${runId}-user-${c.sentAt ?? i}-${i}`,
          imageUrl: (c.imageUrl || '').trim(),
          text: typeof c.text === 'string' ? c.text : '',
        })),
        ...fillers,
      ].slice(0, maxItems);

      queue.forEach((entry, i) => {
        if (!entry.imageUrl) return;
        const t = setTimeout(() => {
          const sentAt = runId * 1_000_000 + i * 100_000 + Date.now();
          const text =
            textOverride && typeof textOverride === 'string' ? textOverride.trim() : (entry.text || '').trim();
          setPlaybackCard({
            sentAt,
            imageUrl: entry.imageUrl,
            text,
          });
        }, i * ARCHIVE_CARD_GAP_MS + BASE_DELAY_MS);
        timersRef.current.push(t);
      });
    }

    run();

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      setPlaybackCard(null);
    };
  }, [active, runId, cards, textOverride]);

  if (!active || !playbackCard || !playbackCard.sentAt) return null;

  return <PostcardSequence key={playbackCard.sentAt} card={playbackCard} entryOrigin="archive" />;
}
