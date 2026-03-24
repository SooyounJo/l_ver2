import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <link rel="preconnect" href="https://o6cdhdutve.execute-api.ap-northeast-2.amazonaws.com" />
        <link
          rel="stylesheet"
          href="https://o6cdhdutve.execute-api.ap-northeast-2.amazonaws.com/v1/api/css/drop_fontstream_css/?sid=gAAAAABpwfgY9wZNp58I5R1nGU6cGnal3wp2ztEaZrp2JjRyrwZgp6Y_e6K84ylFJYgeKHQF_y1EGTdEMLnHbJCz1iiQqF5dsDVPBZHYbRI2uMRg51GQAASIE2E0E8_My3MSARbvE7hv0Yb1BBpe-QmZU6dRQoOXF9jgeNletcmxOV9AjXpvvRy_QKQFSVe1wCDKZt-ULxdoluaw0m2ByWL9_PUCUEtAa730ws8GK_9Ze809MJ5uYlPXSWlHTI4WIivqoINvr-lI"
          charSet="utf-8"
          referrerPolicy="origin"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@fontsource/pretendard@5.0.1/index.min.css"
          crossOrigin="anonymous"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

