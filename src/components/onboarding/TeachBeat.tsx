'use client';

import { motion, useReducedMotion } from 'motion/react';
import { ContinueButton } from './ContinueButton';
import type { TeachBeatData } from './teachBeats';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Presentational shell shared by all four teach beats: an animated visual over eyebrow/title/body, with the Continue control. Reduced-motion drops the text rise; the Visual's own transform/layout reveals are stripped for reduced-motion users by the `MotionConfig reducedMotion="user"` wrapper in `Onboarding`. */
export function TeachBeat({ beat, onNext }: { beat: TeachBeatData; onNext: () => void }) {
  const reduce = useReducedMotion();
  const rise = reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };
  const Visual = beat.Visual;
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="flex min-h-[168px] items-center">
          <Visual />
        </div>
        <div>
          <motion.p {...rise} transition={{ duration: 0.45, ease: EASE }} className="text-2xs font-bold tracking-[0.14em] text-wi-on-dark-2 uppercase">
            {beat.eyebrow}
          </motion.p>
          <motion.h2 {...rise} transition={{ duration: 0.45, delay: 0.06, ease: EASE }} className="mt-3 text-[30px] leading-[1.02] font-bold tracking-[-0.02em]">
            {beat.title}
          </motion.h2>
          <motion.p {...rise} transition={{ duration: 0.45, delay: 0.12, ease: EASE }} className="mt-3 max-w-[22rem] text-sm leading-relaxed text-wi-on-dark-2">
            {beat.body}
          </motion.p>
        </div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </div>
  );
}
