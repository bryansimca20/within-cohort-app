'use client';
import { useState } from 'react';
import { maskDecimal } from '@/lib/decimal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type DecimalFieldProps = {
  name: string;
  label: string;
  placeholder?: string;
  /** Pre-formatted as the member reads it, trailing zeros already trimmed. */
  defaultValue?: string;
  /** Fraction digits the field accepts. Must not exceed the column's scale. */
  maxDecimals?: number;
};

// Decimal entry that survives a comma-decimal keypad. Unlike NumberField this
// one holds state and is `type="text"`: iOS builds the numeric keypad from the
// device region, so members in comma locales get a ',' key and no '.' key, and
// a native number input discards a value it cannot parse under its own locale
// rules - the field looks filled in and the server receives ''. Text plus
// `inputMode="decimal"` keeps the numeric keypad, accepts either separator,
// and masks on every keystroke so the fraction can never exceed maxDecimals.
// Nothing else is coerced here; parseDecimal in the schema normalises ',' to
// '.' on the way to the database.
export function DecimalField({ name, label, placeholder, defaultValue = '', maxDecimals = 2 }: DecimalFieldProps) {
  const [value, setValue] = useState(defaultValue);
  const id = `field-${name}`;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(maskDecimal(e.target.value, maxDecimals))}
        required
      />
    </div>
  );
}
