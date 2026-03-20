import Head from 'next/head';
import { useEffect } from 'react';
import '@/styles/globals.css';
import { RELOAD_BROADCAST_CHANNEL } from '@/lib/socket/events';

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return undefined;

    const bc = new BroadcastChannel(RELOAD_BROADCAST_CHANNEL);
    const onMessage = () => {
      window.location.reload();
    };
    bc.addEventListener('message', onMessage);
    return () => {
      bc.removeEventListener('message', onMessage);
      bc.close();
    };
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
