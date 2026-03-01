import Head from 'next/head';
import '@/styles/globals.css';
import '@/styles/landing.css';
import '@/styles/text.css';
import '@/styles/load.css';
import '@/styles/end.css';
import '@/styles/end2.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource/pretendard@5.0.1/index.min.css" crossOrigin="anonymous" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
