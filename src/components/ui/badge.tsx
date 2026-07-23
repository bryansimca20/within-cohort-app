import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border px-2.5 py-0.5 text-2xs font-bold whitespace-nowrap uppercase tracking-[0.14em] transition-colors focus-visible:ring-[3px] focus-visible:ring-black/15 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: 'border-wi-black bg-wi-black text-wi-paper',
        secondary: 'border-transparent bg-wi-mist text-wi-black',
        outline: 'border-wi-line bg-transparent text-wi-black',
        destructive: 'border-wi-charcoal bg-wi-charcoal text-wi-paper',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/** WITHIN-restyled tag/status pill: uppercase, bold, wide tracking. */
function Badge({
  className,
  variant = 'default',
  render,
  ...props
}: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: 'badge',
      variant,
    },
  });
}

export { Badge, badgeVariants };
