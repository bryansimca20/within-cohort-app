# WITHIN Cohort Log — First-Run Onboarding & Welcome

**Date:** 2026-08-04
**Status:** Approved (design), pending implementation plan
**Scope:** A once-ever, first-login onboarding experience for the WITHIN cohort runner app: a cinematic welcome moment followed by a short guided walkthrough of how the app works, ending with the two activation steps (install + reminders) that make daily capture actually function.

## 1. Goal & Context

The cohort app (`within-cohort-app`) is a capture-only PWA where 7 runners log the Cohort Protocol daily. Today, a runner logs in and lands directly on `/today` with no introduction. First impressions matter and the daily-capture habit depends on two setup steps most people skip.

This feature adds a first-login experience with two parts:

1. **A welcome page with a wow factor** — a cinematic, bold-motion brand moment personalized to the runner.
2. **A walkthrough** — a short cinematic slide story teaching the four capture screens (Today, Check-in, Session, History) and the protocol shape, ending by driving **Add to Home Screen** and **Turn on reminders**.

It is shown **exactly once per member, ever** (server-driven), the first time they successfully log in.

### Non-goals (explicit)
- No analytics, charts, insight, or training-load computation. This is capture-tool onboarding; it teaches how to log and computes nothing. Stays inside the v1 capture-only domain rule.
- No founder/admin onboarding in v1 (admins go straight to `/today` / admin as today; they are members with `is_admin`, and their `onboardedAt` is stamped the same way — the flow is member-agnostic, no special-casing).
- No replay UI in v1. The schema makes a founder-triggered replay trivial later (null the column), but no admin control is built now.

## 2. Key Decisions (locked)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Animation ambition | **Cinematic**, real choreography | It's a once-ever first impression; the user explicitly asked for bold animation. |
| Animation tech | Add the **`motion`** package, imported **only** in onboarding components | Route-level code-splitting keeps capture screens at 0kb of motion; the app's deliberate "instant, no-motion capture tool" rule is preserved everywhere except `/welcome`. Same library the coming-soon marketing site already uses. |
| First-login detection | **DB flag**: `members.onboardedAt timestamp | null` | Fires exactly once per person on any device, server-driven, matches the WITHIN pure-core pattern, unit-testable. Not per-device localStorage (reinstall re-triggers) and not inferred-from-no-data (mis-fires on a legit empty day-1). |
| Walkthrough style | **Cinematic slide story** (full-screen animated beats) | Most "wow", self-contained, consistent motion language with the welcome. Not live-app coach-marks (fights the clean monochrome surfaces) or guided-first-check-in (least designed). |
| Activation | Flow **ends with setup steps** — Add to Home Screen + Turn on reminders | Onboarding is the highest-leverage moment to convert both; the daily reminder cron only reaches runners who enabled push. Reuses existing `InstallCard` + `EnablePush`. |
| Route name | **`/welcome`** | The user's own word; holds the entire first-run flow. |

## 3. Architecture

### 3.1 Route & layout
A new route **`/welcome`**, deliberately **outside** the `(app)` route group. It renders under the root layout only (Inter, globals, PWA meta) — **no shared header, no bottom nav**. This gives the flow a full-bleed black cinematic canvas and prevents the `(app)` layout's onboarding gate (below) from creating a redirect loop.

`/welcome` is not in middleware's public list, so it is session-guarded exactly like the rest of the app — a runner must be logged in to reach it.

### 3.2 The three gates (belt-and-suspenders)

```
login success (LoginFlow)
  ├─ result.onboarded === true   → router.replace('/today')     (unchanged)
  └─ result.onboarded === false  → router.replace('/welcome')

(app)/layout.tsx  (every runner route)
  requireMember(); if member.onboardedAt == null → redirect('/welcome')
      → resuming after quitting mid-flow returns here; nobody reaches
        a capture screen un-onboarded.

/welcome/page.tsx  (server)
  requireMember(); if member.onboardedAt != null → redirect('/today')
      → the flow can't be replayed by hand-typing the URL.

flow completion (Finish beat)
  completeOnboardingAction() → markOnboarded(db, memberId, now) → redirect('/today')
```

