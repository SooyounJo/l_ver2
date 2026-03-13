import { useEffect, useMemo, useState } from 'react';
import styles from './scatteredTiles.module.css';

const MAX_TILES = 36;
const MIN_SIZE = 72;
const MAX_SIZE = 160;
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

export default function ScatteredTiles({ lastInputAt = 0, pauseMs = 2500 }) {
  const [urls, setUrls] = useState([]);
  const [paused, setPaused] = useState(false);

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

  const tiles = useMemo(() => {
    return urls.slice(0, MAX_TILES).map((src, i) => {
      const left = 2 + seededFloat(i * 7, 86);
      const top = 2 + seededFloat(i * 11 + 3, 86);
      const base = MIN_SIZE + Math.floor(seededFloat(i * 13 + 5, 1) * (MAX_SIZE - MIN_SIZE));
      const shape = seeded(i * 23, 3);
      const width = shape === 0 ? base : shape === 1 ? Math.round(base * (1.15 + seededFloat(i * 31, 0.5))) : Math.round(base * (0.6 + seededFloat(i * 37, 0.35)));
      const height = shape === 0 ? base : shape === 1 ? Math.round(base * (0.65 + seededFloat(i * 41, 0.35))) : Math.round(base * (1.2 + seededFloat(i * 43, 0.5)));
      const rotation = -14 + seededFloat(i * 17, 28);
      const animClass = styles[`anim${(i % ROUTINE_COUNT) + 1}`];
      const delay = seededFloat(i * 19, 8);
      return {
        src,
        left,
        top,
        width,
        height,
        rotation,
        animClass,
        delay,
      };
    });
  }, [urls]);

  return (
    <div className={`${styles.layer} ${paused ? styles.paused : ''}`} aria-hidden="true">
      {tiles.map((t, i) => (
        <img
          key={`${t.src}-${i}`}
          className={`${styles.tile} ${t.animClass}`}
          src={t.src}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            left: `${t.left}%`,
            top: `${t.top}%`,
            width: t.width,
            height: t.height,
            '--r': `${t.rotation}deg`,
            animationDelay: `-${t.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
