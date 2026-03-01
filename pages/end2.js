import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

export default function End2() {
  const router = useRouter();
  const [scale, setScale] = useState(1);
  const [touchStartY, setTouchStartY] = useState(null);

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
    const update = () => {
      const next = Math.min(window.innerWidth / 402, window.innerHeight / 876);
      setScale(Number.isFinite(next) ? next : 1);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const goHome = useCallback(() => {
    router.push('/landing');
  }, [router]);

  const onTouchStart = useCallback((e) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const onTouchEnd = useCallback((e) => {
    if (touchStartY === null) return;
    const endY = e.changedTouches[0].clientY;
    if (touchStartY - endY > 80) goHome();
    setTouchStartY(null);
  }, [touchStartY, goHome]);

  const onWheel = useCallback((e) => {
    if (e.deltaY > 50) goHome();
  }, [goHome]);

  return (
    <>
      <Head>
        <title>종료 | Platform L</title>
      </Head>

      <div className="end2-page" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel}>
        <div
          className="end2-canvas"
          style={{
            transform: `translate(-50%, -50%) scale(${scale})`,
          }}
        >
          <div className="end2-title" aria-hidden="true">
            <div>무라카미</div>
            <div>하루키전</div>
          </div>

          <div className="end2-desc" aria-hidden="true">
            <div>미디어 월에 추가된</div>
            <div>나의 엽서를 확인해보세요</div>
          </div>

          <div className="end2-exit-pill" aria-hidden="true" />
          <div className="end2-exit-text" aria-hidden="true">
            종료
          </div>
          <button type="button" className="end2-exit-hit" aria-label="종료" onClick={goHome} />
        </div>
      </div>
    </>
  );
}
