'use client';
import type { ComponentProps, ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Every server-action form in the app posts over a phone connection, so the
// gap between tap and redirect is real and visible. Without a pending state a
// member cannot tell a slow save from a dead tap, taps again, and a form with
// no unique constraint behind it (session_logs) writes the row twice.
// useFormStatus reads the *enclosing* form's submission, so both components
// below must be rendered inside the <form> they submit, never around it.

type SubmitButtonProps = ComponentProps<typeof Button> & {
  /** Label while the action is in flight. Defaults to the idle children. */
  pendingLabel?: ReactNode;
};

/** Submit control for a server-action form on a light surface: shows a spinner and disables itself while the action is in flight, so a slow save reads as working and a second tap cannot double-post. */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending} {...props}>
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

type BareSubmitButtonProps = Omit<ComponentProps<'button'>, 'type'> & {
  pendingLabel?: ReactNode;
};

/** Same pending behaviour for the bespoke on-dark controls (History log out, the inline session delete) that are hand-styled rather than built on the Button primitive. */
export function BareSubmitButton({ children, pendingLabel, className, disabled, onClick, ...props }: BareSubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      onClick={onClick}
      className={cn('disabled:opacity-60 disabled:active:scale-100', className)}
      {...props}
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
