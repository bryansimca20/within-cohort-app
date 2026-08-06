'use client';

import { useFormStatus } from 'react-dom';
import { LoaderCircle } from 'lucide-react';

/** Submit control for the Finish beat's form. Reads the parent form's pending state via useFormStatus so it shows a spinner while completeOnboardingAction stamps onboardedAt and redirects, instead of appearing to hang. Must be rendered inside the <form>. */
export function EnterButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[8px] bg-wi-paper text-[12px] font-bold tracking-[0.08em] text-wi-black uppercase transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.98] disabled:active:scale-100"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Entering
        </>
      ) : (
        'Enter WITHIN'
      )}
    </button>
  );
}
