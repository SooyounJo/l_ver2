import { useEffect, useMemo, useRef, useState } from 'react';
import { useTextLogic } from './logic';
import styles from './styles.module.css';

const cx = (...names) => names.filter(Boolean).map((n) => styles[n]).filter(Boolean).join(' ');

export default function TextScreen() {
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
  } = useTextLogic();

  const hasText = inputValue.trim().length > 0;
  const [introOn, setIntroOn] = useState(false);
  const questionLines = useMemo(() => ['무라카미 하루키에게', '딱 한 문장만 보낼 수 있다면', '무엇을 말하고 싶으세요?'], []);
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

  return (
    <div className={styles['text-figma-page']} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
      <div className={cx('text-figma-card', introOn && 'text-figma-intro', isExiting && 'text-figma-card-exit')}>
        <div className={styles['text-figma-indicator']}>
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
              className={styles['text-figma-quote-input']}
              placeholder="여기에 한 문장을 입력하세요"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onInput={syncTextareaHeight}
              onClick={() => textareaRef.current?.focus()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              rows={2}
              maxLength={120}
              aria-label="무라카미 하루키에게 보낼 한 문장"
            />
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
            <span>미디어 월로 전송</span>
          </p>
        )}
      </div>
    </div>
  );
}

