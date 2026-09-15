'use client';

import { motion, useReducedMotion } from 'motion/react';
import { WithinLogo } from '@/components/brand/WithinLogo';
import { ContinueButton } from './ContinueButton';

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } } };
const rise = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Beat 0: the cinematic brand moment. Staged reveal of the logotype, the runner's name, and one mission line. Reduced-motion collapses the stagger to the instant, readable end state. */
export function WelcomeBeat({ name, onNext }: { name: string; onNext: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      variants={reduce ? undefined : container}
      initial={reduce ? false : 'hidden'}
      animate={reduce ? false : 'show'}
      className="flex flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col justify-center">
        <motion.div variants={reduce ? undefined : rise}>
          <WithinLogo kind="logotype" color="white" height={26} priority />
        </motion.div>
        <motion.p
          variants={reduce ? undefined : rise}
          className="mt-11 text-2xs font-bold tracking-[0.14em] text-wi-on-dark-2 uppercase"
        >
          Cohort 01
        </motion.p>
        <motion.h1
          variants={reduce ? undefined : rise}
          className="mt-3 text-[40px] leading-[0.94] font-bold tracking-[-0.03em] uppercase"
        >
          Welcome,
          <br />
          {name}
        </motion.h1>
        <motion.p
          variants={reduce ? undefined : rise}
          className="mt-5 max-w-[22rem] text-sm leading-relaxed text-wi-on-dark-2"
        >
          For the next six weeks you log one honest signal a day. This is where it lives.
        </motion.p>
      </div>
      <motion.div variants={reduce ? undefined : rise}>
        <ContinueButton onClick={onNext}>Begin</ContinueButton>
      </motion.div>
    </motion.div>
  );
}
