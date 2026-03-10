import { useCallback, useMemo, useState } from 'react';

import LandingScreen from '@/components/landing';
import TextScreen from '@/components/text';
import LoadScreen from '@/components/load';
import EndScreen from '@/components/end';
import End2Screen from '@/components/end2';

const STEPS = {
  LANDING: 'landing',
  TEXT: 'text',
  LOAD: 'load',
  END: 'end',
  END2: 'end2',
};

export default function MobileScreen() {
  const [step, setStep] = useState(STEPS.LANDING);

  const go = useCallback((next) => {
    setStep(next);
  }, []);

  const handlers = useMemo(() => {
    return {
      goText: () => go(STEPS.TEXT),
      goLoad: () => go(STEPS.LOAD),
      goEnd: () => go(STEPS.END),
      goEnd2: () => go(STEPS.END2),
      goLanding: () => go(STEPS.LANDING),
    };
  }, [go]);

  if (step === STEPS.TEXT) return <TextScreen onNext={handlers.goLoad} />;
  if (step === STEPS.LOAD) return <LoadScreen onDone={handlers.goEnd} />;
  if (step === STEPS.END) return <EndScreen onNext={handlers.goEnd2} />;
  if (step === STEPS.END2) return <End2Screen onRestart={handlers.goLanding} />;
  return <LandingScreen onNext={handlers.goText} />;
}

