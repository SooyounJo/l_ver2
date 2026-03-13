import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

export function useEndLogic({ onNext } = {}) {
  const router = useRouter();
  const [scale, setScale] = useState(1);
  const [flipped, setFlipped] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [touchStartY, setTouchStartY] = useState(null);
  const [dateText, setDateText] = useState('----.--.--');
  const [quoteText, setQuoteText] = useState('불러오는 중…');
  const [randomImageUrl, setRandomImageUrl] = useState(null);

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
    const d = new Date();
    setDateText(
      `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        let history = [];
        let recentSession = [];
        try {
          const raw = localStorage.getItem('platforml:cardImageHistory') || '[]';
          const parsed = JSON.parse(raw);
          history = Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
        } catch (_) {
          history = [];
        }

        try {
          const rawSession = localStorage.getItem('platforml:cardImageSession') || '[]';
          const parsedSession = JSON.parse(rawSession);
          recentSession = Array.isArray(parsedSession) ? parsedSession.filter((v) => typeof v === 'string') : [];
        } catch (_) {
          recentSession = [];
        }

        const recentHistory = history.slice(-8);
        const excludePool = [...new Set([...recentHistory, ...recentSession])];
        const qs = excludePool.length > 0 ? `?exclude=${encodeURIComponent(excludePool.join(','))}` : '';
        const r = await fetch(`/api/random-public-image${qs}`);
        const data = await r.json().catch(() => ({}));
        const url = typeof data?.url === 'string' ? data.url : null;
        if (!cancelled) setRandomImageUrl(url || null);
        if (url) {
          try {
            const next = [...history.filter((u) => u !== url), url].slice(-20);
            localStorage.setItem('platforml:cardImageHistory', JSON.stringify(next));

            const updatedSession = [...recentSession.filter((u) => u !== url), url].slice(-4);
            localStorage.setItem('platforml:cardImageSession', JSON.stringify(updatedSession));
          } catch (_) {
            // ignore
          }
        }
      } catch (_) {
        if (!cancelled) setRandomImageUrl(null);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
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

  const sendToWall = useCallback(() => {
    const payload = {
      text: quoteText,
      date: dateText,
      imageUrl: randomImageUrl || '',
    };
    // Best-effort: 하루 아카이브용 Google Sheets 로그
    try {
      fetch('/api/log-interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: quoteText,
          imageUrl: randomImageUrl || '',
        }),
        keepalive: true,
      }).catch(() => {});
    } catch (_) {
      // ignore logging errors
    }
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/wall-send', blob);
        return;
      }
    } catch (_) {
      // ignore
    }
    // fallback
    fetch('/api/wall-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }, [quoteText, dateText, randomImageUrl]);

  const goNextPage = useCallback(() => {
    if (typeof onNext === 'function') return onNext();
    router.push('/end2');
  }, [onNext, router]);

  const goNext = useCallback(() => {
    if (!flipped || isFadingOut) return;
    sendToWall();
    setIsFadingOut(true);
    setTimeout(() => {
      goNextPage();
    }, 700);
  }, [flipped, isFadingOut, sendToWall, goNextPage]);

  const onTouchStart = useCallback((e) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const onTouchEnd = useCallback(
    (e) => {
      if (touchStartY === null) return;
      const endY = e.changedTouches[0].clientY;
      if (touchStartY - endY > 80) goNext();
      setTouchStartY(null);
    },
    [touchStartY, goNext]
  );

  const onWheel = useCallback(
    (e) => {
      if (e.deltaY > 50) goNext();
    },
    [goNext]
  );

  return {
    scale,
    flipped,
    isFadingOut,
    onTouchStart,
    onTouchEnd,
    onWheel,
    dateText,
    quoteText,
    randomImageUrl,
  };
}

