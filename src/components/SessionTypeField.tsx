'use client';

import { useId, useState } from 'react';
import { SESSION_TYPES } from '@/lib/validation';

type SessionTypeFieldProps = {
  defaultValue?: (typeof SESSION_TYPES)[number];
  defaultOtherValue?: string;
};

const LABELS: Record<(typeof SESSION_TYPES)[number], string> = {
  easy: 'Easy',
  long: 'Long',
  tempo: 'Tempo',
  interval: 'Interval',
  recovery: 'Recovery',
  race: 'Race',
  other: 'Other',
};

// The session-type <select> plus its conditional "other" text field. Field
// names (`sessionType`, `sessionTypeOther`) match sessionSchema keys exactly.
// The text field only mounts once "other" is selected, keeping the form
// tidy for the common case while still satisfying the schema's refine
// (sessionType "other" requires a non-empty sessionTypeOther).
export function SessionTypeField({ defaultValue = 'easy', defaultOtherValue = '' }: SessionTypeFieldProps) {
  const selectId = useId();
  const otherId = useId();
  const [type, setType] = useState<(typeof SESSION_TYPES)[number]>(defaultValue);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium">
          Session type
        </label>
        <select
          id={selectId}
          name="sessionType"
          value={type}
          onChange={(e) => setType(e.target.value as (typeof SESSION_TYPES)[number])}
          className="rounded-[6px] border border-black/20 bg-transparent px-3 py-3 text-base text-black dark:border-white/20 dark:text-white"
        >
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {type === 'other' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={otherId} className="text-sm font-medium">
            Describe the session
          </label>
          <input
            id={otherId}
            name="sessionTypeOther"
            type="text"
            maxLength={80}
            defaultValue={defaultOtherValue}
            required
            className="rounded-[6px] border border-black/20 bg-transparent px-3 py-3 text-base text-black placeholder:text-black/30 dark:border-white/20 dark:text-white dark:placeholder:text-white/30"
          />
        </div>
      )}
    </div>
  );
}
