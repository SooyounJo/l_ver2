import { useEffect, useRef, useState } from 'react';
import styles from './archiveSpotlight.module.css';

export default function ArchiveSpotlight({ cards = [], runId = 0, active = false, textOverride = '' }) {
  const [items, setItems] = useState([]);
  const timersRef = useRef([]);

  useEffect(() => {
    if (!active || !runId) return undefined;

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    setItems([]);

    const candidates = cards
      .filter((c) => c && typeof c === 'object')
      .slice(-16)
      .map((c, idx) => ({
        id: `${runId}-${c.sentAt || idx}-${idx}`,
        imageUrl: typeof c.imageUrl === 'string' ? c.imageUrl : '',
        text: typeof c.text === 'string' ? c.text : '',
      }))
      .filter((c) => c.imageUrl);
    const maxItems = 5;
    const GRID_COUNT = 216;
    const cols = Math.max(10, Math.ceil(Math.sqrt(GRID_COUNT * 1.7)));
    const rows = Math.max(8, Math.ceil(GRID_COUNT / cols));

    function gridLeftPct(col) {
      return cols <= 1 ? 50 : 2 + (96 * col) / (cols - 1);
    }
    function gridTopPct(row) {
      return rows <= 1 ? 50 : 2 + (96 * row) / (rows - 1);
    }
    const ITEM_DURATION_MS = 7200;
    // 다음 카드 시작 시점: 직전 카드가 중앙에서 충분히 멈춘 뒤(약 5초 hold) 돌아가기 시작할 때쯤
    const ITEM_NEXT_START_MS = 6100;
    const BASE_DELAY_MS = 2000;

    async function run() {
      // 입력이 아예 없으면: 랜덤 엽서 5장(텍스트는 빈 값)
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
            // 좌->우 순서로 "그리드 기존 자리"에서 출발
            const index = i;
            const col = index % cols;
            const row = Math.floor(index / cols);
            const startLeft = gridLeftPct(col);
            const startTop = gridTopPct(row);
            const dx = 50 - startLeft;
            const dy = 50 - startTop;

            const t = setTimeout(() => {
              setItems((prev) => [
                ...prev,
                { ...entry, startLeft, startTop, dx, dy },
              ]);
              const removeT = setTimeout(() => {
                setItems((prev) => prev.filter((p) => p.id !== entry.id));
              }, ITEM_DURATION_MS);
              timersRef.current.push(removeT);
            }, i * ITEM_NEXT_START_MS + BASE_DELAY_MS);
            timersRef.current.push(t);
          });
        } catch (_) {
          // ignore
        }
        return;
      }

      // 입력이 있으면: 고유 imageUrl 기준으로 사용자 엽서를 담고, 5장 미만이면 사용자와 겹치지 않는 랜덤으로 채움 (같은 이미지 복제 금지)
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
        // 좌->우 순서로 "그리드 기존 자리"에서 출발
        const index = i;
        const col = index % cols;
        const row = Math.floor(index / cols);
        const startLeft = gridLeftPct(col);
        const startTop = gridTopPct(row);
        const dx = 50 - startLeft;
        const dy = 50 - startTop;

        const t = setTimeout(() => {
          setItems((prev) => [
            ...prev,
            {
              ...entry,
              startLeft,
              startTop,
              dx,
              dy,
              text: textOverride && typeof textOverride === 'string' ? textOverride : entry.text,
            },
          ]);
          const removeT = setTimeout(() => {
            setItems((prev) => prev.filter((p) => p.id !== entry.id));
          }, ITEM_DURATION_MS);
          timersRef.current.push(removeT);
        }, i * ITEM_NEXT_START_MS + BASE_DELAY_MS);
        timersRef.current.push(t);
      });
    }

    run();

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      setItems([]);
    };
  }, [active, runId, cards, textOverride]);

  if (!active) return null;
  if (!items.length) return null;

  return (
    <div className={styles.layer} aria-hidden="true">
      {items.map((it) => (
        <div
          key={it.id}
          className={styles.item}
          style={{
            left: `${it.startLeft}%`,
            top: `${it.startTop}%`,
            '--dx': `${it.dx}`,
            '--dy': `${it.dy}`,
          }}
        >
          <img className={styles.image} src={it.imageUrl} alt="" />
          <div className={styles.text}>{it.text}</div>
        </div>
      ))}
    </div>
  );
}

