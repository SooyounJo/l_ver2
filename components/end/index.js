import { useCallback, useMemo, useState } from 'react';
import { getFirstDriveImageUrl } from '@/lib/driveImages';
import { useEndLogic } from './logic';
import styles from './styles.module.css';

const fallbackCardFront = getFirstDriveImageUrl();
const fallbackCardBack = getFirstDriveImageUrl();

const cx = (...names) => names.filter(Boolean).map((n) => styles[n]).filter(Boolean).join(' ');

export default function EndScreen({ onNext } = {}) {
  const {
    scale,
    flipped,
    isFadingOut,
    onTouchStart,
    onTouchEnd,
    onWheel,
    dateText,
    quoteText,
    randomImageUrl,
  } = useEndLogic({ onNext });

  const cardImage = randomImageUrl || fallbackCardBack;
  const frontImage = randomImageUrl || fallbackCardFront;

  const [saving, setSaving] = useState(false);

  const downloadName = useMemo(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `platforml-postcard-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(
      d.getMinutes()
    )}${pad(d.getSeconds())}.jpg`;
  }, []);

  const handleSave = useCallback(
    async (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if (saving) return;
      setSaving(true);

      const href = typeof cardImage === 'string' ? cardImage : '';
      if (!href) {
        setSaving(false);
        return;
      }

      try {
        // 1) Prefer Web Share (works well on mobile, esp. iOS)
        const r = await fetch(href, { cache: 'no-store' });
        const blob = await r.blob();
        const fileType = blob.type || (href.endsWith('.png') ? 'image/png' : 'image/jpeg');
        const file = new File([blob], downloadName, { type: fileType });

        if (navigator?.canShare && navigator.canShare({ files: [file] }) && navigator?.share) {
          await navigator.share({ files: [file], title: 'Postcard' });
          return;
        }

        // 2) Fallback: force download via blob URL (more reliable than direct link)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = downloadName;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (_) {
        // 3) Last fallback: open the image in a new tab
        try {
          window.open(href, '_blank', 'noopener,noreferrer');
        } catch (_) {}
      } finally {
        setTimeout(() => setSaving(false), 450);
      }
    },
    [saving, cardImage, downloadName]
  );

  return (
    <div
      className={cx('end-page', isFadingOut && 'end-fadeout')}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      <div
        className={styles['end-canvas']}
        style={{
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        <div className={styles['end-indicator']} aria-hidden="true">
          <span className={styles['end-dot']} />
          <span className={styles['end-dot']} />
          <span className={cx('end-dot', 'active')} />
        </div>

        <div className={cx('end-flip', flipped && 'flipped')}>
          <div className={styles['end-flip-inner']}>
            <div className={cx('end-face', 'front')}>
              <div className={cx('end-glass', 'front')} />
              <div className={styles['end-front-img']} aria-hidden="true">
                <img src={frontImage} alt="" />
              </div>
              <div className={styles['end-front-title']} aria-hidden="true">
                <div>무라카미</div>
                <div>하루키전</div>
              </div>
              <div className={styles['end-front-divider']} aria-hidden="true" />
              <div className={styles['end-front-author']} aria-hidden="true">
                안자이 이즈마루
              </div>
            </div>

            <div className={cx('end-face', 'back')}>
              <div className={cx('end-glass', 'back')} />
              <div className={styles['end-back-title']} aria-hidden="true">
                <div>무라카미</div>
                <div>하루키전</div>
              </div>
              <div className={styles['end-back-divider']} aria-hidden="true" />
              <div className={styles['end-back-author']} aria-hidden="true">
                안자이 이즈마루
              </div>
              <div className={styles['end-back-img']} aria-hidden="true">
                <img src={cardImage} alt="" />
              </div>
              <div className={styles['end-back-meta']}>
                <div className={styles['end-back-date']}>{dateText}</div>
                <button
                  type="button"
                  className={styles['end-back-save']}
                  data-saving={saving ? 'true' : 'false'}
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onClick={handleSave}
                >
                  저장하기
                </button>
              </div>
              <div className={styles['end-back-quote']}>{quoteText}</div>
            </div>
          </div>
        </div>

        {flipped && (
          <>
            <div className={styles['end-send-text']}>
              <div>위로 슬라이드 하여</div>
              <div>미디어 월로 전송</div>
            </div>
            <svg
              className={styles['end-send-arrow']}
              viewBox="0 0 83 174"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <rect x="6" y="6" width="71" height="162" rx="18" stroke="rgba(255, 255, 255, 0.28)" strokeWidth="2" />
              <path d="M41.5 118V62" stroke="rgba(255, 255, 255, 0.55)" strokeWidth="3" strokeLinecap="round" />
              <path
                d="M30 73.5L41.5 62L53 73.5"
                stroke="rgba(255, 255, 255, 0.55)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </div>
    </div>
  );
}

