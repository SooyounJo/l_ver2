import Head from 'next/head';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Text() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState('');
  const [touchStartY, setTouchStartY] = useState(null);
  const [isExiting, setIsExiting] = useState(false);
  const textareaRef = useRef(null);

  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

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
    // 입력/리사이즈 시 textarea 내부 스크롤이 생기지 않도록 높이를 맞춤
    const raf = requestAnimationFrame(syncTextareaHeight);
    return () => cancelAnimationFrame(raf);
  }, [inputValue, syncTextareaHeight]);

  const handleTouchStart = useCallback((e) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (touchStartY === null) return;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchStartY - touchEndY;
    if (deltaY > 80) {
      try {
        localStorage.setItem('platforml:userText', inputValue);
      } catch (_) {
        // ignore
      }
      setIsExiting(true);
      setTimeout(() => {
        router.push('/load');
      }, 500);
    }
    setTouchStartY(null);
  }, [touchStartY, router, inputValue]);

  const handleWheel = useCallback((e) => {
    if (e.deltaY > 50) {
      try {
        localStorage.setItem('platforml:userText', inputValue);
      } catch (_) {
        // ignore
      }
      setIsExiting(true);
      setTimeout(() => {
        router.push('/load');
      }, 500);
    }
  }, [router, inputValue]);

  const formatDate = () => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <>
      <Head>
        <title>무라카미 하루키에게 | Platform L</title>
      </Head>
      <div
        className="text-figma-page"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div className={`text-figma-card ${isExiting ? 'text-figma-card-exit' : ''}`}>
          <div className="text-figma-indicator">
            <span className="text-figma-dot" />
            <span className="text-figma-dot active" aria-current="true" />
            <span className="text-figma-dot" />
          </div>
          <h2 className="text-figma-question">
            <p>무라카미 하루키에게</p>
            <p>딱 한 문장만 보낼 수 있다면</p>
            <p>무엇을 말하고 싶으세요?</p>
          </h2>
          <div className="text-figma-quote-block">
            <span className="text-figma-quote-open">&apos;</span>
            <div className="text-figma-quote-wrap">
            <textarea
              ref={textareaRef}
              className="text-figma-quote-input"
              placeholder="여기에 한 문장을 입력하세요"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onInput={syncTextareaHeight}
              onClick={() => textareaRef.current?.focus()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              rows={2}
              maxLength={120}
              aria-label="무라카미 하루키에게 보낼 한 문장"
            />
            </div>
            <span className="text-figma-quote-close">&apos;</span>
          </div>
          <span className="text-figma-date">{formatDate()}</span>
        </div>
        {inputValue.trim().length > 0 && (
          <p className="text-figma-slide-hint">
            <span>위로 슬라이드 하여</span>
            <br />
            <span>미디어 월로 전송</span>
          </p>
        )}
      </div>
    </>
  );
}
