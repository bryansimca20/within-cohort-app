'use client';

import { motion } from 'motion/react';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import { BASELINE_DAYS, WITHIN_DAYS } from '@/lib/phase';

export type TeachBeatData = {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  Visual: ComponentType;
};

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

// One week per 7 cells, two weeks per row, so a 14-day strip is one row and a
// 28-day strip is two. Cell width stays identical between the two phases, which
// is what makes Within read as visibly twice as long as Baseline.
const CELLS_PER_ROW = 14;

/** Two filling ledger strips, mirroring the Today screen's baseline/within ledgers. */
function ProtocolVisual() {
  const strip = (prefix: string, days: number) => (
    <div className="space-y-1.5">
      {Array.from({ length: Math.ceil(days / CELLS_PER_ROW) }, (_, row) => (
        <div key={`${prefix}-row-${row}`} className="flex gap-1.5">
          {Array.from({ length: CELLS_PER_ROW }, (_, col) => {
            const i = row * CELLS_PER_ROW + col;
            return (
              <motion.span
                key={`${prefix}-${i}`}
                initial={{ opacity: 0.25 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.025, duration: 0.3 }}
                className="h-5 flex-1 rounded-[3px] bg-wi-paper"
              />
            );
          })}
        </div>
      ))}
    </div>
  );
  return (
    <div className="w-full space-y-3">
      <p className="text-[10px] font-bold tracking-[0.14em] text-wi-on-dark-3 uppercase">
        Baseline · {BASELINE_DAYS} days
      </p>
      {strip('b', BASELINE_DAYS)}
      <p className="pt-1 text-[10px] font-bold tracking-[0.14em] text-wi-on-dark-3 uppercase">
        Within · {WITHIN_DAYS} days
      </p>
      {strip('w', WITHIN_DAYS)}
    </div>
  );
}

/** A five-point "how you feel" scale (labelled, e.g. Fatigue) with one value selected, over a recovery fill bar. Mirrors the real check-in's 1-5 Hooper pills. */
function CheckinVisual() {
  return (
    <div className="w-full space-y-4">
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-wi-paper">Fatigue</span>
          <span className="text-2xs text-wi-on-dark-3">1 low · 5 high</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <motion.span
              key={n}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: n * 0.05, duration: 0.3 }}
              className={cn(
                'flex h-11 flex-1 items-center justify-center rounded-[8px] border text-[15px] font-bold',
                n === 4
                  ? 'border-wi-paper bg-wi-paper text-wi-black'
                  : 'border-wi-on-dark-line bg-wi-on-dark-fill text-wi-on-dark-2'
              )}
            >
              {n}
            </motion.span>
          ))}
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-wi-on-dark-fill">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: '62%' }}
          transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
          className="h-full rounded-full bg-wi-paper"
        />
      </div>
    </div>
  );
}

/** A session card whose rows stagger in. */
function SessionVisual() {
  const rows: Array<[string, string]> = [
    ['Type', 'Long run'],
    ['RPE', '6'],
    ['Distance', '18.0 km'],
  ];
  return (
    <div className="w-full rounded-lg border border-wi-on-dark-line p-4">
      {rows.map(([label, value], i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
          className="flex items-center justify-between border-b border-wi-on-dark-line py-2 last:border-0"
        >
          <span className="text-[11px] font-bold tracking-[0.1em] text-wi-on-dark-3 uppercase">{label}</span>
          <span className="text-sm font-bold">{value}</span>
        </motion.div>
      ))}
    </div>
  );
}

/** A big streak number beside a few history rows. */
function HistoryVisual() {
  return (
    <div className="flex w-full items-center gap-5">
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="text-[64px] leading-none font-bold tracking-[-0.045em]"
      >
        14
      </motion.span>
      <div className="flex-1 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
            className="h-4 rounded-[3px] bg-wi-on-dark-fill"
          />
        ))}
      </div>
    </div>
  );
}

export const teachBeats: TeachBeatData[] = [
  {
    key: 'protocol',
    eyebrow: 'The protocol',
    title: 'Two weeks, then four',
    body: 'Baseline first: log as you are, no product. Then Within: one sachet daily. The same signals throughout.',
    Visual: ProtocolVisual,
  },
  {
    key: 'checkin',
    eyebrow: 'Every morning',
    title: 'One check-in a day',
    body: 'Before you train: recovery, resting heart rate, hours of sleep, and how you feel across sleep, fatigue, soreness and stress. The same check-in every day, baseline and within. About twenty seconds.',
    Visual: CheckinVisual,
  },
  {
    key: 'session',
    eyebrow: 'After a quality session',
    title: 'Log the session',
    body: 'Type, effort, duration, distance. Log a long or quality session while the numbers are fresh.',
    Visual: SessionVisual,
  },
  {
    key: 'history',
    eyebrow: 'Your record',
    title: 'A streak worth keeping',
    body: 'Every entry is kept and your streak grows. Miss a day and it shows as an honest gap.',
    Visual: HistoryVisual,
  },
];
