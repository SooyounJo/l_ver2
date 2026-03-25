import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './scatteredTiles.module.css';

const MAX_TILES = 216;
const MIN_SIZE = 40;
const MAX_SIZE = 88;
const ROUTINE_COUNT = 6;
const SNAP_EPS = 0.04;

function seeded(i, max) {
  let h = (i * 2654435761) >>> 0;
  h = (h ^ (h >> 16)) * 0x85ebca6b;
  h = (h ^ (h >> 13)) * 0xc2b2ae35;
  return (h ^ (h >> 16)) % max;
}

function seededFloat(i, max) {
  return (seeded(i, 1e6) / 1e6) * max;
}

function randomAccelPair() {
  let a1 = 0.02 + Math.random() * 0.08;
  let a2 = 0.02 + Math.random() * 0.08;
  if (Math.abs(a1 - a2) < 0.015) {
    a2 = a1 + (Math.random() > 0.5 ? 0.04 : -0.04);
  }
  a1 = Math.max(0.02, Math.min(0.1, a1));
  a2 = Math.max(0.02, Math.min(0.1, a2));
  return [a1, a2];
}

function buildScatterDest(i) {
  const left = 2 + seededFloat(i * 7, 86);
  const top = 2 + seededFloat(i * 11 + 3, 86);
  return { x: left, y: top };
}

function buildTileStatic(i, src) {
  const base = MIN_SIZE + Math.floor(seededFloat(i * 13 + 5, 1) * (MAX_SIZE - MIN_SIZE));
  const shape = seeded(i * 23, 3);
  const width =
    shape === 0 ? base : shape === 1 ? Math.round(base * (1.15 + seededFloat(i * 31, 0.5))) : Math.round(base * (0.6 + seededFloat(i * 37, 0.35)));
  const height =
    shape === 0 ? base : shape === 1 ? Math.round(base * (0.65 + seededFloat(i * 41, 0.35))) : Math.round(base * (1.2 + seededFloat(i * 43, 0.5)));
  const rotation = 0;
  const animClass = styles[`anim${(i % ROUTINE_COUNT) + 1}`];
  const delay = seededFloat(i * 19, 8);
  const revealDelay = seededFloat(i * 47 + 13, 8);
  return { width, height, rotation, animClass, delay, revealDelay, src };
}

function gridDims(count) {
  /* 열 수를 줄여 행 수를 늘리면 세로 간격(행간)이 촘촘해짐 */
  const cols = Math.max(12, Math.ceil(Math.sqrt(count * 1.05)));
  const rows = Math.max(8, Math.ceil(count / cols));
  return { cols, rows };
}

function gridDestination(i, cols, rows, variant) {
  const col = i % cols;
  const row = Math.floor(i / cols);
  let gridLeft = cols <= 1 ? 50 : 2 + (96 * col) / (cols - 1);
  let gridTop = rows <= 1 ? 50 : 2 + (96 * row) / (rows - 1);
  /* variant 1: 좌우 미러만 (틸트/지그재그 없이 같은 그리드) */
  if (variant === 1) {
    gridLeft = 100 - gridLeft;
  }
  return { x: gridLeft, y: gridTop };
}

/** 그리드 모드: 셀 크기 통일 + 스캐터 시 원래 크기 복구 */
function applyUniformGridSizing(tiles, cols, rows, gridActive) {
  if (!tiles.length) return;
  if (gridActive) {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
    const cellW = (vw * 0.94) / Math.max(cols, 1);
    const cellH = (vh * 0.94) / Math.max(rows, 1);
    const s = Math.floor(Math.min(cellW, cellH) * 0.96);
    const size = Math.max(MIN_SIZE, Math.min(Math.round(s), MAX_SIZE + 40));
    for (let i = 0; i < tiles.length; i += 1) {
      const t = tiles[i];
      if (t._scatterW == null) {
        t._scatterW = t.width;
        t._scatterH = t.height;
      }
      t.width = size;
      t.height = size;
    }
  } else {
    for (let i = 0; i < tiles.length; i += 1) {
      const t = tiles[i];
      if (t._scatterW != null) {
        t.width = t._scatterW;
        t.height = t._scatterH;
      }
    }
  }
}

function gatherDest(scatterX, scatterY, mode) {
  if (mode === 'gather-lt') {
    return { x: 2 + scatterX * 0.18, y: 2 + scatterY * 0.18 };
  }
  if (mode === 'gather-rb') {
    return { x: 98 - (98 - scatterX) * 0.18, y: 98 - (98 - scatterY) * 0.18 };
  }
  return { x: scatterX, y: scatterY };
}

