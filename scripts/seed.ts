// ============================================================================
// EDIT THIS ROSTER: real names and in_cohort/is_admin flags before running
// for real. The founder has not supplied the actual cohort roster yet, so
// everything below is a placeholder that must NOT be run against a production
// database as-is. The cohort start date is not seeded here: a founder sets it
// in Admin (the cohort_config row).
// ============================================================================
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { members } from '@/db/schema';
import { generatePasscode, hashPasscode } from '@/lib/passcode';

type RosterEntry = {
  name: string;
  inCohort: boolean;
  isAdmin: boolean;
};

const ROSTER: RosterEntry[] = [
  { name: 'Runner One', inCohort: true, isAdmin: false },
  { name: 'Runner Two', inCohort: true, isAdmin: false },
  { name: 'Runner Three', inCohort: true, isAdmin: false },
  { name: 'Runner Four', inCohort: true, isAdmin: false },
  { name: 'Runner Five', inCohort: true, isAdmin: false },
  { name: 'Runner Six', inCohort: true, isAdmin: false },
  { name: 'Runner Seven', inCohort: true, isAdmin: false },
  { name: 'Founder One', inCohort: false, isAdmin: true },
  { name: 'Founder Two', inCohort: false, isAdmin: true },
];

type SeedResult = { name: string; note: string; created: boolean };

async function seed(): Promise<SeedResult[]> {
  const results: SeedResult[] = [];

  for (const entry of ROSTER) {
    const [existing] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.name, entry.name));

    if (existing) {
      results.push({ name: entry.name, note: 'already exists, skipped', created: false });
      continue;
    }

    const passcode = generatePasscode();
    const passcodeHash = await hashPasscode(passcode);

    await db.insert(members).values({
      name: entry.name,
      passcodeHash,
      inCohort: entry.inCohort,
      isAdmin: entry.isAdmin,
    });

    results.push({ name: entry.name, note: passcode, created: true });
  }

  return results;
}

seed()
  .then((results) => {
    console.log('\nWITHIN Cohort Log seed results. Passcodes below are shown once: copy them now.\n');
    for (const r of results) {
      const label = r.created ? r.note : `(${r.note})`;
      console.log(`  ${r.name.padEnd(20)} ${label}`);
    }
    console.log('');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
