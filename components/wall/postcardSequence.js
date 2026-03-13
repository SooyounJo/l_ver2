import { useEffect, useMemo, useRef, useState } from 'react';
import { getFirstDriveImageUrl } from '@/lib/driveImages';
import styles from './postcardSequence.module.css';

const FALLBACK_CARD_IMAGE = getFirstDriveImageUrl();

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

export default function PostcardSequence({ card }) {
  const [active, setActive] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle|enter|hold1|text|hold2|exit
  const [target, setTarget] = useState({ x: 0.5, y: 0.5 });
  const timersRef = useRef([]);
  const imageUrlRef = useRef(FALLBACK_CARD_IMAGE);

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

    imageUrlRef.current = (next.imageUrl && next.imageUrl.trim()) ? next.imageUrl : FALLBACK_CARD_IMAGE;

    setActive(next);
    setPhase('enter');

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    // Destination: deterministic random position on viewport (no tree)
    const seedBase = hashSeed(String(card.sentAt || Date.now()));
    const r1 = rand01(seedBase);
    const r2 = rand01(seedBase + 911);
    const xRatio = 0.1 + 0.8 * r1;
    const yRatio = 0.1 + 0.8 * r2;
    setTarget({ x: xRatio, y: yRatio });

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

