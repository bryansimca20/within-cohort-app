import { asc } from 'drizzle-orm';
import { db } from '@/db/client';
import { members } from '@/db/schema';
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
      <div className="w-full max-w-sm rounded-md border border-black/10 bg-white p-8 text-black dark:border-white/10 dark:bg-black dark:text-white">
        <h1 className="text-xl font-semibold">WITHIN Cohort Log</h1>
        <p className="mt-1 text-sm opacity-60">Sign in to log today.</p>

        <form action={login} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="memberId" className="text-sm font-medium">
              Name
            </label>
            <select
              id="memberId"
              name="memberId"
              required
              defaultValue=""
              className="rounded border border-black/20 bg-transparent px-3 py-2 text-sm text-black dark:border-white/20 dark:text-white"
            >
              <option value="" disabled>
                Select your name
              </option>
              {roster.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="passcode" className="text-sm font-medium">
              Passcode
            </label>
            <input
              id="passcode"
              name="passcode"
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="RUN-1234"
              required
              className="rounded border border-black/20 bg-transparent px-3 py-2 text-sm text-black placeholder:text-black/30 dark:border-white/20 dark:text-white dark:placeholder:text-white/30"
            />
          </div>

          {message && (
            <p role="alert" className="text-sm">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Log in
          </button>
        </form>
      </div>
    </main>
  );
}
