import { useEffect, useRef } from 'react';
import { mountSynthTreeWall } from './synthTree/wallTreeMount';
import styles from './synthTreeWall.module.css';

const FILLER_COUNT = 180;

/**
 * SimpleSynthTree 포크 스타일 3D 나무 + 엽서 텍스처.
 * 카드 URL 우선, 부족 분은 random-public-image 풀.
 */
export default function SynthTreeWall({
  cards = [],
  lastInputAt = 0,
  archiveActive = false,
}) {
  const containerRef = useRef(null);
  const mountRef = useRef(null);
  const fillerUrlsRef = useRef([]);
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/random-public-image?count=${FILLER_COUNT}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.urls) ? data.urls : [];
        fillerUrlsRef.current = list.filter((u) => typeof u === 'string' && u.trim());
        mountRef.current?.rebuild?.();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const getCardUrls = () =>
      (cardsRef.current || [])
        .map((c) => (c && typeof c.imageUrl === 'string' ? c.imageUrl.trim() : ''))
        .filter(Boolean);

    const getFillerUrls = () => fillerUrlsRef.current;

    mountRef.current = mountSynthTreeWall(el, { getCardUrls, getFillerUrls });
    return () => {
      mountRef.current?.dispose?.();
      mountRef.current = null;
    };
  }, []);

  useEffect(() => {
    mountRef.current?.rebuild?.();
  }, [cards, lastInputAt]);

  useEffect(() => {
    mountRef.current?.setDimmed?.(archiveActive);
  }, [archiveActive]);

  return <div ref={containerRef} className={styles.synthRoot} aria-hidden="true" />;
}
