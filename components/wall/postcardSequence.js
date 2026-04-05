import { useEffect, useMemo, useRef, useState } from 'react';
import { getFirstDriveImageUrl } from '@/lib/driveImages';
import styles from './postcardSequence.module.css';

const FALLBACK_CARD_IMAGE = getFirstDriveImageUrl();

/** 진입~퇴장까지(퇴장 transition 포함) 대략 길이 — 아카이빙 다음 카드 간격에 사용 */
export const POSTCARD_SEQUENCE_CYCLE_MS = 1200 + 360 + 2600 + 1600;

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

/** 나무 캐노피·엽서 군집 대략 영역(화면 비율 0~1). wallTreeMount screenOrigin 하단 배치에 맞춤 */
const TREE_CLUSTER_X_MIN = 0.32;
const TREE_CLUSTER_X_MAX = 0.68;
const TREE_CLUSTER_Y_MIN = 0.28;
const TREE_CLUSTER_Y_MAX = 0.58;

export default function PostcardSequence({ card, entryOrigin = 'input' }) {
  const [active, setActive] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle|enter|text|hold2|exit
  const [target, setTarget] = useState({ x: 0.5, y: 0.5 });
  const [treeOrigin, setTreeOrigin] = useState({ x: 0.5, y: 0.4 });
  const [cardScale, setCardScale] = useState(0.7);
  const [imageAspect, setImageAspect] = useState('16 / 9');
  const [typedText, setTypedText] = useState('');
  const typingTimerRef = useRef(null);
  const typingIndexRef = useRef(0);
  const typingSourceRef = useRef('');
  const typingSessionRef = useRef(null);
  const timersRef = useRef([]);
  const imageUrlRef = useRef(FALLBACK_CARD_IMAGE);

  const imageUrl = imageUrlRef.current;

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
    setImageAspect('16 / 9');

    setActive(next);
    setPhase('enter');
    // reset typing when new card arrives
    typingSessionRef.current = null;
    if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    typingTimerRef.current = null;
    typingIndexRef.current = 0;
    typingSourceRef.current = '';
    setTypedText('');
    setTypedText('');

    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];

    const seedBase = hashSeed(String(card.sentAt || Date.now()));
    const r1 = rand01(seedBase);
    const r2 = rand01(seedBase + 911);
    const r3 = rand01(seedBase + 1777);
    const r4 = rand01(seedBase + 333);
    const r5 = rand01(seedBase + 777);
    const clusterX = TREE_CLUSTER_X_MIN + (TREE_CLUSTER_X_MAX - TREE_CLUSTER_X_MIN) * r4;
    const clusterY = TREE_CLUSTER_Y_MIN + (TREE_CLUSTER_Y_MAX - TREE_CLUSTER_Y_MIN) * r5;
    // Keep postcard size below previous max while allowing natural size variation.
    setCardScale(0.5 + 0.28 * r3);

    if (entryOrigin === 'archive') {
      // 진입·퇴장 모두 같은 나무 군집 좌표(들어올 때 튀어나오고, 나갈 때 그쪽으로 들어감)
      setTreeOrigin({ x: clusterX, y: clusterY });
      setTarget({ x: clusterX, y: clusterY });
    } else {
      const xRatio = 0.1 + 0.8 * r1;
      const yRatio = 0.1 + 0.8 * r2;
      setTarget({ x: xRatio, y: yRatio });
      setTreeOrigin({ x: 0.5, y: 0.5 });
    }

    // Timeline:
    // enter: opacity+position 2s, then text opacity, then 5s hold, then exit
    const enterMs = 1200;
    const textRiseMs = 360;
    const hold2Ms = 2600;
    const t1 = setTimeout(() => setPhase('text'), enterMs);
    const t2 = setTimeout(() => setPhase('hold2'), enterMs + textRiseMs);
    const t3 = setTimeout(() => setPhase('exit'), enterMs + textRiseMs + hold2Ms);

    timersRef.current.push(t1, t2, t3);

    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.sentAt, entryOrigin]);

  useEffect(() => {
    if (!active) return undefined;

    const sessionId = active?.sentAt;
    if (!sessionId && sessionId !== 0) return undefined;

    // Start typing when entering the visible "text" phase; keep going through hold2.
    if (phase === 'text' && typingSessionRef.current !== sessionId) {
      const source = (text || '').trim();
      typingSessionRef.current = sessionId;
      typingIndexRef.current = 0;
      typingSourceRef.current = source;
      setTypedText('');

      if (!source) return undefined;

      typingTimerRef.current = setInterval(() => {
        typingIndexRef.current += 1;
        const next = typingSourceRef.current.slice(0, typingIndexRef.current);
        setTypedText(next);
        if (typingIndexRef.current >= typingSourceRef.current.length) {
          if (typingTimerRef.current) clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
      }, 26);
    }

    // Stop typing when exiting the whole card.
    if (phase === 'exit' && typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
      typingSessionRef.current = null;
    }

    return undefined;
  }, [phase, text, active]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current = [];
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    };
  }, []);

  if (!active) return null;

  const tx = clamp(target.x, 0, 1) * (typeof window !== 'undefined' ? window.innerWidth : 0);
  const ty = clamp(target.y, 0, 1) * (typeof window !== 'undefined' ? window.innerHeight : 0);
  const handleImageLoad = (e) => {
    const w = e?.currentTarget?.naturalWidth || 0;
    const h = e?.currentTarget?.naturalHeight || 0;
    if (w > 0 && h > 0) setImageAspect(`${w} / ${h}`);
  };

  return (
    <div
      className={styles.root}
      data-phase={phase}
      data-entry={entryOrigin}
      style={{
        '--target-x': `${tx}px`,
        '--target-y': `${ty}px`,
        '--card-scale': String(cardScale),
        ...(entryOrigin === 'archive'
          ? {
              '--tree-origin-x': String(treeOrigin.x),
              '--tree-origin-y': String(treeOrigin.y),
            }
          : {}),
      }}
    >
      <div className={styles.cardBlock}>
        <div className={styles.card}>
          <div className={styles.postcardSheet}>
            <div className={styles.imageWrap} aria-hidden="true" style={{ '--img-aspect': imageAspect }}>
              <img className={styles.image} src={imageUrl} alt="" onLoad={handleImageLoad} />
            </div>
            <div className={styles.textStrip}>
              <div className={styles.floatingText} aria-hidden={text ? 'false' : 'true'}>
                {typedText || text}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

