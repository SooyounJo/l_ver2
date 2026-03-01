import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';

const imgCardA = 'https://www.figma.com/api/mcp/asset/879db829-92ed-4c86-9cb1-67f88f3a2d4b';
const imgCardB = 'https://www.figma.com/api/mcp/asset/09816a73-0c41-4547-a09f-56d92866ceaf';
const imgCardC = 'https://www.figma.com/api/mcp/asset/b8dabb5e-9c89-4242-9166-0c69fca4be89';

function LoadingAnimSet({ swayLastCard = false }) {
  return (
    <>
      <div className="load-card a" aria-hidden="true">
        <img src={imgCardA} alt="" />
      </div>
      <div className="load-card b" aria-hidden="true">
        <img src={imgCardB} alt="" />
      </div>
      <div className={`load-card c ${swayLastCard ? 'sway' : ''}`} aria-hidden="true">
        <img src={imgCardC} alt="" />
      </div>
    </>
  );
}

export default function Load() {
  const router = useRouter();

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
    const t = setTimeout(() => {
      router.push('/end');
    }, 6000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <>
      <Head>
        <title>로딩 | Platform L</title>
      </Head>

      <div className="load-figma-page">
        <div className="load-anim-layer" aria-hidden="true">
          <div className="load-anim-track">
            <div style={{ position: 'absolute', inset: 0 }}>
              <LoadingAnimSet />
            </div>
            <div style={{ position: 'absolute', inset: 0, transform: 'translateY(50%)' }}>
              <LoadingAnimSet swayLastCard />
            </div>
          </div>
        </div>

        <div className="load-figma-title">
          <p style={{ margin: 0 }}>감상평과 어울리는 엽서를</p>
          <p style={{ margin: 0 }}>탐색하고 있어요</p>
        </div>

        <div className="load-indicator" aria-hidden="true">
          <span className="load-dot" />
          <span className="load-dot active" />
          <span className="load-dot" />
        </div>
      </div>
    </>
  );
}
