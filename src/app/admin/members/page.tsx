import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { members } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { updateMemberAction } from './actions';
import { AddMemberForm, PasscodeCell } from './MemberForms';
import { SubmitButton } from '@/components/SubmitButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Admin-only roster management: add members, rename them, toggle cohort/admin
// flags, and reveal or reset a passcode. Start date and timezone are
// cohort-wide config (env / constant), not set per member here. A passcode is
// stored in the clear so a founder can remind a member of it, but it is never
// rendered into this page's HTML: PasscodeCell fetches it through an
// admin-gated action only when asked.
export default async function AdminMembersPage() {
  await requireAdmin();

  const roster = await db.select().from(members).orderBy(asc(members.name));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-wi-black">Members</h1>
        <p className="mt-1 text-sm text-wi-ink-500">
          Add members, rename them, adjust cohort flags, and show or reset passcodes.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xs tracking-[0.15em]">Add member</CardTitle>
        </CardHeader>
        <CardContent>
          <AddMemberForm />
        </CardContent>
      </Card>

      <Card className="gap-0 py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Passcode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="py-6 text-sm whitespace-normal text-wi-ink-500">
                  No members yet. Add one above.
                </TableCell>
              </TableRow>
            ) : (
              roster.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="align-top whitespace-normal">
                    <form action={updateMemberAction} className="flex flex-wrap items-end gap-4">
                      <input type="hidden" name="memberId" value={m.id} />
                      <div className="flex min-w-40 flex-col gap-1.5">
                        <Label htmlFor={`name-${m.id}`}>Name</Label>
                        <Input id={`name-${m.id}`} type="text" name="name" defaultValue={m.name} required />
                      </div>
                      <label className="flex items-center gap-1.5 pb-2 text-xs font-medium text-wi-black">
                        <Checkbox name="inCohort" defaultChecked={m.inCohort} />
                        In cohort
                      </label>
                      <label className="flex items-center gap-1.5 pb-2 text-xs font-medium text-wi-black">
                        <Checkbox name="isAdmin" defaultChecked={m.isAdmin} />
                        Admin
                      </label>
                      <SubmitButton variant="outline" size="sm" pendingLabel="Saving" className="mb-1">
                        Save
                      </SubmitButton>
                    </form>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <PasscodeCell memberId={m.id} name={m.name} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
