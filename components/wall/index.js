import styles from './styles.module.css';
import { useWallLogic } from './logic';
import PostcardSequence from './postcardSequence';
import ScatteredTiles from './ScatteredTiles';

export default function WallScreen() {
  const { cards, lastInputAt, pauseTilesMs } = useWallLogic();

  return (
    <div className={styles.page}>
      <ScatteredTiles lastInputAt={lastInputAt} pauseMs={pauseTilesMs} />
      {cards.map((card) =>
        card ? <PostcardSequence key={card.sentAt || card.sentAt === 0 ? String(card.sentAt) : Math.random()} card={card} /> : null
      )}
    </div>
  );
}

