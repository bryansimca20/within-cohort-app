'use client';

import { useId, useState } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
// (sessionType "other" requires a non-empty sessionTypeOther). The shadcn
// Select is given `name="sessionType"`; Base UI renders its own hidden input
// carrying the raw selected value (not the label), so submission needs no
// extra wiring.
export function SessionTypeField({ defaultValue = 'easy', defaultOtherValue = '' }: SessionTypeFieldProps) {
  const selectId = useId();
  const otherId = useId();
  const [type, setType] = useState<(typeof SESSION_TYPES)[number]>(defaultValue);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={selectId}>Session type</Label>
        <Select
          name="sessionType"
          value={type}
          onValueChange={(next) => {
            if (next !== null) setType(next);
          }}
        >
          <SelectTrigger id={selectId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SESSION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === 'other' && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={otherId}>Describe the session</Label>
          <Input id={otherId} name="sessionTypeOther" type="text" maxLength={80} defaultValue={defaultOtherValue} required />
        </div>
      )}
    </div>
  );
}
