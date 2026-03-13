import { useEffect, useState } from 'react';
import { useLoadLogic } from './logic';
import styles from './styles.module.css';

const cx = (...names) => names.filter(Boolean).map((n) => styles[n]).filter(Boolean).join(' ');

function LoadingAnimSet({ imageUrls = [], swayLastCard = false }) {
  const [urlA, urlB, urlC] = Array.isArray(imageUrls) ? imageUrls : [];
  return (
    <>
      <div className={cx('load-card', 'a')} aria-hidden="true">
        {urlA ? <img src={urlA} alt="" /> : null}
      </div>
      <div className={cx('load-card', 'b')} aria-hidden="true">
        {urlB ? <img src={urlB} alt="" /> : null}
      </div>
      <div className={cx('load-card', 'c', swayLastCard && 'sway')} aria-hidden="true">
        {urlC ? <img src={urlC} alt="" /> : null}
      </div>
    </>
  );
}

export default function LoadScreen({ onDone } = {}) {
  useLoadLogic({ onDone });
  const [driveImageUrls, setDriveImageUrls] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/random-public-image?count=3')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.urls) ? data.urls : data?.url ? [data.url] : [];
        setDriveImageUrls(list);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <div className={styles['load-figma-page']}>
      <div className={styles['load-anim-layer']} aria-hidden="true">
        <div className={styles['load-anim-track']}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <LoadingAnimSet imageUrls={driveImageUrls} />
          </div>
          <div style={{ position: 'absolute', inset: 0, transform: 'translateY(50%)' }}>
            <LoadingAnimSet imageUrls={driveImageUrls} swayLastCard />
          </div>
        </div>
      </div>

      <div className={styles['load-figma-title']}>
        <p style={{ margin: 0 }}>감상평과 어울리는 엽서를</p>
        <p style={{ margin: 0 }}>탐색하고 있어요</p>
      </div>

      <div className={styles['load-indicator']} aria-hidden="true">
        <span className={styles['load-dot']} />
        <span className={cx('load-dot', 'active')} />
        <span className={styles['load-dot']} />
      </div>
    </div>
  );
}

