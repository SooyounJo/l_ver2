import styles from './styles.module.css';
import { useWallLogic } from './logic';
import PostcardSequence from './postcardSequence';
import SynthTreeWall from './SynthTreeWall';
import ArchiveSpotlight from './ArchiveSpotlight';

export default function WallScreen() {
  const { cards, lastInputAt, archiveRunId, archiveActive, archiveTextOverride } = useWallLogic();

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
      <SynthTreeWall cards={cards} lastInputAt={lastInputAt} archiveActive={archiveActive} />
      <ArchiveSpotlight cards={cards} runId={archiveRunId} active={archiveActive} textOverride={archiveTextOverride} />
      {!archiveActive &&
        cards.map((card) =>
          card ? <PostcardSequence key={card.sentAt || card.sentAt === 0 ? String(card.sentAt) : Math.random()} card={card} /> : null
        )}
    </div>
  );
}
