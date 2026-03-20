import Head from 'next/head';
import { useCallback } from 'react';
import { RELOAD_BROADCAST_CHANNEL } from '@/lib/socket/events';

export default function ControllerPage() {
  const reloadAll = useCallback(() => {
    try {
      const bc = new BroadcastChannel(RELOAD_BROADCAST_CHANNEL);
      bc.postMessage({ type: 'reload' });
      bc.close();
    } catch (_) {}

    fetch('/api/control-reload', { method: 'POST' }).catch(() => {});
  }, []);

  return (
    <>
      <Head>
        <title>Controller | Platform L</title>
      </Head>
      <div
        style={{
          minHeight: '100vh',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a1a1a',
          fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif",
        }}
      >
        <button
          type="button"
          onClick={reloadAll}
          style={{
            padding: '1.25rem 2.5rem',
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#fff',
            background: '#c62828',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(198, 40, 40, 0.45)',
          }}
        >
          전체 페이지 리로드
        </button>
      </div>
    </>
  );
}
