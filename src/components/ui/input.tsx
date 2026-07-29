import { Input as InputPrimitive } from '@base-ui/react/input';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const inputVariants = cva(
  'w-full min-w-0 rounded-[var(--wi-radius-control)] border border-wi-line bg-wi-paper px-[14px] text-base leading-none text-wi-black outline-none transition-[border-color,background-color,box-shadow] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] placeholder:text-wi-ink-300 focus-visible:border-wi-black focus-visible:ring-[3px] focus-visible:ring-black/15 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-[1.5px] aria-invalid:border-wi-black in-data-[surface=dark]:border-wi-on-dark-line in-data-[surface=dark]:bg-wi-on-dark-fill in-data-[surface=dark]:text-wi-paper in-data-[surface=dark]:placeholder:text-wi-on-dark-3 in-data-[surface=dark]:focus-visible:border-wi-paper in-data-[surface=dark]:focus-visible:ring-white/15',
  {
    variants: {
      size: {
        default: 'h-11',
        lg: 'h-[54px]',
      },
    },
    defaultVariants: {
      size: 'default',
    },
  }
);

/** WITHIN-restyled text input: hairline border, black focus ring, near-square radius. */
function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<'input'>, 'size'> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
