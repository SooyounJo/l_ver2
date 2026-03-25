import { useEffect, useRef, useState } from 'react';
import { pickArchiveFillerTexts } from '@/lib/archiveFillerQuotes';
import { POSTCARD_QUOTE_MAX_CHARS } from '@/lib/postcardQuoteLimit';
import PostcardSequence, { POSTCARD_SEQUENCE_CYCLE_MS } from './postcardSequence';

const maxItems = 5;
/** 한 장 끝난 뒤 다음 장까지 여유 (겹침 방지) */
const ARCHIVE_GAP_AFTER_CYCLE_MS = 900;
const ARCHIVE_CARD_GAP_MS = POSTCARD_SEQUENCE_CYCLE_MS + ARCHIVE_GAP_AFTER_CYCLE_MS;
const BASE_DELAY_MS = 2000;

function normalizeCard(c) {
  return {
    sentAt: c?.sentAt,
    imageUrl: typeof c?.imageUrl === 'string' ? c.imageUrl : '',
    text: typeof c?.text === 'string' ? c.text : '',
  };
}

/** 사용자 인풋(텍스트 있음) 우선 → 최신 sentAt 우선. imageUrl 기준 중복 제거(앞선 우선). */
function buildUserQueue(cards, max) {
  const raw = (cards || [])
    .filter((c) => c && typeof c === 'object')
    .slice(-24)
    .map((c) => normalizeCard(c));

  raw.sort((a, b) => {
    const ah = (a.text || '').trim() ? 1 : 0;
    const bh = (b.text || '').trim() ? 1 : 0;
    if (bh !== ah) return bh - ah;
    const sa = Number(a.sentAt) || 0;
    const sb = Number(b.sentAt) || 0;
    return sb - sa;
  });

  const seenUrl = new Set();
  const unique = [];
  for (const c of raw) {
    const u = (c.imageUrl || '').trim();
    if (!u || seenUrl.has(u)) continue;
    seenUrl.add(u);
    unique.push(c);
    if (unique.length >= max) break;
  }
  return unique;
}

/** 텍스트 없는 카드에만 임의 문구 부여(사용자 입력은 앞 단계에서 우선 배치됨). */
function fillEmptyTexts(cards) {
  const list = (cards || []).filter(Boolean);
  const need = list.filter((c) => !String(c.text || '').trim()).length;
  if (need === 0) {
    return list.map((c) => ({
      ...c,
      text: String(c.text || '').trim().slice(0, POSTCARD_QUOTE_MAX_CHARS),
    }));
  }
  const fillers = pickArchiveFillerTexts(need);
  let fi = 0;
  return list.map((c) => {
    const t = String(c.text || '').trim();
    if (t) return { ...c, text: t.slice(0, POSTCARD_QUOTE_MAX_CHARS) };
    return { ...c, text: fillers[fi++] || pickArchiveFillerTexts(1)[0] || '' };
  });
}

export default function ArchiveSpotlight({ cards = [], runId = 0, active = false, textOverride = '' }) {
  const [playbackCard, setPlaybackCard] = useState(null);
  const timersRef = useRef([]);
  const cardsRef = useRef(cards);

  cardsRef.current = cards;

  useEffect(() => {
    if (!active || !runId) {
      setPlaybackCard(null);
      return undefined;
    }

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setPlaybackCard(null);

    const snapshot = cardsRef.current || [];
    const userQueue = buildUserQueue(snapshot, maxItems);

    async function run() {
      if (!userQueue.length) {
        try {
          const r = await fetch(`/api/random-public-image?count=${maxItems}`);
          const data = await r.json().catch(() => ({}));
          const rawUrls = Array.isArray(data?.urls) ? data.urls : [];
          const urls = rawUrls
            .slice(0, maxItems)
            .map((u) => (typeof u === 'string' ? u.trim() : ''))
            .filter(Boolean);
          const texts = pickArchiveFillerTexts(urls.length);

          let delay = BASE_DELAY_MS;
          urls.forEach((imageUrl, i) => {
            const t = setTimeout(() => {
              const sentAt = runId * 1_000_000 + i * 100_000 + Date.now();
              setPlaybackCard({
                sentAt,
                imageUrl,
                text: texts[i] || '',
              });
            }, delay);
            timersRef.current.push(t);
            delay += ARCHIVE_CARD_GAP_MS;
          });
        } catch (_) {
          // ignore
        }
        return;
      }

      const usedUrls = new Set(userQueue.map((c) => (c.imageUrl || '').trim()).filter(Boolean));
      const needFill = Math.max(0, maxItems - userQueue.length);
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
            fillers.push({ imageUrl: u, text: '' });
            if (fillers.length >= needFill) break;
          }
        } catch (_) {
          // ignore
        }
      }

      const queue = fillEmptyTexts([...userQueue, ...fillers].slice(0, maxItems));

      let delay = BASE_DELAY_MS;
      queue.forEach((entry, i) => {
        if (!(entry.imageUrl || '').trim()) return;
        const t = setTimeout(() => {
          const sentAt = runId * 1_000_000 + i * 100_000 + Date.now();
          const text =
            textOverride && typeof textOverride === 'string'
              ? textOverride.trim()
              : (entry.text || '').trim();
          setPlaybackCard({
            sentAt,
            imageUrl: (entry.imageUrl || '').trim(),
            text,
          });
        }, delay);
        timersRef.current.push(t);
        delay += ARCHIVE_CARD_GAP_MS;
      });
    }

    run();

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      setPlaybackCard(null);
    };
    // cards는 ref로만 읽음 — 배열 참조가 바뀔 때마다 타이머가 리셋되며 두 장 겹침이 나기 쉬움
  }, [active, runId, textOverride]);

  if (!active || !playbackCard || !playbackCard.sentAt) return null;

  return <PostcardSequence key={playbackCard.sentAt} card={playbackCard} entryOrigin="archive" />;
}
