# WITHIN Cohort Log — Product Requirements & Design (v1)

- **Date:** 2026-07-23
- **Status:** Approved design, pre-implementation
- **Source protocol:** `presentations/within-cohort-protocol-2026-07-20/` (The Cohort Protocol deck)
- **Owner:** Founders

---

## 1. Overview

An installable web app (PWA) that lets the WITHIN Cohort log the measurement data
defined by the Cohort Protocol. The protocol runs a 6-week window per member: a
2-week baseline with no product, then 4 weeks on Within, all members in parallel.
Each member logs a short daily morning check-in and an event-triggered post-session
log. The founders monitor completion and export the raw data.

The deck defines two layers of evidence. Layer 01 (the story: diary, voice notes)
is out of this app's scope. This app builds **Layer 02, the proof**: the structured
measurement stream.

### What v1 is

A **data capture** tool. It reliably collects clean, baseline-anchored logs from
~10 people over 6 weeks, on their phones, in the moment.

### What v1 is not

v1 does **not** analyze, chart, or report on the data. Every derived metric and the
Recovery Intelligence Report are **phase 2** (see §12). v1's job is to make sure the
data exists, is clean, and is exportable when phase 2 begins.

---

## 2. Goals & success criteria

1. A runner can complete the morning check-in in about 20 seconds, one-handed, on a
   phone saved to their home screen.
2. Every member logs a full 2-week baseline before their first serving. Baseline
   completeness is the single most important outcome; without it every later number
   is unanchored.
3. Founders can see, at a glance, who has and has not logged today, and act on it.
4. All raw data is exportable as CSV at any time, structured for the phase-2
   analysis.
5. No member is ever silently logged out mid-protocol.

Non-goals for v1 are listed in §12.

---

## 3. Users

| User | Count | Needs |
|---|---|---|
| Runner (cohort) | 7 | Log daily check-in + session logs quickly; see own progress/streak |
| Founder (admin) | 2–3 | Monitor completion, nudge, export; some also run the protocol |

Membership is fixed and hand-picked. There is no public sign-up. A founder who also
runs the protocol is both a runner and an admin (see roles in §5).

---

## 4. The protocol being captured (reference)

Sourced from the deck. This is what the app must capture, not decide.

