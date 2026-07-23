import { asc } from 'drizzle-orm';
import { LockIcon, LogInIcon } from 'lucide-react';
import { db } from '@/db/client';
import { members } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { login } from './actions';

const ERROR_MESSAGES: Record<string, string> = {
  '1': 'Incorrect passcode. Try again.',
  rate: 'Too many attempts. Wait a few minutes, then try again.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? (ERROR_MESSAGES[error] ?? 'Something went wrong. Try again.') : null;

  const roster = await db
    .select({ id: members.id, name: members.name })
    .from(members)
    .orderBy(asc(members.name));

  return (
    <main className="flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LockIcon className="size-4 text-wi-ink-500" />
            <CardTitle className="text-xl">WITHIN Cohort Log</CardTitle>
          </div>
          <CardDescription>Sign in to log today.</CardDescription>
        </CardHeader>

        <CardContent>
          <form action={login} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="memberId">Name</Label>
              {/* Base UI Select renders its own hidden input carrying the raw
                  selected member id (not the label) under `name="memberId"`,
                  same mechanism as SessionTypeField's sessionType select. */}
              <Select name="memberId" required>
                <SelectTrigger id="memberId">
                  <SelectValue placeholder="Select your name" />
                </SelectTrigger>
                <SelectContent>
                  {roster.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                name="passcode"
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="characters"
                placeholder="RUN-1234"
                required
              />
            </div>

            {message && (
              <p role="alert" className="text-sm text-wi-black">
                {message}
              </p>
            )}

            <Button type="submit" size="lg" className="mt-2">
              <LogInIcon />
              Log in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
