'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db as prodDb } from '@/db/client';
import { requireAdmin } from '@/lib/session';
import { setCohortStartDate } from '@/lib/cohort';

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
