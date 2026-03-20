import { useEffect, useMemo, useState } from 'react';
import styles from './scatteredTiles.module.css';

const MAX_TILES = 216; /* 108 × 2 */
const MIN_SIZE = 40;
const MAX_SIZE = 88;
const ROUTINE_COUNT = 6;

function seeded(i, max) {
  let h = (i * 2654435761) >>> 0;
  h = (h ^ (h >> 16)) * 0x85ebca6b;
  h = (h ^ (h >> 13)) * 0xc2b2ae35;
  return (h ^ (h >> 16)) % max;
}

function seededFloat(i, max) {
  return (seeded(i, 1e6) / 1e6) * max;
}

export default function ScatteredTiles({ lastInputAt = 0, pauseMs = 2500, burst = 'none', burstRunId = 0, archiveRunId = 0 }) {
  const [urls, setUrls] = useState([]);
  const [paused, setPaused] = useState(false);
  const [layoutMode, setLayoutMode] = useState('scatter'); // scatter|gather-lt|gather-rb|grid|grid-reveal

  useEffect(() => {
    if (!lastInputAt || lastInputAt <= 0) return;
    setPaused(true);
    const t = setTimeout(() => setPaused(false), pauseMs);
    return () => clearTimeout(t);
  }, [lastInputAt, pauseMs]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/random-public-image?count=${MAX_TILES}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.urls) ? data.urls : [];
        setUrls(list);
      })
      .catch(() => setUrls([]));
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (burst !== 'lt' && burst !== 'rb') return undefined;
    const nextMode = burst === 'lt' ? 'gather-lt' : 'gather-rb';
    setLayoutMode(nextMode);
    const t = setTimeout(() => setLayoutMode('scatter'), 2600);
    return () => clearTimeout(t);
  }, [burst, burstRunId]);

  useEffect(() => {
    if (!archiveRunId) return undefined;
    setLayoutMode('grid');
    const t1 = setTimeout(() => setLayoutMode('grid-reveal'), 2200);
    const t2 = setTimeout(() => setLayoutMode('scatter'), 14000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [archiveRunId]);

  const tiles = useMemo(() => {
    const pool = urls.slice(0, MAX_TILES);
    const count = pool.length || 1;
    const cols = Math.max(10, Math.ceil(Math.sqrt(count * 1.7)));
    const rows = Math.max(8, Math.ceil(count / cols));

    return pool.map((src, i) => {
      const left = 2 + seededFloat(i * 7, 86);
      const top = 2 + seededFloat(i * 11 + 3, 86);
      const base = MIN_SIZE + Math.floor(seededFloat(i * 13 + 5, 1) * (MAX_SIZE - MIN_SIZE));
      const shape = seeded(i * 23, 3);
      const width = shape === 0 ? base : shape === 1 ? Math.round(base * (1.15 + seededFloat(i * 31, 0.5))) : Math.round(base * (0.6 + seededFloat(i * 37, 0.35)));
      const height = shape === 0 ? base : shape === 1 ? Math.round(base * (0.65 + seededFloat(i * 41, 0.35))) : Math.round(base * (1.2 + seededFloat(i * 43, 0.5)));
      const col = i % cols;
      const row = Math.floor(i / cols);
      const gridLeft = cols <= 1 ? 50 : 2 + (96 * col) / (cols - 1);
      const gridTop = rows <= 1 ? 50 : 2 + (96 * row) / (rows - 1);

      const slotLeft =
        layoutMode === 'gather-lt'
          ? 2 + left * 0.18
          : layoutMode === 'gather-rb'
            ? 98 - (98 - left) * 0.18
            : layoutMode === 'grid' || layoutMode === 'grid-reveal'
              ? gridLeft
              : left;
      const slotTop =
        layoutMode === 'gather-lt'
          ? 2 + top * 0.18
          : layoutMode === 'gather-rb'
            ? 98 - (98 - top) * 0.18
            : layoutMode === 'grid' || layoutMode === 'grid-reveal'
              ? gridTop
              : top;

      const rotation = -14 + seededFloat(i * 17, 28);
      const animClass = styles[`anim${(i % ROUTINE_COUNT) + 1}`];
      const delay = seededFloat(i * 19, 8);
      const revealDelay = seededFloat(i * 47 + 13, 8);
      return {
        src,
        left: slotLeft,
        top: slotTop,
        width,
        height,
        rotation,
        animClass,
        delay,
        revealDelay,
      };
    });
  }, [urls, layoutMode]);

  const gridClass = layoutMode === 'grid' || layoutMode === 'grid-reveal' ? styles.gridMode : '';
  const gridRevealClass = layoutMode === 'grid-reveal' ? styles.gridReveal : '';
  const gatherClass = layoutMode === 'gather-lt' || layoutMode === 'gather-rb' ? styles.gatherMode : '';

  return (
    <div className={`${styles.layer} ${paused ? styles.paused : ''} ${gridClass} ${gridRevealClass} ${gatherClass}`} aria-hidden="true">
      {tiles.map((t, i) => (
        <div
          key={`${t.src}-${i}`}
          className={styles.tileSlot}
          style={{
            left: `${t.left}%`,
            top: `${t.top}%`,
            width: t.width,
            height: t.height,
            '--pop-delay': `${t.revealDelay}s`,
          }}
        >
          <img
            className={`${styles.tile} ${t.animClass}`}
            src={t.src}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              '--r': `${t.rotation}deg`,
              animationDelay: `-${t.delay}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
