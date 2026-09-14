'use client';
import { useActionState, useState } from 'react';
import { EyeIcon, EyeOffIcon, KeyRoundIcon, UserPlusIcon } from 'lucide-react';
import {
  addMemberAction,
  resetPasscodeAction,
  revealPasscodeAction,
  type AddMemberState,
  type ResetPasscodeState,
  type RevealPasscodeState,
} from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialAddState: AddMemberState = { status: 'idle' };
const initialResetState: ResetPasscodeState = { status: 'idle' };
const initialRevealState: RevealPasscodeState = { status: 'idle' };

// Client form so the server action's returned plaintext can render into the
// page without ever touching a redirect/query string: useActionState keeps
// it in component state only, so it shows once and is gone on refresh or
// navigation, and it never appears in browser history.
export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(addMemberAction, initialAddState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-40 flex-col gap-1.5">
          <Label htmlFor="add-member-name">Name</Label>
          <Input id="add-member-name" type="text" name="name" required />
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm font-medium text-wi-black">
          <Checkbox name="inCohort" defaultChecked />
          In cohort
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-wi-black">
          <Checkbox name="isAdmin" />
          Admin
        </label>
      </div>

      <div>
        <Button type="submit" disabled={pending} variant="outline" size="sm">
          <UserPlusIcon />
          {pending ? 'Adding…' : 'Add member'}
        </Button>
      </div>

      {state.status === 'success' && (
        <Card size="sm">
          <CardContent>
            <p role="status" className="text-sm text-wi-black">
              Passcode for {state.name}: <strong className="font-bold">{state.plaintext}</strong>
            </p>
            <p className="mt-1 text-2xs font-bold uppercase tracking-[0.14em] text-wi-ink-500">
              Shown once. Send it now.
            </p>
          </CardContent>
        </Card>
      )}
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-wi-black">
          {state.message}
        </p>
      )}
    </form>
  );
}

// One instance per member row: its own useActionState pair keeps each row's
// passcode isolated from every other row. Reveal and reset deliberately share
// this one component so they share one display area. Kept apart, a reset would
// leave the previously revealed code on screen even though it had just stopped
// working, and a founder would read out a dead passcode.
export function PasscodeCell({ memberId, name }: { memberId: string; name: string }) {
  const [revealState, revealAction, revealing] = useActionState(revealPasscodeAction, initialRevealState);
  const [resetState, resetAction, resetting] = useActionState(resetPasscodeAction, initialResetState);
  const [hidden, setHidden] = useState(false);

  // A reset supersedes a reveal: it is the newer, and only valid, code.
  const showing = resetState.status === 'success' ? null : revealState.status === 'success' && !hidden;

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {showing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setHidden(true)}>
            <EyeOffIcon />
            Hide
          </Button>
        ) : (
          <form action={revealAction} onSubmit={() => setHidden(false)}>
            <input type="hidden" name="memberId" value={memberId} />
            <Button type="submit" disabled={revealing} variant="outline" size="sm">
              <EyeIcon />
              {revealing ? 'Showing…' : 'Show passcode'}
            </Button>
          </form>
        )}

        <form action={resetAction}>
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="name" value={name} />
          <Button type="submit" disabled={resetting} variant="outline" size="sm">
            <KeyRoundIcon />
            {resetting ? 'Resetting…' : 'Reset'}
          </Button>
        </form>
      </div>

      {resetState.status === 'success' ? (
        <p role="status" className="text-xs font-medium text-wi-black">
          New passcode:{' '}
          <strong className="font-bold tabular-nums tracking-[0.2em]">{resetState.plaintext}</strong>
          <br />
          <span className="text-wi-ink-500">The old code no longer works. Send this one now.</span>
        </p>
      ) : (
        showing && (
          <p role="status" className="text-xs font-medium text-wi-black">
            Passcode:{' '}
            <strong className="font-bold tabular-nums tracking-[0.2em]">
              {revealState.status === 'success' ? revealState.plaintext : ''}
            </strong>
          </p>
        )
      )}

      {revealState.status === 'error' && resetState.status !== 'success' && (
        <p role="alert" className="text-xs text-wi-ink-500">
          {revealState.message}
        </p>
      )}
      {resetState.status === 'error' && (
        <p role="alert" className="text-xs text-wi-black">
          {resetState.message}
        </p>
      )}
    </div>
  );
}
