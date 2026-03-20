import styles from './styles.module.css';
import { useWallLogic } from './logic';
import PostcardSequence from './postcardSequence';
import ScatteredTiles from './ScatteredTiles';
import ArchiveSpotlight from './ArchiveSpotlight';

export default function WallScreen() {
  const { cards, lastInputAt, pauseTilesMs, tilesBurst, burstRunId, archiveRunId, archiveActive, archiveTextOverride, triggerBurstLT, triggerBurstRB, triggerArchiveNow, triggerTestMobileInput } = useWallLogic();

  return (
    <div className={styles.page}>
      <ScatteredTiles lastInputAt={lastInputAt} pauseMs={pauseTilesMs} burst={tilesBurst} burstRunId={burstRunId} archiveRunId={archiveRunId} />
      <div className={styles.debugPanel}>
        <button className={styles.debugBtn} onClick={triggerBurstLT} type="button">
          Spread LT
        </button>
        <button className={styles.debugBtn} onClick={triggerBurstRB} type="button">
          Spread RB
        </button>
        <button className={styles.debugBtn} onClick={triggerArchiveNow} type="button">
          Archive
        </button>
        <button className={styles.debugBtn} onClick={() => triggerTestMobileInput('행복한 하루')} type="button">
          Test Input (Mobile)
        </button>
      </div>
      <ArchiveSpotlight cards={cards} runId={archiveRunId} active={archiveActive} textOverride={archiveTextOverride} />
      {!archiveActive &&
        cards.map((card) =>
          card ? <PostcardSequence key={card.sentAt || card.sentAt === 0 ? String(card.sentAt) : Math.random()} card={card} /> : null
        )}
    </div>
  );
}

