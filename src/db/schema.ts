import { pgTable, uuid, text, boolean, integer, numeric, timestamp, pgEnum, uniqueIndex, date } from 'drizzle-orm/pg-core';

export const phaseEnum = pgEnum('phase', ['baseline', 'within']);
export const sessionTypeEnum = pgEnum('session_type', ['easy','long','tempo','interval','recovery','race','other']);

// Cohort-wide config, one row (id is pinned to 1). Holds the single start date
// the whole phase calendar is computed from, set by a founder in the admin area.
// Nullable start_date means "not set yet"; readers fall back to the
// COHORT_START_DATE env var as a bootstrap default.
export const cohortConfig = pgTable('cohort_config', {
  id: integer('id').primaryKey().default(1),
  startDate: date('start_date'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  passcodeHash: text('passcode_hash').notNull(),
  // The same passcode in the clear, so a founder can remind a member of the
  // code they already have instead of resetting it. Nullable: members created
  // before this column existed have a hash but no recoverable plaintext.
  // passcodeHash stays the only value login verifies against.
  passcodePlain: text('passcode_plain'),
  inCohort: boolean('in_cohort').notNull().default(false),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
});

export const dailyCheckins = pgTable('daily_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  localDate: date('local_date').notNull(),
  phase: phaseEnum('phase').notNull(),
  recovery: integer('recovery').notNull(),
  restingHr: integer('resting_hr').notNull(),
  // Heart rate variability in milliseconds, as the watch reports it. Nullable
  // and optional on the form: not every device reports HRV every morning, and
  // a guessed value is worse than a missing one for the phase-2 analysis.
  // Rows written before this column existed have no value either.
  hrvMs: integer('hrv_ms'),
  // Sleep duration as whole minutes. Members enter it as 'h:mm' on the
  // check-in form, so an integer minute count is the only lossless store:
  // decimal hours cannot hold 6:07 exactly at any fixed scale a member
  // would recognise on the way back out.
  sleepMinutes: integer('sleep_minutes').notNull(),
  // Sleep duration as whole minutes. Members enter it as 'h:mm' on the
  // check-in form, so an integer minute count is the only lossless store:
  // decimal hours cannot hold 6:07 exactly at any fixed scale a member
  // would recognise on the way back out.
  hooperSleep: integer('hooper_sleep').notNull(),
  hooperFatigue: integer('hooper_fatigue').notNull(),
  hooperSoreness: integer('hooper_soreness').notNull(),
  hooperStress: integer('hooper_stress').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ memberDay: uniqueIndex('checkin_member_day').on(t.memberId, t.localDate) }));

export const sessionLogs = pgTable('session_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  localDate: date('local_date').notNull(),
  phase: phaseEnum('phase').notNull(),
  sessionType: sessionTypeEnum('session_type').notNull(),
  sessionTypeOther: text('session_type_other'),
  rpe: integer('rpe').notNull(),
  durationMin: integer('duration_min').notNull(),
  distanceKm: numeric('distance_km', { precision: 4, scale: 1 }).notNull(),
  // Servings taken this session. Null for baseline rows (no product), 0 when
  // a within-phase member took none, otherwise the count they took.
  servings: integer('servings'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Member = typeof members.$inferSelect;
