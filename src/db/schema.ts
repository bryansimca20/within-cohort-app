import { pgTable, uuid, text, boolean, date, integer, numeric, timestamp, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';

export const phaseEnum = pgEnum('phase', ['baseline', 'within']);
export const sessionTypeEnum = pgEnum('session_type', ['easy','long','tempo','interval','recovery','race','other']);

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  passcodeHash: text('passcode_hash').notNull(),
  inCohort: boolean('in_cohort').notNull().default(false),
  isAdmin: boolean('is_admin').notNull().default(false),
  cohortStartDate: date('cohort_start_date'),
  timezone: text('timezone').notNull().default('Asia/Jakarta'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const dailyCheckins = pgTable('daily_checkins', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  localDate: date('local_date').notNull(),
  phase: phaseEnum('phase').notNull(),
  recovery: integer('recovery').notNull(),
  restingHr: integer('resting_hr').notNull(),
  sleepHours: numeric('sleep_hours', { precision: 3, scale: 1 }).notNull(),
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
  tookServing: boolean('took_serving'),
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
