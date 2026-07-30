'use client';

import { startTransition, useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronRight, Delete } from 'lucide-react';
import { loginAttempt, type LoginState } from '@/app/login/actions';
import { WithinLogo } from '@/components/brand/WithinLogo';
import { cn } from '@/lib/utils';

type RosterMember = { id: string; name: string };

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/** First letter of up to the first two words of a name, uppercased, for an initials tile. */
function initialsOf(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

/**
 * Two-step keypad login: pick a roster member ("who"), then key in a 4-digit
 * passcode ("code"). Full-black, one-handed, no typed input. Submits via
 * `loginAttempt` (Task 7) the instant the 4th digit lands; a wrong attempt
 * clears the code but keeps the selected member so the runner just retries.
 */
export function LoginFlow({ roster }: { roster: RosterMember[] }) {
  const router = useRouter();
  const [state, dispatch] = useActionState(loginAttempt, null);
  const [step, setStep] = useState<'who' | 'code'>('who');
  const [memberId, setMemberId] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  // Mirrors `state?.error` in local state (rather than reading `state`
  // directly) so `back`/`pick` can clear the visible message immediately —
  // useActionState has no reset API, so `state` itself keeps the last error
  // around until the next dispatch resolves.
  const [error, setError] = useState<'wrong' | 'rate' | null>(null);
  // Tracks which `state` value has already been applied to `error`/`code`,
  // so the sync below runs once per dispatch result. Adjusted directly during
  // render (React's "adjusting state" pattern) instead of an Effect: this is
  // a plain derivation of local state from `state`, not a sync with an
  // external system, so a render-phase update is the leaner fit and avoids
  // an extra effect-then-commit round trip.
  const [handledState, setHandledState] = useState<LoginState>(null);
  if (state !== handledState) {
    setHandledState(state);
    if (state && !('ok' in state)) {
      setError(state.error);
      if (state.error === 'wrong') setCode('');
    }
  }

  // Navigating away is a real external-system side effect, so it stays in
  // an Effect (unlike the render-phase sync above).
  useEffect(() => {
    if (state && 'ok' in state) router.replace('/today');
  }, [state, router]);

  function pick(member: RosterMember) {
    setMemberId(member.id);
    setName(member.name);
    setCode('');
    setError(null);
    setStep('code');
  }

  function back() {
    setStep('who');
    setCode('');
    setError(null);
  }

  function press(digit: string) {
    if (code.length >= 4) return;
    const next = code + digit;
    setCode(next);
    if (next.length === 4) {
      const formData = new FormData();
      formData.set('memberId', memberId);
      formData.set('passcode', next);
      // useActionState's dispatch expects to run inside a transition; calling
      // it bare from this click handler works but React warns and, under
      // React 19 in jsdom, can leave a render suspended mid-update. Wrapping
      // it explicitly avoids both.
      startTransition(() => dispatch(formData));
    }
  }

  function del() {
    setCode((current) => current.slice(0, -1));
  }

  const errorMessage =
    error === 'wrong'
      ? 'Wrong passcode. Try again.'
      : error === 'rate'
        ? 'Too many attempts. Wait a few minutes.'
        : '';

  if (step === 'who') {
    return (
      <div className="flex min-h-dvh flex-col bg-wi-black pt-16.5 pb-7.5 text-wi-paper">
        <div className="px-6.5">
          <WithinLogo kind="logotype" color="white" height={20} />
          <div className="mt-11.5">
            <p className="text-2xs font-bold tracking-[0.14em] text-wi-on-dark-2 uppercase">COHORT LOG</p>
            <h1 className="mt-3 text-[38px] leading-[0.94] font-bold tracking-[-0.03em] uppercase">
              Who is
              <br />
              logging?
            </h1>
          </div>
        </div>

        <div className="mt-6.5 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-6.5 pb-1">
          {roster.map((member) => (
            <button
              key={member.id}
              type="button"
              onClick={() => pick(member)}
              className="flex w-full shrink-0 items-center gap-3.25 rounded-lg border border-wi-on-dark-line bg-transparent px-3.5 py-3 text-left text-wi-paper transition duration-[120ms] ease-[var(--wi-ease-standard)] hover:bg-wi-on-dark-fill active:scale-[0.98]"
            >
              <span className="flex size-8.5 shrink-0 items-center justify-center rounded-md bg-wi-on-dark-fill text-xs font-bold">
                {initialsOf(member.name)}
              </span>
              <span className="flex-1 text-[15px] font-semibold">{member.name}</span>
              <ChevronRight className="size-5 text-wi-on-dark-3" />
            </button>
          ))}
        </div>

        <p className="px-6.5 pt-4 text-2xs font-bold tracking-widest text-wi-on-dark-3 uppercase">
          Cohort 01 · {roster.length} runners
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-wi-black">
      <div className="flex flex-1 flex-col px-6.5 pt-16.5 pb-6.5 text-wi-paper">
        <button
          type="button"
          onClick={back}
          aria-label="Back to who is logging"
          className="-ml-1 flex w-fit items-center bg-transparent p-0 text-wi-paper"
        >
          <ArrowLeft className="size-6" />
        </button>

        <div className="mt-7.5 flex items-center gap-3">
          <span className="flex size-9.5 items-center justify-center rounded-[9px] bg-wi-on-dark-fill text-[13px] font-bold">
            {initialsOf(name)}
          </span>
          <p className="text-base font-bold">{name}</p>
        </div>

        <h1 className="mt-7.5 text-center text-h2 leading-none font-bold tracking-[-0.02em]">Enter passcode</h1>

        <div className="mt-7.5 flex justify-center gap-5">
          {[0, 1, 2, 3].map((i) => {
            const filled = i < code.length;
            return (
              <span
                key={i}
                data-testid="dot"
                data-filled={filled}
                className={cn(
                  'size-4 rounded-full border-[1.5px] transition-colors',
                  filled ? 'border-wi-paper bg-wi-paper' : 'border-wi-on-dark-3 bg-transparent'
                )}
              />
            );
          })}
        </div>

        <p role="alert" className="mt-4.5 min-h-4.5 text-center text-xs font-semibold text-wi-paper">
          {errorMessage}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2.5 bg-wi-paper-dim px-5.5 pt-4.5 pb-7.5">
        {KEYPAD_ROWS.flat().map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => press(digit)}
            className="flex h-14 items-center justify-center rounded-md border border-wi-line bg-wi-paper text-[22px] font-bold tracking-[-0.02em] text-wi-black transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.95]"
          >
            {digit}
          </button>
        ))}
        <div aria-hidden="true" className="h-14" />
        <button
          type="button"
          onClick={() => press('0')}
          className="flex h-14 items-center justify-center rounded-md border border-wi-line bg-wi-paper text-[22px] font-bold tracking-[-0.02em] text-wi-black transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.95]"
        >
          0
        </button>
        <button
          type="button"
          onClick={del}
          aria-label="Delete last digit"
          className="flex h-14 items-center justify-center rounded-md border-none bg-transparent text-wi-black transition-transform duration-[120ms] ease-[var(--wi-ease-standard)] active:scale-[0.95]"
        >
          <Delete className="size-6" />
        </button>
      </div>
    </div>
  );
}
