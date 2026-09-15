'use client';
import { useState } from 'react';
import { maskHhMm } from '@/lib/duration';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DurationFieldProps = {
  name: string;
  label: string;
  /** Pre-formatted 'h:mm', as `formatHhMm` renders it. */
  defaultValue?: string;
};

// Clock-style duration entry. Unlike NumberField this one holds state: the
// value is masked on every keystroke so the colon appears without the member
// typing it, which matters because the iOS numeric keypad has no colon key.
// `type="text"` is deliberate - a number input would reject the colon outright.
export function DurationField({ name, label, defaultValue = '' }: DurationFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="7:30"
        value={value}
        onChange={(e) => setValue(maskHhMm(e.target.value))}
        required
      />
    </div>
  );
}
