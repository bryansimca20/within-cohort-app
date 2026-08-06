'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { WelcomeBeat } from './WelcomeBeat';
import { FinishBeat } from './FinishBeat';
import { ProgressDots } from './ProgressDots';
import { SetupBeat } from './SetupBeat';
import { TeachBeat } from './TeachBeat';
import { teachBeats } from './teachBeats';

/** The first-run stage machine: one full-screen beat at a time on a black canvas, advanced by a thumb-reachable control. The final beat submits completeOnboardingAction (stamp + redirect to /today), so reaching the end is what ends the flow. Reduced-motion swaps the y-slide for a plain crossfade; the MotionConfig wrapper below also strips transform/layout animation from every beat's own visuals for reduced-motion users. */
export function Onboarding({ name }: { name: string }) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const next = () => setStep((s) => s + 1);
  const focusBeat = useCallback((node: HTMLDivElement | null) => {
    node?.focus();
  }, []);

  const beats = [
    <WelcomeBeat key="welcome" name={name} onNext={next} />,
    ...teachBeats.map((b) => <TeachBeat key={b.key} beat={b} onNext={next} />),
    <SetupBeat key="setup" onNext={next} />,
    <FinishBeat key="finish" name={name} />,
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-dvh flex-col bg-wi-black text-wi-paper">
        <div className="flex items-center justify-between px-6.5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-2">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            aria-label="Previous"
            className="-ml-1 p-0 text-wi-paper transition-opacity disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="size-5" />
          </button>
          <ProgressDots total={beats.length} current={step} />
          <span aria-hidden className="w-5" />
        </div>

        <p className="sr-only" aria-live="polite">
          Step {step + 1} of {beats.length}
        </p>

        <div className="relative flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              ref={focusBeat}
              tabIndex={-1}
              className="absolute inset-0 flex flex-col px-6.5 pb-[calc(env(safe-area-inset-bottom)+1.75rem)]"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -24 }}
              transition={{ duration: reduce ? 0.12 : 0.32, ease: [0.16, 1, 0.3, 1] }}
            >
              {beats[step]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
