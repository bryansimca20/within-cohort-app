# Backfill Missed Days + Edit Past Logs — Design

- **Date:** 2026-09-21
- **Status:** Implemented 2026-09-21 (tests, lint, type-check and build green)
- **Owner:** Founders
- **Supersedes:** the "no backfill in v1" and "check-ins are same-local-day editable only"
  clauses of the Edit policy in `CLAUDE.md` and in
  `2026-07-23-within-cohort-log-design.md`.

---

## 1. Problem

A member who misses a morning has no way to record that day, ever. History renders only
days that already have rows, so a gap is invisible except as an absence, and there is no
affordance on it. Check-ins are editable for the local day only, so a number typed wrong
on Tuesday is wrong permanently from Wednesday on.

Both limits were deliberate in v1: a missed day was defined as a visible gap rather than
an invented row. In practice the cohort loses real days to travel, a dead phone, and a
forgotten 7 a.m., and the data those days would have held is recoverable from the watch
long after the fact. The completeness of the baseline is the protocol's single most
important outcome, and an unfillable gap costs more than a late entry does.

This reverses the policy deliberately, and pays for it with provenance: every row records
when it was actually written, and a late entry is visible as such to founders and to the
phase-2 analysis.

## 2. Scope + guardrails

**In scope**

- Any protocol day from the cohort start date through today can be logged, whether or not
  it was logged at the time.
- Any past check-in can be edited for the life of the protocol, matching the policy
  sessions already have.
- Sessions can be added to a past day, not only edited and deleted there.
- History lists every protocol day, logged or not, with a log affordance on the empty ones.
- A late entry is derivable, shown to founders, and exported.

**Guardrails**

- **Phase stamps from the target date, never from today.** This is the load-bearing rule.
  A baseline day filled in during week five stores `phase: 'baseline'` and therefore
  `servings: null`. Stamping it `within` would contaminate the baseline-vs-within
  comparison the entire protocol exists to produce.
- No future dates. A target date after today (Jakarta) is rejected.
- No pre-start dates. A target date before the cohort start date is rejected.
- When the protocol completes, everything locks, backfill included. Unfilled gaps freeze
  permanently. The end of the window is not a deadline extension.
- Every guard lives in the pure core, not the UI. The server action wrapper is reachable
  by direct POST.
- Capture-only still holds. Nothing here computes, charts, or interprets. `logged_late` is
  provenance, not analysis.

**Out of scope**

- Any founder-side ability to write or correct a member's rows. Members own their data.
- Any audit trail of what a value was before an edit. The row holds the current answer.
- Reminder changes. The cron keeps nagging about today only.
- Any limit on how often a row can be edited.

## 3. Data layer

**No migration.** `daily_checkins` already carries the unique `(member_id, local_date)`
index that makes a backfill a clean upsert, and both tables already carry `created_at`.
Nothing new is stored.

### Changed cores

```
saveCheckin(db, member, input, now, startDate, targetDate = today): Promise<void>
saveSession(db, member, input, now, startDate, targetDate = today): Promise<void>
```

`targetDate` is a `'YYYY-MM-DD'` Jakarta calendar date and becomes the row's `localDate`.
It is **appended with a default of today** rather than inserted mid-signature: today's
7 a.m. path keeps calling the cores exactly as it does now, which leaves the ~27 existing
call sites (and the behaviour they pin) untouched instead of mechanically rewritten. `now`
stops being the source of the date and keeps two jobs: stamping `updatedAt`, and serving
as the clock the guards compare against.

Both cores delegate validation to one shared helper, `assertLoggableDate` in
`src/lib/logDate.ts`, which checks in this order and returns `{ localDate, phase }`:

1. `targetDate` matches `^\d{4}-\d{2}-\d{2}$` and parses to a real calendar date.
2. `getPhase(startDate, localDateFor(COHORT_TIMEZONE, now)).state !== 'complete'`.
3. `targetDate <= localDateFor(COHORT_TIMEZONE, now)`.
4. `getPhase(startDate, targetDate).state` is `'baseline'` or `'within'`.

The completion check runs before anything about the target day, so a closed protocol
rejects every write with the same message regardless of which day was aimed at. The row's
`phase` is the state from step 4. The `/day/[date]` page calls the same helper, so the
screen and the write agree on what is loggable by construction rather than by duplication. `saveSession` forces `servings: null`
when that state is `'baseline'`, regardless of what the form sent, exactly as it does today
for a same-day baseline session.

