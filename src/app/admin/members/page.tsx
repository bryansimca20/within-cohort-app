import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { members } from '@/db/schema';
import { requireAdmin } from '@/lib/session';
import { updateFlagsAction } from './actions';
import { AddMemberForm, ResetPasscodeButton } from './MemberForms';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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
        <h1 className="text-2xl font-semibold text-wi-black">Members</h1>
        <p className="mt-1 text-sm text-wi-ink-500">Add members, adjust cohort flags, and reset passcodes.</p>
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
              <TableHead>Name</TableHead>
              <TableHead>Cohort settings</TableHead>
              <TableHead>Passcode</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roster.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="py-6 text-sm whitespace-normal text-wi-ink-500">
                  No members yet. Add one above.
                </TableCell>
              </TableRow>
            ) : (
              roster.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="align-top font-medium text-wi-black">{m.name}</TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <form action={updateFlagsAction} className="flex flex-wrap items-end gap-4">
                      <input type="hidden" name="memberId" value={m.id} />
                      <label className="flex items-center gap-1.5 text-xs font-medium text-wi-black">
                        <Checkbox name="inCohort" defaultChecked={m.inCohort} />
                        In cohort
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-wi-black">
                        <Checkbox name="isAdmin" defaultChecked={m.isAdmin} />
                        Admin
                      </label>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`start-${m.id}`}>Start date</Label>
                        <Input
                          id={`start-${m.id}`}
                          type="date"
                          name="cohortStartDate"
                          defaultValue={m.cohortStartDate ?? ''}
                          className="h-9 w-38 text-xs"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`tz-${m.id}`}>Timezone</Label>
                        <Input
                          id={`tz-${m.id}`}
                          type="text"
                          name="timezone"
                          defaultValue={m.timezone}
                          className="h-9 w-32 text-xs"
                        />
                      </div>
                      <Button type="submit" variant="outline" size="sm">
                        Save
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell className="align-top whitespace-normal">
                    <ResetPasscodeButton memberId={m.id} name={m.name} />
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
