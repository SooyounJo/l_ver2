import Head from 'next/head';
import { useRef, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const SWIPE_THRESHOLD = 30;

export default function Landing() {
  const router = useRouter();
  const wrapRef = useRef(null);
  const startY = useRef(0);
  const touchActive = useRef(false);
  const isTransitioning = useRef(false);
  const [phase, setPhase] = useState(0); // 0: 초기, 1: text박스 상태(멈춤), 2: 이동 중

  const expandToTextBox = useCallback(() => {
    if (phase !== 0 || isTransitioning.current) return;
    isTransitioning.current = true;
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.classList.add('expanded');
    setPhase(1);
    isTransitioning.current = false;
  }, [phase]);

  const goToTextPage = useCallback(() => {
    if (phase !== 1 || isTransitioning.current) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    isTransitioning.current = true;
    setPhase(2);
    wrap.classList.add('slide-up');
    setTimeout(() => router.push('/text'), 900);
  }, [phase, router]);

  const handleAction = useCallback(() => {
    if (phase === 0) expandToTextBox();
    else if (phase === 1) goToTextPage();
  }, [phase, expandToTextBox, goToTextPage]);

  const handleTouchStart = useCallback((e) => {
    touchActive.current = true;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (e.changedTouches?.[0] && startY.current - e.changedTouches[0].clientY > SWIPE_THRESHOLD) {
      handleAction();
    }
    touchActive.current = false;
  }, [handleAction]);

  const handleMouseDown = useCallback((e) => {
    startY.current = e.clientY;
  }, []);

  const handleMouseUp = useCallback((e) => {
    if (startY.current - e.clientY > SWIPE_THRESHOLD) handleAction();
  }, [handleAction]);

  const handleWheel = useCallback((e) => {
    if (e.deltaY < -15) {
      e.preventDefault();
      handleAction();
    }
  }, [handleAction]);

  const handleClick = useCallback(() => {
    handleAction();
  }, [handleAction]);

  useEffect(() => {
    const onTouchMove = (e) => {
      if (!touchActive.current || !e.touches.length) return;
      const currentY = e.touches[0].clientY;
      if (startY.current - currentY > SWIPE_THRESHOLD) {
        e.preventDefault();
        touchActive.current = false;
        handleAction();
      }
    };
    const onTouchEnd = () => {
      touchActive.current = false;
    };
    const onWheel = (e) => {
      if (e.deltaY < -15) {
        e.preventDefault();
        handleAction();
      }
    };
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    document.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('wheel', onWheel);
    };
  }, [handleAction]);

  return (
    <>
      <Head>
        <title>랜딩 | Platform L</title>
      </Head>
      <div
        className="landing-page"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="landing-indicator">
          <span className="landing-dot active" aria-current="true" />
          <span className="landing-dot" />
          <span className="landing-dot" />
        </div>

        <section className="landing-text-section">
          <h1 className="landing-title">
            <span className="landing-title-line">무라카미</span>
            <span className="landing-title-line">하루키전</span>
          </h1>
          <div className="landing-divider-wrap">
            <div className="landing-divider" />
            <p className="landing-author">안자이 이즈마루</p>
          </div>
        </section>

        <div
          className="landing-swipe-area"
          role="button"
          tabIndex={0}
          aria-label="위로 스크롤하여 체험 시작"
          onClick={handleClick}
        />

        <div
          className="landing-cta-wrap"
          ref={wrapRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          onClick={handleClick}
        >
          <div className="landing-cta">
            {phase === 0 ? (
              <>
                <span className="landing-cta-line1">위로 스크롤 하여</span>
                <span className="landing-cta-line2">체험을 시작하기</span>
                <span className="landing-cta-arrow" aria-hidden="true">⌃</span>
              </>
            ) : (
              <>
                <span className="landing-cta-line1">다음</span>
                <span className="landing-cta-line2">탭하여 계속하기</span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