`saveCheckin` keeps its existing `onConflictDoUpdate` on `(memberId, localDate)`, which is
what makes editing a past check-in the same code path as creating one. Postgres does not
touch `created_at` on the update branch, so the original write instant survives every
later edit.

`updateSession` and `deleteSession` are unchanged. They already permit editing any session
in the window and never move a row's `localDate` or `phase`.

### New pure helpers in `src/lib/history.ts`

```ts
/** True when the row was written on a later Jakarta day than the day it describes. */
isLateEntry(localDate: string, createdAt: Date): boolean

/** Every protocol day from start through today, newest first, rows merged in. */
buildLedger(startDate: string, todayISO: string, groups: DayGroup[]): LedgerDay[]
```

`isLateEntry` compares `localDateFor(COHORT_TIMEZONE, createdAt)` against `localDate`. It
must convert to Jakarta first: a row written at 23:30 UTC belongs to the next Jakarta day,
and a naive UTC comparison marks it wrongly.

`LedgerDay` is `DayGroup & { logged: boolean }`. `buildLedger` generates every date from
`startDate` through `todayISO`, capped at the last day of the protocol window, merges the
grouped rows in by date, derives the phase for a day with no rows from `startDate`, and
sorts newest first. A day is `logged` when it has a check-in or at least one session.

`splitLocalDate` moves out of `HistoryDayCard` into `src/lib/dayLabel.ts`, since the missed-day
row needs the same UTC-pinned day/weekday split.

`groupByDate` and `computeStreak` are untouched. The streak heals by itself when a gap is
filled, because it reads dates and knows nothing about when they were written. The
completion percentage rises retroactively for the same reason. Both are the intended
behaviour and cost no code.

### `"use server"` wrappers

`saveCheckinAction` and `saveSessionAction` gain a bound `targetDate` argument rather than
a form field, so the date cannot be swapped by editing the DOM. Both re-validate it anyway:
a bound argument still arrives over the wire.

## 4. Routes + UI

### New: the `/day/[date]` hub and its two screens

One screen per job, because stacking the check-in form and the session form on a single
page put "Save check-in" where a member reads the end of the page: they save and leave,
and the session they ran that day is never logged.

| Route | Owns |
| --- | --- |
| `/day/[date]` | Hub: a status card per thing the day can hold |
| `/day/[date]/checkin` | That day's check-in form, nothing else |
| `/day/[date]/session` | That day's sessions, plus the form to add another |

The hub shows one `DayCard` per part of the day, each carrying the **full-white to-do
border while that part is empty** and a neutral border once it holds something. The
Sessions card reads "None logged. Rest days need no entry." when empty: the border still
draws the eye, but a genuine rest day is not being scolded for a missing row.

**The save loop is where the fix lives.**

- Saving a check-in for an earlier day returns to the **hub**, not History. That is the
  exact moment the old design lost the session, and it now lands somewhere that shows the
  Sessions card still empty.
- Logging a session returns to the **session screen**, not the hub. The list above grows
  and the form comes back empty, so a double or a race-plus-shakeout is submit, submit.
  `session_logs` has no unique constraint and `saveSession` always inserts, so there is no
  per-day limit.
- The hub has an explicit "Done" back to History, so leaving is a decision.

All three screens share `src/app/(app)/day/[date]/guard.ts` (`loadDayScreen`), which runs
the session check, the cohort window check, and `assertLoggableDate` — the same guard the
write cores use, so a screen can never offer a day a write would refuse. It redirects
today to that screen's own capture route (`/checkin` or `/session`): the today screens own
today, these own every earlier day. `notFound()` is called outside the try/catch, since it
works by throwing and would otherwise be swallowed by the catch meant for the guard.

### Extracted: `src/components/CheckinForm.tsx`

The check-in form JSX moves out of `src/app/(app)/checkin/page.tsx` and takes `action`,
`existing`, and `submitLabel`. `/checkin` and `/day/[date]` both render it, so the two can
never drift. This satisfies the "promote at the second route" rule in `CLAUDE.md`. The
existing screen is verified by `pnpm build` and `tsc` plus a read of the diff; it has no
component test today and this does not add one.

### Changed: `src/app/(app)/history/page.tsx`

