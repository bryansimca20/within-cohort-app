import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { members } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { updateFlagsAction } from './actions';
import { AddMemberForm, ResetPasscodeButton } from './MemberForms';

const inputClass =
  'rounded-[6px] border border-black/20 bg-transparent px-2 py-1 text-xs text-black dark:border-white/20 dark:text-white';

// Admin-only roster management: add members (a passcode is generated and
// shown once), toggle cohort/admin flags and schedule, and reset a member's
// passcode. Nothing here ever stores or logs a plaintext passcode; only the
// bcrypt hash is persisted.
export default async function AdminMembersPage() {
  await requireAdmin();

  const roster = await db.select().from(members).orderBy(asc(members.name));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Members</h1>
        <p className="mt-1 text-sm opacity-70">Add members, adjust cohort flags, and reset passcodes.</p>
      </div>

      <div className="rounded-[10px] border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-black">
        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] opacity-70">Add member</h2>
        <AddMemberForm />
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-black/10 dark:border-white/10">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-white text-left text-xs font-medium uppercase tracking-[0.15em] opacity-50 dark:border-white/10 dark:bg-black">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Cohort settings</th>
              <th className="px-4 py-3">Passcode</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-sm opacity-70">
                  No members yet. Add one above.
                </td>
              </tr>
            ) : (
              roster.map((m) => (
                <tr key={m.id} className="border-b border-black/10 bg-white align-top last:border-b-0 dark:border-white/10 dark:bg-black">
                  <td className="px-4 py-4 font-medium">{m.name}</td>
                  <td className="px-4 py-4">
                    <form action={updateFlagsAction} className="flex flex-wrap items-end gap-4">
                      <input type="hidden" name="memberId" value={m.id} />
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" name="inCohort" defaultChecked={m.inCohort} />
                        In cohort
                      </label>
                      <label className="flex items-center gap-1.5 text-xs">
                        <input type="checkbox" name="isAdmin" defaultChecked={m.isAdmin} />
                        Admin
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        Start date
                        <input
                          type="date"
                          name="cohortStartDate"
                          defaultValue={m.cohortStartDate ?? ''}
                          className={inputClass}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs">
                        Timezone
                        <input type="text" name="timezone" defaultValue={m.timezone} className={`${inputClass} w-32`} />
                      </label>
                      <button
                        type="submit"
                        className="rounded-[6px] border border-black/20 px-3 py-1.5 text-xs font-medium text-black/70 dark:border-white/20 dark:text-white/70"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-4">
                    <ResetPasscodeButton memberId={m.id} name={m.name} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
