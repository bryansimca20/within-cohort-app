'use client';
import { useActionState } from 'react';
import {
  addMemberAction,
  resetPasscodeAction,
  type AddMemberState,
  type ResetPasscodeState,
} from './actions';

const initialAddState: AddMemberState = { status: 'idle' };
const initialResetState: ResetPasscodeState = { status: 'idle' };

const fieldClass =
  'rounded-[6px] border border-black/20 bg-transparent px-3 py-2 text-sm text-black dark:border-white/20 dark:text-white';
const labelClass = 'flex flex-col gap-1.5 text-sm';
const checkboxLabelClass = 'flex items-center gap-2 text-sm';
const buttonClass =
  'rounded-[6px] border border-black/20 px-3 py-1.5 text-xs font-medium text-black/70 hover:opacity-100 disabled:opacity-40 dark:border-white/20 dark:text-white/70';

// Client form so the server action's returned plaintext can render into the
// page without ever touching a redirect/query string: useActionState keeps
// it in component state only, so it shows once and is gone on refresh or
// navigation, and it never appears in browser history.
export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(addMemberAction, initialAddState);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <label className={labelClass}>
          Name
          <input type="text" name="name" required className={`${fieldClass} min-w-[10rem]`} />
        </label>
        <label className={labelClass}>
          Start date
          <input type="date" name="cohortStartDate" className={fieldClass} />
        </label>
        <label className={labelClass}>
          Timezone
          <input
            type="text"
            name="timezone"
            defaultValue="Asia/Jakarta"
            className={`${fieldClass} w-40`}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className={checkboxLabelClass}>
          <input type="checkbox" name="inCohort" defaultChecked />
          In cohort
        </label>
        <label className={checkboxLabelClass}>
          <input type="checkbox" name="isAdmin" />
          Admin
        </label>
      </div>

      <div>
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? 'Adding…' : 'Add member'}
        </button>
      </div>

      {state.status === 'success' && (
        <p role="status" className="rounded-[6px] border border-black/20 px-3 py-2 text-sm font-medium dark:border-white/20">
          Passcode for {state.name}: <strong>{state.plaintext}</strong> (shown once, send it now)
        </p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="text-sm">
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
      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? 'Resetting…' : 'Reset passcode'}
      </button>
      {state.status === 'success' && (
        <p role="status" className="text-xs font-medium">
          New passcode: <strong>{state.plaintext}</strong>
          <br />
          (shown once, send it now)
        </p>
      )}
      {state.status === 'error' && (
        <p role="alert" className="text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}