**Morning check-in — daily, ~20s, 7 values:**
- Device layer (read off the runner's own watch, entered manually):
  - Recovery (a 0–100 style score, device-specific)
  - Resting heart rate (bpm)
  - Sleep (hours)
- Hooper index (subjective, 1–5 each): Sleep, Fatigue, Soreness, Stress
- Optional free-text note

**Post-session log — event-triggered, after every session:**
- Session type (as prescribed)
- RPE (0–10)
- Duration (minutes)
- Distance (km)
- During the Within phase: how many servings were taken this session (0-4)
- Optional free-text sentence

**Structure:**
- Weeks 1–2: Baseline. Log all fields on a normal routine, no product.
- Weeks 3–6: On Within. Same fields, same schedule, servings logged per session (a member may take
  more than one).
- All members run in parallel.

**Derived later (NOT entered by the runner, NOT computed in v1):** training load
(RPE x duration, weekly), morning-after-hard-session tagging, days-to-recovery,
change-vs-baseline. These belong to phase 2.

---

## 5. Roles & access

Every person is a `member` with a passcode. Two independent boolean flags decide
what they can do:

- `in_cohort` — true for the tracked runners. Enables the logging screens and counts
  them in completion stats.
- `is_admin` — true for founders. Enables the founder dashboard and member
  management.

A founder who also runs the protocol has both flags set. Access rules:

- Unauthenticated: only `/login` is reachable.
- Authenticated + `in_cohort`: the logging app (Today, check-in, session, history).
- Authenticated + `is_admin`: additionally the founder area (`/admin/*`).

---

## 6. Authentication (per-person passcode)

Chosen for a tiny, hand-picked cohort where stakes are low (a member's own training
data) and first-run friction must be near zero.

### Flow

1. `/login` shows a dropdown of member names and a passcode field.
2. On submit, the server looks up the member and verifies the passcode against a
   stored **hash** (argon2id preferred; bcrypt acceptable). Never store plaintext.
3. On success, set a **signed, http-only, secure, SameSite=Lax session cookie** with
   `maxAge ≈ 90 days`, rolling on each visit (iron-session or an equivalent signed
   JWT cookie).
4. Redirect to Today.

Because the app is installed to the home screen and used daily, the member logs in
once at install and effectively never sees the login screen again for the life of
the protocol.

### Passcode lifecycle

- Founders mint passcodes: a seed script for the initial cohort, plus a "reset
  passcode" action in the founder area.
- The plaintext passcode is shown to the founder **once** at mint/reset (to send via
  WhatsApp). Only the hash is stored.
- Format: a short human-typeable code (for example `RUN-4821`). Case-insensitive
  match, trimmed.

### Abuse protection

- Rate-limit login attempts per member and per IP (for example 10 / 10 min) to make
  guessing a short code impractical.
- All app and API routes are guarded by middleware; `/admin/*` additionally checks
  `is_admin`.

---

## 7. Data model (Postgres via Drizzle ORM)

Scale is tiny (about 10 members x 6 weeks, a few thousand rows total), so the schema
optimizes for clarity and integrity, not performance.

### `members`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| name | text | shown in the login dropdown and dashboard |
| passcode_hash | text | argon2id/bcrypt hash |
| in_cohort | boolean | logs data |
| is_admin | boolean | founder access |
| cohort_start_date | date | anchors the phase calendar; nullable until set |
| timezone | text | IANA tz, default `Asia/Jakarta` |
| created_at | timestamptz | |

### `daily_checkins`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| member_id | uuid fk | |
| local_date | date | the member's local calendar date |
| phase | enum(`baseline`,`within`) | **stamped at write time** (see §8) |
| recovery | int | 0–100 |
| resting_hr | int | 25–120 bpm |
| sleep_hours | numeric(3,1) | 0–16 |
| hooper_sleep | int | 1–5 |
| hooper_fatigue | int | 1–5 |
| hooper_soreness | int | 1–5 |
| hooper_stress | int | 1–5 |
| note | text | optional, max ~1000 chars |
| created_at / updated_at | timestamptz | |

Unique constraint on `(member_id, local_date)` — one check-in per day, editable the
same day (see §9 editing policy).

### `session_logs`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| member_id | uuid fk | |
| local_date | date | |
| phase | enum(`baseline`,`within`) | stamped at write time |
| session_type | enum + `other` | Easy, Long, Tempo, Interval, Recovery, Race, Other |
| session_type_other | text | required only when type = Other |
| rpe | int | 0–10 |
| duration_min | int | 1–600 |
| distance_km | numeric(4,1) | 0–100 |
| servings | integer | count taken this session, 0-4; meaningful only in the Within phase; null in baseline |
| note | text | optional |
| created_at | timestamptz | |

Multiple session logs per day are allowed (a runner may do a double).

### `push_subscriptions`
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| member_id | uuid fk | |
| endpoint | text | Web Push endpoint |
| p256dh | text | key |
| auth | text | key |
| created_at | timestamptz | |

Sessions are stateless (signed cookie), so no session table.

### Validation

All ranges above are enforced both client-side (input constraints) and server-side
(reject out-of-range writes). Server-side validation is authoritative.

---

## 8. Phase calculation & integrity

A member's phase is derived from `cohort_start_date` and `local_date`:

- `day_index = local_date - cohort_start_date` (whole days)
- `day_index < 0` → not started (logging blocked with a "starts on <date>" message)
- `0 ≤ day_index ≤ 13` → **baseline** (weeks 1–2)
- `14 ≤ day_index ≤ 41` → **within** (weeks 3–6)
- `day_index ≥ 42` → complete (read-only)

The computed phase is **stamped onto each `daily_checkin` and `session_log` at write
time**. This means a later correction to `cohort_start_date` cannot silently rewrite
the phase of existing rows. The proof standard in the deck is "built to be attacked",
so historical entries must be immutable in the dimension that classifies them as
baseline vs product.

The Today screen surfaces the phase and day ("Baseline · Day 4 / 14").

---

## 9. Runner screens

Design for one-handed, in-the-moment use: large tap targets, minimal typing, sliders
over keyboards where possible.

### 9.1 Today (home)
- Phase + day badge ("Baseline · Day 4 / 14").
- Today's status: morning check-in done or not; number of sessions logged today.
- Current streak (consecutive days with a completed check-in) and phase completion
  ("12 / 14 baseline days").
- Two primary buttons: **Morning check-in**, **Log a session**.
- If the app is open in Safari rather than standalone (not yet installed), show the
  install hint card (§11).

### 9.2 Morning check-in
- Three device number inputs: Recovery, Resting HR, Sleep hours (numeric keypads,
  sensible steps).
- Four Hooper sliders (1–5): Sleep, Fatigue, Soreness, Stress. A short legend clarifies
  direction (for example 1 = very low, 5 = very high) exactly as the Hooper index
  defines each item.
- Optional note.
- Submit. If today's check-in already exists, the form is pre-filled and editable;
  after the local day rolls over it becomes read-only.

### 9.3 Session log
- Session type selector; if Other, a short text field appears.
- RPE slider (0–10).
- Duration (minutes) and distance (km) inputs.
- `servings`: a "Took a serving" toggle that reveals a 1-4 count when on; shown only
  when the member is in the Within phase.
- Optional one-sentence note.
- Guidance line: "Log right after, while the numbers are fresh."
- Submit. Repeatable within a day.

### 9.4 History
- Reverse-chronological list of entries by date, each tagged with its phase.
- Completion and streak summary.
- Tapping a day shows its entries; same-day entries are editable, older ones are
  read-only.

---

## 10. Founder (admin) screens

### 10.1 Dashboard
- A members x today grid: for each cohort member, did they check in today, and how
  many sessions did they log.
- Overall completion percentage for the current phase.
- A clear **"missing today"** list — the names to nudge on WhatsApp.
- Per-member drilldown: their full check-in and session history.

### 10.2 Export
- One-click CSV download of all check-ins and all session logs (two files or two
  sheets), including `member`, `local_date`, `phase`, and every field. This is the
  handoff to the phase-2 analysis and the report.

### 10.3 Members
- Add a member (name, flags, `cohort_start_date`, timezone).
- Set / reset a passcode (plaintext shown once).
- Toggle `in_cohort` / `is_admin`.

For v1 this can be a deliberately minimal admin surface; the seed script covers the
initial setup, and this screen covers changes.

---

## 11. PWA & install

The cohort will "Add to Home Screen" in Safari and run the app standalone, so the
app must behave like an installed app, not a browser tab.

- **`manifest.webmanifest`**: `display: standalone`, `orientation: portrait`,
  monochrome `theme_color` / `background_color`, and 192px + 512px maskable icons.
- **iOS specifics** (Safari ignores the manifest icon for the home-screen icon):
  explicit `apple-touch-icon` link(s), `apple-mobile-web-app-capable`, and
  `apple-mobile-web-app-status-bar-style` meta tags in the document head.
- **First-run install card**: when the app detects it is running in Safari (not
  `display-mode: standalone`), show a dismissible card: "Tap Share, then Add to Home
  Screen." iOS provides no automatic install prompt.
- **Standalone navigation**: standalone mode hides the browser back button, so the
  app owns its own navigation (in-app back and/or a bottom tab bar). No screen may be
  a dead end.
- **Service worker** (hand-rolled, registered client-side; avoid next-pwa due to
  Next 16 / Turbopack compatibility risk): caches the app shell so the app opens
  offline, and handles `push` + `notificationclick` events.

### Session longevity note
iOS may evict cookies after roughly 7 days of Safari inactivity (ITP). Daily use
keeps the session warm, and the 90-day rolling cookie plus daily reminders make a
silent logout unlikely. If a session does expire, the member simply re-enters their
passcode once.

### Offline behavior (v1)
The app shell opens offline via the service worker. Form submission requires network
in v1, with an explicit "saved" / "couldn't save, retry" state (optimistic UI with a
clear failure path). Background sync / offline write queue is deferred (and iOS
background sync support is unreliable regardless).

---

## 12. Reminders (web push)

- On first check-in (or via a settings prompt), request notification permission and
  register a Web Push subscription to `/api/push/subscribe`, stored in
  `push_subscriptions`.
- A **Vercel cron job at 09:00 Asia/Jakarta (= 02:00 UTC)** calls `/api/cron/remind`,
  which pushes a "morning check-in ready" notification **only to members who have not
  yet checked in today**.
- VAPID keys live in environment variables. Use a standard Web Push library.
- Web push on iOS only works **after** the PWA is installed to the home screen and
  the member has granted permission. The founder dashboard "missing today" list is
  the reliable backup, and WhatsApp remains the human nudge described in the deck.

---

## 13. Stack & deployment

- **Framework:** Next.js 16 / React 19 / TypeScript, matching the coming-soon repo.
- **UI:** Tailwind 4 + shadcn, reusing the WITHIN monochrome design tokens.
- **DB:** serverless Postgres (Neon or Vercel Postgres) via Drizzle ORM + migrations.
- **Auth:** iron-session (or equivalent signed-cookie) with argon2id password hashing.
- **Push:** Web Push (VAPID) + Vercel cron.
- **Hosting:** Vercel.
- **Location:** a new standalone app in `within-cohort-app/` (this repo). Separate
  from the marketing site; different concern, data, and deploy.

---

## 14. Design language

Follows the WITHIN brand and the deck: monochrome only (`#000000`, `#191919`,
`#f2f2f2`, `#ffffff`), Inter (no italics), near-square radii (6px controls, 10px
cards), hairline borders, flat surfaces, no hue and no gradients. Differentiation
comes from weight, border, and contrast. Large tap targets and legible type sized for
a phone held in one hand at 7 a.m. Sliders and toggles restyled to the monochrome
system.

---

## 15. Non-functional requirements

- **Security:** hashed passcodes; signed http-only cookies; server-side validation as
  the authority; admin routes gated; login rate-limited. No sensitive data beyond
  training metrics is collected.
- **Privacy / consent:** the deck commits to publishing all seven results with member
  approval. The app stores raw data only; publication and consent happen outside v1.
- **Timezone:** all "today" logic uses the member's `timezone`, default
  `Asia/Jakarta`. `local_date` is that timezone's calendar date.
- **Integrity:** phase stamped at write; past entries read-only; no silent backfill in
  v1 (a missed day stays a visible gap on the dashboard rather than being invented
  later).
- **Data retention:** data persists through the protocol and the phase-2 report; no
  auto-deletion in v1.

---

## 16. Open questions / assumptions to confirm

1. **Timezone** assumed `Asia/Jakarta` for the whole cohort. Confirm none run the
   protocol from another timezone.
2. **Cohort start dates** may be identical (all parallel) or per-person staggered; the
   model supports either. Confirm the intended start date(s).
3. **Session type list** (Easy, Long, Tempo, Interval, Recovery, Race, Other) is a
   proposed set matching "as prescribed"; confirm it matches the training plan's
   vocabulary.
4. **Recovery metric scale** assumed 0–100. If a member's watch reports recovery on a
   different scale, they enter their own number and phase-2 normalizes within-person;
   confirm 0–100 input bounds are safe for all devices in the cohort.

---

## 17. Phase 2 roadmap (documented, not built in v1)

- Derived metrics: training load (RPE x duration, weekly), morning-after-hard-session
  tagging, days-to-recovery (soreness returning to baseline), change-vs-baseline per
  metric.
- Per-runner charts across baseline + Within, marked where Within begins.
- The Recovery Intelligence Report per member, with a member approval step before any
  sharing.
- Possible later: watch-API sync, email fallback, multi-timezone handling, multi-cohort
  support.

---

## 18. Acceptance criteria (v1 done means)

1. A member can log in with name + passcode, install to the home screen, and stay
   logged in across days.
2. A member can submit a morning check-in and one or more session logs; entries are
   stored with the correct stamped phase and are visible in History.
3. Same-day entries are editable; older entries are read-only.
4. The Today screen shows the correct phase, day, status, and streak.
5. A founder sees today's completion grid and the "missing today" list, and can export
   all data as CSV.
6. Installed members receive a 09:00 push reminder only when they have not checked in
   that day.
7. All inputs are validated server-side; out-of-range or malformed writes are rejected.
