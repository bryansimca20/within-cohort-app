'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { sendTestPushAction, type SendTestPushState } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Admin diagnostic control: fires a test Web Push to the founder's own devices
 * via sendTestPushAction and shows the delivery result inline. The send takes
 * no input, so it runs in a transition (not a useActionState reducer); pending
 * disables the button and swaps in a spinner so a slow send reads as working.
 * `tone` picks the palette: `light` (default) for the admin card, `dark` for
 * the black History screen.
 */
export function SendTestPushButton({ tone = 'light' }: { tone?: 'dark' | 'light' } = {}) {
  const [state, setState] = useState<SendTestPushState>({ status: 'idle' });
  const [isPending, startTransition] = useTransition();
  const dark = tone === 'dark';

  function send() {
    startTransition(async () => {
      setState(await sendTestPushAction());
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={dark ? 'secondary' : 'outline'}
        size="sm"
        onClick={send}
        disabled={isPending}
        className={cn(
          dark && 'w-full border-wi-on-dark-3 text-wi-paper hover:bg-wi-on-dark-fill hover:text-wi-paper disabled:opacity-60'
        )}
      >
        {isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
        {isPending ? 'Sending' : 'Send test notification'}
      </Button>
      {state.status === 'success' && (
        <p className={cn('text-sm font-medium', dark ? 'text-wi-paper' : 'text-wi-black')}>{state.message}</p>
      )}
      {state.status === 'error' && (
        <p role="alert" className={cn('text-sm', dark ? 'text-wi-on-dark-2' : 'text-wi-ink-500')}>
          {state.message}
        </p>
      )}
    </div>
  );
}
