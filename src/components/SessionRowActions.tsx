'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { deleteSessionAction } from '@/app/(app)/session/actions';

/** Per-session Edit + Delete controls for the dark Session and History surfaces.
 *  Delete is a two-tap inline confirm (no native confirm(), no dialog): the first
 *  tap arms the button, the second submits. Blur disarms it. */
export function SessionRowActions({ sessionId, from }: { sessionId: string; from: 'session' | 'history' }) {
  const [armed, setArmed] = useState(false);

  return (
    <div className="mt-1.5 flex items-center gap-4">
      <Link
        href={`/session/${sessionId}/edit?from=${from}`}
        className="inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.06em] text-wi-paper uppercase"
      >
        <Pencil className="size-3" />
        Edit
      </Link>
      <form action={deleteSessionAction.bind(null, sessionId)}>
        <button
          type="submit"
          aria-pressed={armed}
          onClick={(e) => {
            if (!armed) {
              e.preventDefault();
              setArmed(true);
            }
          }}
          onBlur={() => setArmed(false)}
          className="inline-flex items-center gap-1 text-[11px] font-bold tracking-[0.06em] text-wi-on-dark-2 uppercase"
        >
          <Trash2 className="size-3" />
          {armed ? 'Confirm delete?' : 'Delete'}
        </button>
      </form>
    </div>
  );
}