The login-result flag avoids a redirect flash for the common path; the layout gate is the correctness backstop for interrupted flows and direct navigation.

### 3.3 Data model
One column added to `members`:

```ts
onboardedAt: timestamp('onboarded_at', { withTimezone: true }),  // nullable; null = never onboarded
```

`pnpm db:generate` produces the migration into `drizzle/` (committed). No backfill: existing seeded members have `onboardedAt = null` and will see the flow on their next login, which is the desired behavior for the real cohort (they haven't onboarded yet).

### 3.4 Write path (pure core + wrapper, per project convention)
`src/app/welcome/actions.ts`:

- **`markOnboarded(db: AnyPgDatabase, memberId: string, now: Date): Promise<void>`** — pure core. Sets `onboardedAt = now` **only when it is currently null** (idempotent: a second call never clobbers an existing stamp). Typed with `AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>` so pglite tests and the prod client both satisfy it.
- **`completeOnboardingAction(): Promise<void>`** — thin `"use server"` wrapper: `requireMember()`, `markOnboarded(prodDb, member.id, new Date())`, `redirect('/today')`. A `"use server"` file exports only async functions; any shared types live outside it.

### 3.5 Login result change
`src/app/login/actions.ts`. The onboarded flag is derived from the member row that login already fetches — no extra query:

- `authenticate(db, memberId, passcode)` changes its return type from `string | null` to **`Member | null`** (it already selects the full row; it just returns it instead of `m.id`). Callers read `.id` where they used the string.
- `attemptLogin(db, memberId, passcode)` returns `{ ok: true; memberId: member.id; onboarded: member.onboardedAt != null }` on success; error branches unchanged.
- `loginAttempt` (wrapper) returns `{ ok: true; onboarded: boolean }`; `LoginState`'s ok branch carries `onboarded`.

Existing `authenticate` tests that assert a returned id update to read `.id` off the returned member (or assert on the member) — a mechanical change, behavior is unchanged.

`src/components/LoginFlow.tsx`: the existing success effect becomes
`router.replace(state.onboarded ? '/today' : '/welcome')`.

### 3.6 Components
`src/components/onboarding/` (new; the only place `motion` is imported):

- **`Onboarding.tsx`** — `"use client"` stage machine. Holds `step` state, renders one beat at a time inside `AnimatePresence`, owns the Continue button, progress dots, back control, and a low-key Skip. Receives the member's `name` and any client config (e.g. whether push is supported is detected inside `EnablePush` itself) as props. Calls `completeOnboardingAction` on finish.
- Beat components (each a `motion`-animated full-screen panel): `WelcomeBeat`, `ProtocolBeat`, `CheckinBeat`, `SessionBeat`, `HistoryBeat`, `SetupBeat`, `FinishBeat`.
- `ProgressDots` — small step indicator.
- `SetupBeat` composes the existing `InstallCard` and `EnablePush` (dark tone) rather than reimplementing install/push logic.

`src/app/welcome/page.tsx` — server component: `requireMember()`, redirect if already onboarded, else `<Onboarding name={member.name} />`.

## 4. The Experience (beats)

One full-screen beat at a time on a black canvas. Advance via a thumb-reachable **Continue** button (not swipe-only — swipe may be an optional enhancement); a progress-dots indicator sits up top with a back control; a low-key **Skip** jumps toward the end. This is a phone-first, one-handed sequence.

| # | Beat | Teaches | Motion intent |
| --- | --- | --- | --- |
| 0 | **Welcome** | brand + "Welcome, {name}" + one mission line | staged logotype reveal, personalized name, spring text — the wow moment |
| 1 | **The protocol** | Baseline 14 days (no product) → Within 14 days (one sachet daily) | a timeline/ledger fills in, mirroring the Today ledger so it reads as familiar |
| 2 | **Morning check-in** | every morning, ~20s: recovery, resting HR, sleep, how you feel | animated slider / Hooper-dot preview |
| 3 | **Log your runs** | after a long or hard run: RPE, duration, distance | the session card animates in |
| 4 | **Streak & history** | your streak grows; every entry is kept | a counter ticks up |
| 5 | **Setup** | Add to Home Screen + Turn on reminders | reuses `InstallCard` + `EnablePush`; the functional payload of the flow |
| 6 | **Finish** | "You're set, {name}." | Continue → `completeOnboardingAction` → `/today` |

Beat count is tunable during implementation (2–4 could merge). The setup beat is the only one that must remain — it carries the activation.

### 4.1 Motion & accessibility (non-negotiable)
- Every beat honors `useReducedMotion()`: reduced-motion users get an instant, opacity-only, fully readable version — consistent with the app-wide reduced-motion rule that strips movement.
- Buttons drive progression, not swipe alone; focus moves to each new beat; beat changes are announced via `aria-live`.
- Motion stays on the WITHIN system: no visible bounce, short transform/opacity tweens, uses the existing `--wi-ease-*` / `--wi-duration-*` tokens where a plain token suffices, `motion` springs only where the choreography needs them.

### 4.2 Voice & visual system
Copy follows the WITHIN voice: short declarative statements, facts over adjectives, **no em dashes**, no emoji, no exclamation marks, no hype. Monochrome only (`#000` · `#191919` · `#f2f2f2` · `#fff` + documented greys), Inter only, upright. Wow comes from motion, composition, and contrast, never from color. Logo via `WithinLogo`, never redrawn.

## 5. Files Touched

| File | Change |
| --- | --- |
| `src/db/schema.ts` | + `onboardedAt` column on `members` |
| `drizzle/` | generated migration (`pnpm db:generate`), committed |
| `src/app/welcome/page.tsx` | new server component: gate + render flow |
| `src/app/welcome/actions.ts` | `markOnboarded` core + `completeOnboardingAction` wrapper |
| `src/components/onboarding/*` | new client flow: `Onboarding` + beats + `ProgressDots` |
| `src/components/LoginFlow.tsx` | route to `/welcome` when `onboarded === false` |
| `src/app/login/actions.ts` | thread `onboarded` through `attemptLogin` / `loginAttempt` / `LoginState` |
| `src/app/(app)/layout.tsx` | gate: `requireMember()`, `onboardedAt == null` → `redirect('/welcome')` |
| `package.json` | add `motion` dependency |
| `CLAUDE.md` | document the motion divergence + the onboarding-flag domain rule |

## 6. Testing

Per project rules — pglite for pure cores, `build` + `tsc` for framework glue, no browser in CI.

- **`markOnboarded`** (pglite): stamps `onboardedAt` when null; idempotent — a second call leaves the original stamp unchanged; the target member's row (and only it) is updated.
- **`attemptLogin`** (pglite, extends existing tests): returns `onboarded: false` for a member with `onboardedAt == null` and `onboarded: true` once stamped; error branches unchanged.
- **Onboarding UI / beats / motion**: verified by `pnpm build` + `tsc` (the project's "UI = build + type-check" rule). A standalone `ProgressDots` may get a small jsdom component test if it carries logic worth pinning; the motion beats do not.
- Test output must stay pristine; a stray warning is a finding.

## 7. Risks & Mitigations

- **Motion bundle leaking into capture screens.** Mitigation: `motion` is imported only under `src/components/onboarding/`, reached only by the `/welcome` route; Next code-splits per route. Verify post-build that `/today` et al. don't pull the chunk.
- **`(app)` layout DB call.** Adding `requireMember()` to `(app)/layout.tsx` adds one member read per app navigation. Each page already calls `requireMember()`; the layout call is cheap and the correctness it buys (no un-onboarded access, resumable flow) is worth it. If it proves duplicative, the gate can move into a shared helper.
- **Interrupted flow.** A runner who quits mid-onboarding is un-stamped, so the layout gate returns them to `/welcome` on next entry — they restart the flow (acceptable for a once-ever, short flow; no partial-progress persistence in v1).
- **iOS install nuance.** `InstallCard` is iOS-Safari-oriented and hides when already standalone; `EnablePush` renders nothing when unsupported/blocked. The Setup beat must read well even when one or both render nothing (e.g. an already-installed member) — copy and layout tolerate an empty slot.

## 8. Open Questions
None blocking. Beat count/copy will be finalized during implementation against the live motion preview.
