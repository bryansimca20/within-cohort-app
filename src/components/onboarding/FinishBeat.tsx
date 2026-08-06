'use client';

import { motion, useReducedMotion } from 'motion/react';
import { completeOnboardingAction } from '@/app/welcome/actions';
import { EnterButton } from './EnterButton';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Final beat: a short confirmation over a form whose action stamps onboardedAt server-side and redirects to Today. A form action (not a client fetch) keeps the redirect on the server, so no router is needed here. */
export function FinishBeat({ name }: { name: string }) {
  const reduce = useReducedMotion();
  const rise = reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center">
        <motion.p
          {...rise}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-2xs font-bold tracking-[0.14em] text-wi-on-dark-2 uppercase"
        >
          You are set
        </motion.p>
        <motion.h1
          {...rise}
          transition={{ duration: 0.5, delay: 0.08, ease: EASE }}
          className="mt-3 text-[40px] leading-[0.94] font-bold tracking-[-0.03em] uppercase"
        >
          Log your first
          <br />
          morning, {name}
        </motion.h1>
      </div>
      <form action={completeOnboardingAction}>
        <EnterButton />
      </form>
    </div>
  );
}
