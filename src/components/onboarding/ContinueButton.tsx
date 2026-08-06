'use client';

import type { ReactNode } from 'react';

/** The flow's primary advance control: a full-width paper button in the thumb zone. `type="submit"` variant lets the Finish beat drive a form action. */
export function ContinueButton({
  children,
  onClick,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="flex h-[52px] w-full items-center justify-center rounded-[8px] bg-wi-paper text-[12px] font-bold tracking-[0.08em] text-wi-black uppercase transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.98]"
    >
      {children}
    </button>
  );
}
