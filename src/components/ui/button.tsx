import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-[var(--wi-radius-control)] border font-bold uppercase leading-none tracking-[0.14em] transition-[background-color,color,opacity,transform] duration-[120ms] ease-[cubic-bezier(0.2,0,0,1)] outline-none select-none active:scale-[0.97] focus-visible:ring-[3px] focus-visible:ring-black/15 disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'border-wi-black bg-wi-black text-wi-paper hover:opacity-[0.86]',
        secondary:
          'border-[1.5px] border-wi-black bg-transparent text-wi-black hover:bg-wi-black hover:text-wi-paper',
        outline:
          'border-[1.5px] border-wi-black bg-transparent text-wi-black hover:bg-wi-black hover:text-wi-paper',
        ghost: 'border-transparent bg-transparent text-wi-black hover:bg-wi-mist',
        destructive: 'border-wi-charcoal bg-wi-charcoal text-wi-paper hover:opacity-[0.86]',
        inverse: 'border-wi-paper bg-wi-paper text-wi-black hover:opacity-[0.86]',
        link: 'border-transparent bg-transparent font-medium normal-case tracking-normal text-wi-black underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-[34px] gap-2 px-[14px] text-xs',
        default: 'h-11 gap-2.5 px-[22px] text-sm',
        lg: 'h-[54px] gap-3 px-[30px] text-base',
        icon: 'size-11',
        'icon-sm': 'size-[34px]',
        'icon-lg': 'size-[54px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/** WITHIN-restyled action button: uppercase, bold, near-square corners. */
function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
