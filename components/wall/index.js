import styles from './styles.module.css';
import { useWallLogic } from './logic';
import P5Mosaic from './p5Mosaic';
import PostcardSequence from './postcardSequence';

export default function WallScreen() {
  const { cards } = useWallLogic();

  return (
    <div className={styles.page}>
      <P5Mosaic />
      {cards.map((card) =>
        card ? <PostcardSequence key={card.sentAt || card.sentAt === 0 ? String(card.sentAt) : Math.random()} card={card} /> : null
      )}
    </div>
  );
}

