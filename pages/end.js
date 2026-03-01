import Head from 'next/head';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

const imgCardFront = 'https://www.figma.com/api/mcp/asset/4e65a0b4-ac2b-4825-9528-e185f30b0887';
const imgCardBack = 'https://www.figma.com/api/mcp/asset/1e942af0-dbf6-4155-b3da-952595d7ab1f';
const imgArrowFrame = 'https://www.figma.com/api/mcp/asset/12e3e69b-1d2f-4bb5-835d-355f89712ca3';

export default function End() {
  const router = useRouter();
  const [scale, setScale] = useState(1);
  const [flipped, setFlipped] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const [dateText, setDateText] = useState('----.--.--');
  const [quoteText, setQuoteText] = useState('불러오는 중…');

  const figmaFallbackQuote = useMemo(
    () =>
      '그의 소설은 늘 현실과 비현실의 경계에 구멍을 뚫어두는 느낌이다. 읽고 나면 딱히 큰 사건이 없었는데도, 이상하게 마음 한구석이 오래 허전해진다.',
    []
  );

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehaviorY;
    const prevBodyOverscroll = document.body.style.overscrollBehaviorY;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehaviorY = 'none';
    document.body.style.overscrollBehaviorY = 'none';

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overscrollBehaviorY = prevHtmlOverscroll;
      document.body.style.overscrollBehaviorY = prevBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    // 날짜: 실제 날짜(클라이언트에서만 계산해 SSR 불일치 방지)
    const d = new Date();
    setDateText(
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    );
  }, []);

  useEffect(() => {
    // 사용자가 입력한 문장 → AI 순화/길이 보정 → 카드에 반영
    let cancelled = false;

    async function run() {
      let raw = '';
      try {
        raw = localStorage.getItem('platforml:userText') || '';
      } catch (_) {
        raw = '';
      }
      const trimmed = raw.trim();
      if (!trimmed) {
        setQuoteText(figmaFallbackQuote);
        return;
      }

      try {
        const r = await fetch('/api/normalize-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        });
        const data = await r.json().catch(() => ({}));
        const out = typeof data?.output === 'string' ? data.output : '';
        if (!cancelled) setQuoteText(out || figmaFallbackQuote);
      } catch (_) {
        if (!cancelled) setQuoteText(figmaFallbackQuote);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [figmaFallbackQuote]);

  useEffect(() => {
    const update = () => {
      const next = Math.min(window.innerWidth / 402, window.innerHeight / 876);
      setScale(Number.isFinite(next) ? next : 1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), 2000);
    return () => clearTimeout(t);
  }, []);

  const goNext = useCallback(() => {
    if (!flipped || isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      router.push('/end2');
    }, 700);
  }, [router, flipped, isFadingOut]);

  const onTouchStart = useCallback((e) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (touchStartY === null) return;
    const endY = e.changedTouches[0].clientY;
    if (touchStartY - endY > 80) goNext();
    setTouchStartY(null);
  }, [touchStartY, goNext]);

  const onWheel = useCallback((e) => {
    if (e.deltaY > 50) goNext();
  }, [goNext]);

  return (
    <>
      <Head>
        <title>완료 | Platform L</title>
      </Head>

      <div
        className={`end-page ${isFadingOut ? 'end-fadeout' : ''}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        <div
          className="end-canvas"
          style={{
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <div className="end-indicator" aria-hidden="true">
            <span className="end-dot" />
            <span className="end-dot" />
            <span className="end-dot active" />
          </div>

          <div className={`end-flip ${flipped ? 'flipped' : ''}`}>
            <div className="end-flip-inner">
              <div className="end-face front">
                <div className="end-glass front" />
                <div className="end-front-img" aria-hidden="true">
                  <img src={imgCardFront} alt="" />
                </div>
                <div className="end-front-title" aria-hidden="true">
                  <div>무라카미</div>
                  <div>하루키전</div>
                </div>
                <div className="end-front-divider" aria-hidden="true" />
                <div className="end-front-author" aria-hidden="true">
                  안자이 이즈마루
                </div>
              </div>

              <div className="end-face back">
                <div className="end-glass back" />
                <div className="end-back-title" aria-hidden="true">
                  <div>무라카미</div>
                  <div>하루키전</div>
                </div>
                <div className="end-back-divider" aria-hidden="true" />
                <div className="end-back-author" aria-hidden="true">
                  안자이 이즈마루
                </div>
                <div className="end-back-img" aria-hidden="true">
                  <img src={imgCardBack} alt="" />
                </div>
                <div className="end-back-date">{dateText}</div>
                <div className="end-back-quote">{quoteText}</div>
              </div>
            </div>
          </div>

          {flipped && (
            <>
              <div className="end-send-text">
                <div>위로 슬라이드 하여</div>
                <div>미디어 월로 전송</div>
              </div>
              <img className="end-send-arrow" src={imgArrowFrame} alt="" aria-hidden="true" />
            </>
          )}
        </div>
      </div>
    </>
  );
}
