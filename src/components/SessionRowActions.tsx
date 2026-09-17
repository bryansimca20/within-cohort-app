'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFormStatus } from 'react-dom';
import { LoaderCircle, Pencil, Trash2 } from 'lucide-react';
import { deleteSessionAction } from '@/app/(app)/session/actions';

const ACTION_CLASS =
  'inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.06em] uppercase disabled:opacity-60';

/** The delete half of a session row. Split out of SessionRowActions because
 *  useFormStatus reports the *enclosing* form's submission, so it has to be a
 *  child of the form rather than the component that renders it. Delete is a
 *  two-tap inline confirm (no native confirm(), no dialog): the first tap arms
 *  the button, the second submits. Blur disarms it. Once armed and submitted
 *  the button disables and shows a spinner, so a slow round trip cannot be
 *  mistaken for a dead tap and tapped again. */
function DeleteButton() {
  const { pending } = useFormStatus();
  const [armed, setArmed] = useState(false);

  return (
    <button
      type="submit"
      aria-pressed={armed}
      aria-busy={pending}
      disabled={pending}
      onClick={(e) => {
        if (!armed) {
          e.preventDefault();
          setArmed(true);
        }
      }}
      onBlur={() => setArmed(false)}
      className={`${ACTION_CLASS} text-wi-on-dark-2`}
    >
      {pending ? <LoaderCircle aria-hidden="true" className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
      {pending ? 'Deleting' : armed ? 'Confirm delete?' : 'Delete'}
    </button>
  );
}

/** Per-session Edit + Delete controls for the dark Session and History surfaces. */
export function SessionRowActions({ sessionId, from }: { sessionId: string; from: 'session' | 'history' }) {
  return (
    <div className="mt-1.5 flex items-center gap-4">
      <Link href={`/session/${sessionId}/edit?from=${from}`} className={`${ACTION_CLASS} text-wi-paper`}>
        <Pencil className="size-3" />
        Edit
      </Link>
      <form action={deleteSessionAction.bind(null, sessionId)}>
        <DeleteButton />
      </form>
    </div>
  );
}