export default function ScatteredTiles({
  lastInputAt = 0,
  pauseMs = 2500,
  burst = 'none',
  burstRunId = 0,
  archiveRunId = 0,
  gridVariant = 0,
}) {
  const [urls, setUrls] = useState([]);
  const [paused, setPaused] = useState(false);
  const [layoutMode, setLayoutMode] = useState('scatter');
  const [tick, setTick] = useState(0);
  const [tilesReady, setTilesReady] = useState(false);

  const tilesRef = useRef([]);
  const rafRef = useRef(null);
  const layoutModeRef = useRef('scatter');
  const lastBurstProcessedRef = useRef(-1);
  const lastArchiveProcessedRef = useRef(-1);
  const colsRowsRef = useRef({ cols: 10, rows: 8 });

  useEffect(() => {
    layoutModeRef.current = layoutMode;
  }, [layoutMode]);

  useEffect(() => {
    if (!lastInputAt || lastInputAt <= 0) return undefined;
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
    return () => {
      cancelled = true;
    };
  }, []);

  const pool = useMemo(() => urls.slice(0, MAX_TILES), [urls]);
  const count = pool.length || 1;
  const { cols, rows } = useMemo(() => gridDims(count), [count]);

  useEffect(() => {
    colsRowsRef.current = { cols, rows };
  }, [cols, rows]);

  const applyDestinations = useCallback((mode, variantIndex) => {
    const tiles = tilesRef.current;
    if (!tiles.length) return;
    const { cols: gc, rows: gr } = colsRowsRef.current;
    const gridActive = mode === 'grid' || mode === 'grid-reveal';
    applyUniformGridSizing(tiles, gc, gr, gridActive);
    for (let i = 0; i < tiles.length; i += 1) {
      const t = tiles[i];
      const sc = buildScatterDest(t.index);
      let dest = sc;
      if (gridActive) {
        dest = gridDestination(t.index, gc, gr, variantIndex);
      } else if (mode === 'gather-lt' || mode === 'gather-rb') {
        dest = gatherDest(sc.x, sc.y, mode);
      } else {
        dest = sc;
      }
      t.desX = dest.x;
      t.desY = dest.y;
      const [a1, a2] = randomAccelPair();
      t.a1 = a1;
      t.a2 = a2;
    }
    setTick((x) => x + 1);
  }, []);

  useEffect(() => {
    if (!pool.length) {
      tilesRef.current = [];
      setTilesReady(false);
      return;
    }
    const tiles = pool.map((src, i) => {
      const st = buildTileStatic(i, src);
      const sc = buildScatterDest(i);
      const [a1, a2] = randomAccelPair();
      return {
        index: i,
        src,
        posX: sc.x + (seededFloat(i * 101, 20) - 10),
        posY: sc.y + (seededFloat(i * 103, 20) - 10),
        desX: sc.x,
        desY: sc.y,
        a1,
        a2,
        ...st,
      };
    });
    tilesRef.current = tiles;
    colsRowsRef.current = { cols, rows };
    applyDestinations('scatter', 0);
    setTilesReady(true);
    setTick((x) => x + 1);
  }, [pool, cols, rows, applyDestinations]);

  const step = useCallback(() => {
    if (paused) {
      rafRef.current = requestAnimationFrame(step);
      return;
    }
    const tiles = tilesRef.current;
    let changed = false;
    for (let i = 0; i < tiles.length; i += 1) {
      const t = tiles[i];
      const dx = t.desX - t.posX;
      const dy = t.desY - t.posY;
      if (Math.abs(dx) < SNAP_EPS && Math.abs(dy) < SNAP_EPS) {
        if (t.posX !== t.desX || t.posY !== t.desY) {
          t.posX = t.desX;
          t.posY = t.desY;
          changed = true;
        }
        continue;
      }
      t.posX += t.a1 * dx;
      t.posY += t.a2 * dy;
      changed = true;
    }
    if (changed) setTick((x) => x + 1);
    rafRef.current = requestAnimationFrame(step);
  }, [paused]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [step]);

  useEffect(() => {
    if (burst !== 'lt' && burst !== 'rb') return undefined;
    if (burstRunId === lastBurstProcessedRef.current) return undefined;
    lastBurstProcessedRef.current = burstRunId;
    const mode = burst === 'lt' ? 'gather-lt' : 'gather-rb';
    setLayoutMode(mode);
    applyDestinations(mode, gridVariant);
    const t = setTimeout(() => {
      setLayoutMode('scatter');
      applyDestinations('scatter', gridVariant);
    }, 2600);
    return () => clearTimeout(t);
  }, [burst, burstRunId, applyDestinations, gridVariant]);

  useEffect(() => {
    if (!archiveRunId) return undefined;
    if (archiveRunId === lastArchiveProcessedRef.current) return undefined;
    lastArchiveProcessedRef.current = archiveRunId;

    setLayoutMode('grid');
    applyDestinations('grid', gridVariant);
    const t1 = setTimeout(() => {
      setLayoutMode('grid-reveal');
    }, 2800);
    const t2 = setTimeout(() => {
      setLayoutMode('scatter');
      applyDestinations('scatter', gridVariant);
    }, 20000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [archiveRunId, gridVariant, applyDestinations]);

  const gridClass = layoutMode === 'grid' || layoutMode === 'grid-reveal' ? styles.gridMode : '';
  const gridRevealClass = layoutMode === 'grid-reveal' ? styles.gridReveal : '';
  const gatherClass = layoutMode === 'gather-lt' || layoutMode === 'gather-rb' ? styles.gatherMode : '';

  const tiles = tilesRef.current;

  if (!tilesReady || !tiles.length) {
    return <div className={styles.layer} aria-hidden="true" />;
  }

  return (
    <div
      className={`${styles.layer} ${paused ? styles.paused : ''} ${gridClass} ${gridRevealClass} ${gatherClass}`}
      data-tick={tick}
      aria-hidden="true"
    >
      {tiles.map((t, i) => (
        <div
          key={`tile-${i}-${t.src}`}
          className={styles.tileSlot}
          style={{
            left: `${t.posX}%`,
            top: `${t.posY}%`,
            width: t.width,
            height: t.height,
            '--pop-delay': `${t.revealDelay}s`,
            transition: 'none',
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
