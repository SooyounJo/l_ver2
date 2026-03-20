import styles from './styles.module.css';
import { useWallLogic } from './logic';
import PostcardSequence from './postcardSequence';
import ScatteredTiles from './ScatteredTiles';
import ArchiveSpotlight from './ArchiveSpotlight';

export default function WallScreen() {
  const { cards, lastInputAt, pauseTilesMs, tilesBurst, burstRunId, archiveRunId, archiveActive, archiveTextOverride } = useWallLogic();

  const clearWallSelection = () => {
    try {
      window.getSelection()?.removeAllRanges?.();
    } catch (_) {}
  };

  return (
    <div
      className={styles.page}
      tabIndex={-1}
      onMouseDown={clearWallSelection}
      onTouchStart={clearWallSelection}
    >
      <ScatteredTiles lastInputAt={lastInputAt} pauseMs={pauseTilesMs} burst={tilesBurst} burstRunId={burstRunId} archiveRunId={archiveRunId} />
      <ArchiveSpotlight cards={cards} runId={archiveRunId} active={archiveActive} textOverride={archiveTextOverride} />
      {!archiveActive &&
        cards.map((card) =>
          card ? <PostcardSequence key={card.sentAt || card.sentAt === 0 ? String(card.sentAt) : Math.random()} card={card} /> : null
        )}
    </div>
  );
}

