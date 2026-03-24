import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTextLogic } from './logic';
import styles from './styles.module.css';

const cx = (...names) => names.filter(Boolean).map((n) => styles[n]).filter(Boolean).join(' ');

export default function TextScreen({ onNext } = {}) {
  const {
    inputValue,
    setInputValue,
    textareaRef,
    syncTextareaHeight,
    dateText,
    isExiting,
    handleTouchStart,
    handleTouchEnd,
    handleWheel,
  } = useTextLogic({ onNext });

  const hasText = inputValue.trim().length > 0;
  const [introOn, setIntroOn] = useState(false);
  const questionLines = useMemo(() => ['하루키의 세계를 지나온 당신,', '지금 마음속에 떠오르는', '단 하나의 문장이 있나요?'], []);
  const questionText = useMemo(() => questionLines.join('\n'), [questionLines]);
  const [typedText, setTypedText] = useState('');
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    setIntroOn(true);
  }, []);

  useEffect(() => {
    // StrictMode(개발)에서 effect가 2번 실행되어도 중복 타이핑이 안 나도록 정리
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    let idx = 0;
    let cancelled = false;

    setTypedText('');

    const tick = () => {
      if (cancelled) return;
      idx += 1;
      setTypedText(questionText.slice(0, idx));

      if (idx >= questionText.length) return;

      const ch = questionText[idx] || '';
      const delay = ch === '\n' ? 220 : ch === ' ' ? 20 : 35;
      typingTimeoutRef.current = setTimeout(tick, delay);
    };

    typingTimeoutRef.current = setTimeout(tick, 220);
    return () => {
      cancelled = true;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [questionText]);

  const focusInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    // 입력 끝으로 커서 이동
    const len = el.value?.length ?? 0;
    try {
      el.setSelectionRange(len, len);
    } catch (_) {}
  }, [textareaRef]);

  /** 상단 점 영역 탭 시 textarea 포커스/캐럿이 점 근처로 잡히는 것 방지 */
  const absorbIndicatorPointer = useCallback(
    (e) => {
      e.stopPropagation();
      textareaRef.current?.blur();
    },
    [textareaRef]
  );

  return (
    <div
      className={styles['text-figma-page']}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      onClick={focusInput}
    >
      <div className={cx('text-figma-card', introOn && 'text-figma-intro', isExiting && 'text-figma-card-exit')}>
        <div
          className={styles['text-figma-indicator']}
          onPointerDown={absorbIndicatorPointer}
          onTouchStart={absorbIndicatorPointer}
          onClick={(e) => e.stopPropagation()}
        >
          <span className={styles['text-figma-dot']} />
          <span className={cx('text-figma-dot', 'active')} aria-current="true" />
          <span className={styles['text-figma-dot']} />
        </div>

        <h2 className={styles['text-figma-question']}>
          {questionLines.map((line, i) => {
            const parts = typedText.split('\n');
            return <p key={line}>{parts[i] || ''}</p>;
          })}
        </h2>

        <div className={styles['text-figma-quote-block']}>
          <span className={styles['text-figma-quote-open']} aria-hidden="true">
            “
          </span>
          <div className={styles['text-figma-quote-wrap']}>
            <textarea
              ref={textareaRef}
              className={cx('text-figma-quote-input', !hasText && 'text-figma-quote-input--empty')}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onInput={syncTextareaHeight}
              onClick={() => textareaRef.current?.focus()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              rows={2}
              maxLength={30}
              aria-label="무라카미 하루키에게 보낼 한 문장"
            />
            {!hasText && (
              <div className={styles['text-figma-quote-prompt']} aria-hidden="true">
                <p className={styles['text-figma-quote-hint']}>여기에 한 문장을 입력하세요</p>
                <span className={styles['text-figma-quote-line']} aria-hidden="true" />
              </div>
            )}
          </div>
          <span className={styles['text-figma-quote-close']} aria-hidden="true">
            ”
          </span>
        </div>

        <span className={styles['text-figma-date']}>{dateText}</span>

        {!hasText ? (
          <p className={styles['text-figma-below-card-hint']}>터치하여 타이핑</p>
        ) : (
          <p className={cx('text-figma-below-card-hint', 'text-figma-slide-hint')}>
            <span>위로 슬라이드 하여</span>
            <br />
            <span>엽서를 완성</span>
          </p>
        )}
      </div>
    </div>
  );
}

