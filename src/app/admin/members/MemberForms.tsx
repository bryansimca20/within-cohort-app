'use client';
import { useActionState } from 'react';
import { KeyRoundIcon, UserPlusIcon } from 'lucide-react';
import {
  addMemberAction,
  resetPasscodeAction,
  type AddMemberState,
  type ResetPasscodeState,
} from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialAddState: AddMemberState = { status: 'idle' };
const initialResetState: ResetPasscodeState = { status: 'idle' };

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

// One instance per member row: its own useActionState keeps each row's
// revealed plaintext isolated from every other row.
export function ResetPasscodeButton({ memberId, name }: { memberId: string; name: string }) {
  const [state, formAction, pending] = useActionState(resetPasscodeAction, initialResetState);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="name" value={name} />
      <Button type="submit" disabled={pending} variant="outline" size="sm">
        <KeyRoundIcon />
        {pending ? 'Resetting…' : 'Reset passcode'}
      </Button>
      {state.status === 'success' && (
        <p role="status" className="text-xs font-medium text-wi-black">
          New passcode: <strong className="font-bold">{state.plaintext}</strong>
          <br />
          Shown once. Send it now.
        </p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="text-xs text-wi-black">
          {state.message}
        </p>
      )}
    </form>
  );
}
