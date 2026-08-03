'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db as prodDb } from '@/db/client';
import { requireAdmin } from '@/lib/session';
import { setCohortStartDate } from '@/lib/cohort';
import { sendTestPush } from '@/lib/push';

/** Admin-only: set the cohort-wide start date. The whole phase calendar keys off
 *  it, so this is founder-gated and validated before it touches the config row. */
export async function updateCohortStartAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const startDate = String(formData.get('startDate') ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    redirect('/admin?startError=1');
  }

  await setCohortStartDate(prodDb, startDate);
  revalidatePath('/admin');
  redirect('/admin?startSaved=1');
}

// Type-only export from a "use server" file: erased at compile time, so it does
// not violate the "only async functions" constraint (same pattern as LoginState
// / AddMemberState). Drives the useActionState result in SendTestPushButton.
export type SendTestPushState =
  | { status: 'idle' }
  | { status: 'error'; message: string }
  | { status: 'success'; message: string };

/** Admin-only diagnostic: fire a live Web Push to the founder's own registered
 *  devices so the production pipeline can be verified without spamming runners.
 *  Sends only to the current admin's subscriptions, never the whole cohort.
 *  Takes no arguments (nothing about the send is user-supplied); the client
 *  drives it from a transition rather than a useActionState reducer. */
export async function sendTestPushAction(): Promise<SendTestPushState> {
  const admin = await requireAdmin();

  const { devices, sent, failed } = await sendTestPush(prodDb, admin.id);

  if (devices === 0) {
    return {
      status: 'error',
      message: 'No device registered for you yet. Turn on notifications on this device first, then send the test.',
    };
  }
  if (sent === 0) {
    return {
      status: 'error',
      message: `Reached ${devices} device(s) but none accepted the push (${failed} failed). Check the VAPID keys in production.`,
    };
  }
  return { status: 'success', message: `Sent to ${sent} of ${devices} device(s). Check for the notification.` };
}