Maps over `buildLedger(...)` instead of `groupByDate(...)`. Logged days render the existing
`HistoryDayCard`, unchanged. Unlogged days render `MissedDayRow`. The "No entries yet"
empty state is removed: once the cohort has started, the ledger always has rows.

The streak and completion stat cards are unchanged.

### New: `src/components/MissedDayRow.tsx`

Same date block and phase tag as a logged row, the words "Not logged", and a log CTA
filling the row's tap target, linking to `/day/<date>`. Marked by a full-white 1.5px
border, per the monochrome rule. No hue, no warning colour, no icon beyond the existing
lucide set.

### Changed: `src/components/HistoryDayCard.tsx`

The edit affordance is no longer gated on `isToday`, and each block is labelled for what it
actually does rather than sharing one generic "Edit":

- Check-in block: `Edit check-in`, or `Add check-in` on a day that has sessions but no
  check-in.
- Sessions block: `Add session`, always present on an editable day, alongside the existing
  per-session `Edit` / `Delete`.

`Add session` is the affordance for the case that motivated it: a day that *was* checked
into but never had its session logged. Without it the only way in was the check-in's Edit
link, which reads as the wrong door, so the capability existed and nobody would find it.

Today's card links to `/checkin` and `/session`, the muscle-memory paths and the ones push
notifications open; a past card links into the day sub-routes. A "logged late" tag renders
when `isLateEntry` is true for the check-in.

### Changed: `src/app/admin/member/[id]/page.tsx`

Switches to the ledger so founders see gaps as rows rather than inferring them from
absences. Read-only: no log CTA, no edit affordance. Late entries carry the same tag.

### Changed: `src/app/admin/export/route.ts`

Both CSV exports gain a `logged_late` column beside the `created_at` already present.

## 5. Security

- All four guards live in the pure cores. The wrappers are reachable by direct POST and are
  assumed hostile.
- `targetDate` is shape-validated before it reaches any query.
- Ownership is unchanged: `updateSession` and `deleteSession` already reject a row not
  owned by the caller, and `saveCheckin`'s upsert is keyed on the caller's own member id.
- `updateSessionAction` currently redirects using a `from` field read off the form. It
  needs a third destination for `/day/[date]`. `from` becomes `'session' | 'history' |
  'day:YYYY-MM-DD'`, **matched against a strict whitelist regex before it reaches
  `redirect()`**. The submitted string is never interpolated into a path unchecked; a
  `from` value that flows into a redirect unvalidated is an open-redirect hole.
- No new environment variables, no new dependencies.

## 6. Testing (pglite, per convention)

Cores and pure functions only. Pages and wrappers stay verified by `pnpm build` + `tsc`.

`saveCheckin`:

- Writes to the target date and stamps that date's phase, not today's.
- Leaves `created_at` at the real write instant while `updated_at` moves.
- Re-saving an existing past check-in updates in place and preserves the original
  `created_at`.
- Rejects a future date, a pre-start date, a malformed date string, and any write once
  today's state is `complete`.

`saveSession`:

- Backfills to a past date with that date's stamped phase.
- Forces `servings: null` on a backfilled **baseline** date even while today is `within`.

`isLateEntry`:

- False same-day, true next-day.
- A `created_at` of 23:30 UTC resolves to the following Jakarta day and reads as late for
  the earlier date.

`buildLedger`:

- Full date range and newest-first ordering.
- Phase on a day with no rows.
- Capped at the protocol end.
- A day-one cohort with nothing logged yields one unlogged row.

`checkinRowsToCsvRows` / `sessionRowsToCsvRows`:

- Emit `logged_late`.

There is no schema change, so `pnpm db:generate` is not part of this work. Confirm green
with `pnpm test --no-file-parallelism`; this suite flakes under parallel database files.

## 7. Docs

- `CLAUDE.md` Domain Rules — the Edit policy paragraph is rewritten. "Check-ins are
  same-local-day editable only" and "no backfill in v1" are replaced by: any protocol day
  is loggable and editable until the protocol completes; phase stamps from the target date;
  late entries are derivable and exported. Leaving that paragraph stale would be worse than
  the rule it describes.
- This spec is committed. The implementation plan stays local and gitignored, per this
  repo's setup.

## 8. Out of scope

- Founder-side writes or corrections to a member's rows.
- An edit audit trail or row history.
- Any change to the reminder cron.
- Any phase-2 analysis of the `logged_late` signal beyond exporting it.
