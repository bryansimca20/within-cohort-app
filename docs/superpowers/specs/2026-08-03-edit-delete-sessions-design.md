# Edit + Delete Sessions — Design

**Date:** 2026-08-03
**Status:** Approved, ready for planning

## 1. Problem

Runners can log multiple sessions per day, but once a session is written it can
never be changed or removed — not even the same day. A mis-typed duration, a
double-logged run, or a session that turned out not to count is permanent. The
cohort needs to fix their own sessions, including sessions from earlier days.

## 2. Scope + guardrails

A runner can **edit** or **delete** their **own** session logs, from **any day**,
**while the protocol is running**. Once the protocol completes the whole dataset
locks, exactly as it does today.

Immutable, always:
- A session's `localDate` and stamped `phase` never change on edit. Editing fixes
  the metrics of an existing row; it is not backfill and never re-homes a row to a
  different day or phase.
- The serving question is keyed to the row's **stored** phase, not today's phase. A
  baseline session edited while the cohort is in the within phase still records no
  serving (`tookServing` forced to `null`).
- Missing days stay gaps. No backfill (unchanged from v1).
- **Check-in** edit policy is unchanged — check-ins remain same-day editable only.
  This change is sessions-only.

Editable metrics: `sessionType`, `sessionTypeOther`, `rpe`, `durationMin`,
`distanceKm`, `tookServing` (within phase only), `note`.

Window gate: editing/deleting is allowed when today's phase state is `baseline` or
`within`. It is rejected when the state is `complete` (locked) or `pre` (no sessions
can exist yet). The gate is on **today's** state, independent of the session's own
stored phase — a runner in the within phase may still edit a baseline-day session.

**This overrides the CLAUDE.md "Edit policy" domain rule for sessions.** That rule
(older entries read-only) is updated as part of this work; see §7.

## 3. Data layer — two pure cores

Both live in [`src/app/(app)/session/actions.ts`](../../../src/app/(app)/session/actions.ts),
alongside `saveSession`, and follow the established pure-core + `"use server"`
wrapper convention. Both take `db` first and are unit-tested against pglite.

### `updateSession(db, member, sessionId, input, now, startDate): Promise<{ localDate: string }>`
1. `parsed = sessionSchema.parse(input)` (reuse the create schema).
2. Compute today's `state` via `getPhase(startDate, localDateFor(COHORT_TIMEZONE, now))`.
   Throw if `state === 'complete'` (locked) or `state === 'pre'`.
3. Load the row by `id`. If it does not exist **or** `row.memberId !== member.id`,
   throw (not found / not owned — same error either way, no existence oracle).
4. Update **only** the metric columns. Do not write `localDate` or `phase`.
   `tookServing` is forced to `null` when `row.phase === 'baseline'`, else
   `parsed.tookServing ?? null`. `distanceKm` is `parsed.distanceKm.toString()`
   (numeric string-mode column, same as `saveSession`).
5. Return the row's `localDate` so the wrapper can pick a redirect target.

### `deleteSession(db, member, sessionId, now, startDate): Promise<void>`
1. Today's-state gate (reject `complete` / `pre`), same as update.
2. Load the row; reject if missing or `row.memberId !== member.id`.
3. Hard-delete the row (`where id = sessionId and memberId = member.id`).

### `"use server"` wrappers
- `updateSessionAction(sessionId: string, formData: FormData)` — `bind`s `sessionId`.
  `requireMember()`, apply the same missing-required-field guard as
  `saveSessionAction` (redirect back to the edit route with `?error=missing`),
  build the input object, call `updateSession`, `revalidatePath` `/today` `/history`
  `/session`, then `redirect`. Redirect target from a hidden `from` field:
  `from === 'session'` → `/session`, else `/history` (default). Append `?saved=session`.
- `deleteSessionAction(sessionId: string, formData: FormData)` — `bind`s `sessionId`.
  `requireMember()`, call `deleteSession`, revalidate the same three paths. No
  redirect needed (invoked inline from a list; revalidation re-renders it).

Server actions are reachable by direct POST, so the ownership + window checks live
in the **cores**, never only in the UI.

## 4. Routes + UI

