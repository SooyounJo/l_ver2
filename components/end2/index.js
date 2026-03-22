import { useEnd2Logic } from './logic';
import styles from './styles.module.css';

export default function End2Screen({ onRestart } = {}) {
  const { scale, goHome, onTouchStart, onTouchEnd, onWheel } = useEnd2Logic({ onRestart });

  return (
    <div className={styles['end2-page']} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} onWheel={onWheel}>
      <div
        className={styles['end2-canvas']}
        style={{
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <section className={styles['end2-text-section']} aria-hidden="true">
          <h1 className={styles['end2-title']}>
            <span className={styles['end2-title-line']}>무라카미</span>
            <span className={styles['end2-title-line']}>하루키전</span>
          </h1>
          <div className={styles['end2-divider-wrap']}>
            <div className={styles['end2-divider']} />
            <p className={styles['end2-author']}>안자이 미즈마루</p>
          </div>
        </section>

        <div className={styles['end2-desc']} aria-hidden="true">
        <div>미디어 월에 추가된</div>
        <div>나의 엽서를 확인해보세요</div>
        </div>

        <button type="button" className={styles['end2-exit-button']} aria-label="종료하기" onClick={goHome}>
          종료하기
        </button>
      </div>
    </div>
  );
}

