import styles from './styles.module.css';
import { useWallLogic } from './logic';

export default function WallScreen() {
  const { status, card } = useWallLogic();

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div className={styles.title}>WALL</div>
        <div className={styles.status} data-status={status}>
          {status}
        </div>
      </div>

      <div className={styles.stage}>
        {card ? (
          <div className={styles.card}>
            {card.imageUrl ? (
              <div className={styles.imageWrap} aria-hidden="true">
                <img className={styles.image} src={card.imageUrl} alt="" />
              </div>
            ) : (
              <div className={styles.imagePlaceholder} aria-hidden="true" />
            )}
            <div className={styles.meta}>
              <div className={styles.date}>{card.date || ''}</div>
            </div>
            <div className={styles.text}>{card.text || ''}</div>
          </div>
        ) : (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>대기 중</div>
            <div className={styles.emptyDesc}>모바일에서 전송하면 여기에 표시됩니다.</div>
          </div>
        )}
      </div>
    </div>
  );
}

