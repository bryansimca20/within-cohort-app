'use client';

import { motion, useReducedMotion } from 'motion/react';
import { InstallCard } from '@/components/InstallCard';
import { EnablePush } from '@/components/EnablePush';
import { ContinueButton } from './ContinueButton';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Setup beat: the flow's functional payload. Drives Add-to-Home-Screen and Turn-on-reminders with the existing components. Both can render nothing (already standalone / push unsupported or blocked), so the copy stands on its own and the slot simply collapses. Continue is always available: setup is encouraged, not forced. */
export function SetupBeat({ onNext }: { onNext: () => void }) {
  const reduce = useReducedMotion();
  const rise = reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-6">
        <div>
          <motion.p {...rise} transition={{ duration: 0.45, ease: EASE }} className="text-2xs font-bold tracking-[0.14em] text-wi-on-dark-2 uppercase">
            Two quick things
          </motion.p>
          <motion.h2 {...rise} transition={{ duration: 0.45, delay: 0.06, ease: EASE }} className="mt-3 text-[30px] leading-[1.02] font-bold tracking-[-0.02em]">
            Add WITHIN to your home screen
          </motion.h2>
          <motion.p {...rise} transition={{ duration: 0.45, delay: 0.12, ease: EASE }} className="mt-3 max-w-[22rem] text-sm leading-relaxed text-wi-on-dark-2">
            It opens like an app and stays one tap away. Turn on a morning reminder so you never miss a check-in.
          </motion.p>
        </div>
        <motion.div {...rise} transition={{ duration: 0.45, delay: 0.18, ease: EASE }} className="space-y-3">
          <InstallCard />
          <EnablePush tone="dark" />
        </motion.div>
      </div>
      <ContinueButton onClick={onNext}>Continue</ContinueButton>
    </div>
  );
}