### Shared form: `src/components/SessionForm.tsx`
Extract the current session form body (`SessionTypeField`, `RpeSlider`, two
`NumberField`s, the serving `Switch`, the note `Textarea`, submit `Button`) from
`session/page.tsx` into a reusable server component. Props: `action`,
`showServingToggle`, `existing?` (prefill defaults), `submitLabel`, `from`
(rendered as a hidden input). The create page renders it with no `existing` and
`action={saveSessionAction}`; the edit route renders it prefilled.

Prefill requirement: `SessionTypeField` and `RpeSlider` must accept and apply a
`defaultValue` (as `NumberField` already does). Adding those props is part of this
work.

### Create page: `src/app/(app)/session/page.tsx`
- Renders `SessionForm` (create) exactly as today (no behavior change to logging).
- **Adds a "Today's sessions" list** below the form: the runner's sessions for
  today (`memberId` + today's `localDate`, ordered by `createdAt`), each showing a
  one-line summary (reuse `sessionTypeLabel` from `lib/history`) plus
  `SessionRowActions` (`from="session"`). Empty state when there are none yet.
  Shown only while editable (state `baseline`/`within`, which the page already is
  in to render the form).

### Edit route: `src/app/(app)/session/[id]/edit/page.tsx`
Server component. `requireMember()`, load `startDate` (null → `ClosedNotice`), load
the session by `id` **and** `memberId`. If not found/owned → `notFound()`. If
today's state is `complete` → a locked `ClosedNotice`. Otherwise render
`SessionForm` prefilled from the row, `action={updateSessionAction.bind(null, id)}`,
`showServingToggle = row.phase === 'within'`, `submitLabel="Update session"`,
`from` from `?from=` (default `history`). Header shows the row's date + phase.

### Row actions: `src/components/SessionRowActions.tsx` (client)
Props: `{ sessionId, from }`. Renders:
- **Edit** — `Link` to `/session/${sessionId}/edit?from=${from}` (Pencil + label).
- **Delete** — two-tap inline confirm: first tap arms the button ("Confirm delete?"),
  second tap submits a `<form action={deleteSessionAction.bind(null, sessionId)}>`.
  No native `confirm()`, no dialog dependency. `useState` for the armed flag; a
  blur/second-render resets it. Styled on-dark (both surfaces are dark).

### History: `src/components/HistoryDayCard.tsx`
Each expanded session row gains `SessionRowActions` (`from="history"`), rendered
only when a new `editable` prop is true. `history/page.tsx` passes
`editable = status.phaseState !== 'complete'` down to each card. The existing
check-in "Editable today" link is unchanged.

## 5. Security

- Ownership: `updateSession` / `deleteSession` reject any `sessionId` whose row is
  not owned by the acting member. A runner cannot edit or delete another runner's
  session even by crafting a direct POST.
- Window: both cores reject when today's state is `complete` (or `pre`).
- Guards are in the pure cores, verified by pglite tests — not merely UI gating.

## 6. Testing (pglite, per convention)

`updateSession`:
- updates metrics and **preserves `localDate` and `phase`**;
- a baseline-phase row forces `tookServing` to `null` even when the input sets it;
- rejects a `sessionId` owned by a different member;
- rejects when today's state is `complete`.

`deleteSession`:
- removes the target row (and only it);
- rejects a foreign `memberId`;
- rejects when today's state is `complete`.

Framework glue (edit route, wrappers, `SessionRowActions`) is verified by
`pnpm build` + `tsc`, not mock-heavy tests — same policy as the rest of the app.

## 7. Docs

Update `CLAUDE.md`:
- **Edit policy** rule: sessions are editable **and deletable** by their owner for
  the whole protocol window (locks on completion); date + stamped phase stay
  immutable; check-ins remain same-day only; still no backfill.
- Keep the phase-stamping-is-immutable and capture-only rules intact (this feature
  corrects existing rows, it does not compute or invent data).

## 8. Out of scope

- Editing/deleting check-ins beyond the current same-day policy.
- Backfilling missing days.
- Founder/admin editing of a runner's sessions.
- Any soft-delete / audit trail (delete is a hard delete).
