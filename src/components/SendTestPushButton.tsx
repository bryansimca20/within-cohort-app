'use client';

import { useState, useTransition } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { sendTestPushAction, type SendTestPushState } from '@/app/admin/actions';
import { Button } from '@/components/ui/button';

/**
 * Admin diagnostic control: fires a test Web Push to the founder's own devices
 * via sendTestPushAction and shows the delivery result inline. The send takes
 * no input, so it runs in a transition (not a useActionState reducer); pending
 * disables the button and swaps in a spinner so a slow send reads as working.
 */
export function SendTestPushButton() {
  const [state, setState] = useState<SendTestPushState>({ status: 'idle' });
  const [isPending, startTransition] = useTransition();

  function send() {
    startTransition(async () => {
      setState(await sendTestPushAction());
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="outline" size="sm" onClick={send} disabled={isPending}>
        {isPending ? <LoaderCircle className="animate-spin" /> : <Send />}
        {isPending ? 'Sending' : 'Send test notification'}
      </Button>
      {state.status === 'success' && <p className="text-sm font-medium text-wi-black">{state.message}</p>}
      {state.status === 'error' && (
        <p role="alert" className="text-sm text-wi-ink-500">
          {state.message}
        </p>
      )}
    </div>
  );
}
