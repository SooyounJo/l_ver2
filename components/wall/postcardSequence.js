import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './postcardSequence.module.css';

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function hashSeed(str) {
  const s = typeof str === 'string' ? str : '';
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 2147483647;
}

function rand01(seed) {
  // LCG
  let x = seed % 2147483647;
  x = (x * 48271) % 2147483647;
  return x / 2147483647;
}

function getFittedImageRect(srcW, srcH, maxW, maxH, canvasW, canvasH) {
  const ratio = Math.min(maxW / srcW, maxH / srcH);
  const w = srcW * ratio;
  const h = srcH * ratio;
  const x = (canvasW - w) * 0.5;
  const y = (canvasH - h) * 0.5;
  return { x, y, w, h };
}

export default function PostcardSequence({ card }) {
  const [active, setActive] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle|enter|hold1|text|hold2|exit
  const [target, setTarget] = useState({ x: 0.5, y: 0.5 });
  const timersRef = useRef([]);
  const imgSizeRef = useRef({ w: 1, h: 1 });
  const imageUrlRef = useRef('/img/PIPA2021000122_02.jpg');
  const TREE_URL = '/img/tree/tree.png';

  const imageUrl = useMemo(() => imageUrlRef.current, [active?.sentAt]);

  const text = useMemo(() => {
    const t = active?.text;
    return typeof t === 'string' ? t : '';
  }, [active]);

  useEffect(() => {
    if (!card || typeof card !== 'object') return;
    if (!card.sentAt) return;

    const next = {
      sentAt: card.sentAt,
      text: typeof card.text === 'string' ? card.text : '',
      imageUrl: typeof card.imageUrl === 'string' ? card.imageUrl : '',
    };

    imageUrlRef.current = next.imageUrl && next.imageUrl.startsWith('/img/') ? next.imageUrl : '/img/PIPA2021000122_02.jpg';

    setActive(next);
    setPhase('enter');

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    // Load tree image for destination mapping (only colored tree area, not white)
    const img = new Image();
    img.onload = () => {
      imgSizeRef.current = { w: img.naturalWidth || 1, h: img.naturalHeight || 1 };

      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      const fitted = getFittedImageRect(imgSizeRef.current.w, imgSizeRef.current.h, vw * 0.78, vh * 0.78, vw, vh);

      const canvas = document.createElement('canvas');
      canvas.width = imgSizeRef.current.w;
      canvas.height = imgSizeRef.current.h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setTarget({ x: 0.5, y: 0.5 });
        return;
      }
      ctx.drawImage(img, 0, 0);

      const seedBase = hashSeed(String(card.sentAt || Date.now()));
      let chosen = null;
      for (let i = 0; i < 12; i += 1) {
        const r1 = rand01(seedBase + i * 911);
        const r2 = rand01(seedBase + i * 1531);
        const px = fitted.x + fitted.w * (0.1 + 0.8 * r1);
        const py = fitted.y + fitted.h * (0.1 + 0.8 * r2);
        const u = clamp(Math.floor(((px - fitted.x) / fitted.w) * (imgSizeRef.current.w - 1)), 0, imgSizeRef.current.w - 1);
        const v = clamp(Math.floor(((py - fitted.y) / fitted.h) * (imgSizeRef.current.h - 1)), 0, imgSizeRef.current.h - 1);
        const data = ctx.getImageData(u, v, 1, 1).data;
        const brightness = 0.299 * data[0] + 0.587 * data[1] + 0.114 * data[2];
        // avoid near-white background; only keep colored tree-ish pixels
        if (brightness < 245) {
          chosen = { px, py };
          break;
        }
      }

      if (!chosen) {
        const px = fitted.x + fitted.w * 0.5;
        const py = fitted.y + fitted.h * 0.5;
        chosen = { px, py };
      }

      setTarget({ x: chosen.px / vw, y: chosen.py / vh });
    };
    img.onerror = () => {
      imgSizeRef.current = { w: 1, h: 1 };
      setTarget({ x: 0.5, y: 0.5 });
    };
    img.src = TREE_URL;

    // Timeline:
    // enter: opacity+position 2s, then text opacity, then 5s hold, then exit
    const enterMs = 2000;
    const textRiseMs = 600;
    const hold2Ms = 5000;
    const exitMs = 2600;

    const t1 = setTimeout(() => setPhase('text'), enterMs);
    const t2 = setTimeout(() => setPhase('hold2'), enterMs + textRiseMs);
    const t3 = setTimeout(() => setPhase('exit'), enterMs + textRiseMs + hold2Ms);

    timersRef.current.push(t1, t2, t3);

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.sentAt]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  if (!active) return null;

  const tx = clamp(target.x, 0, 1) * (typeof window !== 'undefined' ? window.innerWidth : 0);
  const ty = clamp(target.y, 0, 1) * (typeof window !== 'undefined' ? window.innerHeight : 0);

  return (
    <div
      className={styles.root}
      data-phase={phase}
      style={{
        '--target-x': `${tx}px`,
        '--target-y': `${ty}px`,
      }}
    >
      {active && (
        <div className={styles.card}>
        <div className={styles.imageWrap} aria-hidden="true">
          <img className={styles.image} src={imageUrl} alt="" />
        </div>

        <div className={styles.textLayer} aria-hidden={text ? 'false' : 'true'}>
          <div className={styles.text}>{text}</div>
        </div>
      </div>
      )}
    </div>
  );
}

