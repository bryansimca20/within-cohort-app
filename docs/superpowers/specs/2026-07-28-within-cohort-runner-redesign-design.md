# WITHIN Cohort Log — Runner Screens Redesign

**Date:** 2026-07-28
**Scope:** Runner-facing screens only. Founder/admin screens are out of scope this round.
**Source design:** Claude Design project `c232740c-fcc9-4969-8cd5-81dcbcedc88d`,
file `Within Cohort Log.dc.html` (single interactive prototype covering every screen).

## 1. Goal

Port the new visual system to the five runner surfaces (login, Today, Check-in,
Session, History) and the runner app shell. Match the design's black-forward,
monochrome, phone-native look built for one-handed 7 a.m. capture.

Build on the **existing stack** — the app's own `shadcn/ui` primitives, server
actions, and Drizzle DB. Do **not** import the Claude Design `_ds` bundle; the
design file is a visual reference only. Inline styles in the design translate to
Tailwind utilities + WITHIN tokens (the same rule the `within-website-coming-soon`
port followed).

## 2. Non-goals / invariants (must not change)

- **Capture-only.** No analytics, trends, or derived insight. Per-phase logged-day
  counts and completion % are **completion display** (same nature as the existing
  streak and admin dashboard %), not analytics — allowed.
- **Phase stamping immutable**, **Jakarta timezone**, **edit policy** (same-local-day
  editable, older read-only), **`took_serving` null in baseline** — all unchanged.
- **Auth unchanged at the core.** `authenticate`, `verifyPasscode` (bcrypt),
  `rateLimit`, the UUID guard, and session cookie handling are reused verbatim. The
  client only collects input; all verification stays server-side.
- **Form field names unchanged** (`recovery`, `restingHr`, `sleepHours`,
  `hooperSleep|Fatigue|Soreness|Stress`, `note`, `sessionType`, `sessionTypeOther`,
  `rpe`, `durationMin`, `distanceKm`, `tookServing`, `memberId`, `passcode`), so
  `saveCheckin`/`saveSession` pure cores and their tests are untouched.
- **shadcn/ui + lucide only.** Monochrome palette, no hue (status colors already
  exist as documented exceptions but are not introduced here), no `dark:` variants,
  no `motion` package. Micro-interactions use CSS transitions + WITHIN motion tokens.
- **No em dashes in UI copy.** Honest, declarative voice.

## 3. Founder direction (recorded, out of scope)

When founder/admin is redesigned in a later round, it adopts the same phone frame
with a **black bottom nav** (Cohort / Export / Members), a black hero stat card, a
dedicated **Export page** (download cards, keeping the existing CSV route handler for
the actual download), and a member drilldown. Not built now.

## 4. Screen specs

### 4.1 Login (`/login`)
Two-step, full-black flow replacing the current single card form.

- **Step "who":** WITHIN white logotype, eyebrow `COHORT LOG`, title `WHO IS LOGGING?`,
  scrollable roster (initials tile + name + chevron), footer `COHORT 01 · N runners`.
  Roster from the existing `members` query (id + name, ordered by name).
- **Step "code":** back arrow (to "who"), selected member's initials + name,
  `Enter passcode`, four dots that fill as digits are typed, on-screen numeric keypad
  (1-9, 0, delete). Typing the fourth digit auto-submits. Wrong code clears the dots
  and shows inline error text; the selected member is preserved.

**Wiring.**
- New client component `LoginFlow` (`src/components/LoginFlow.tsx`) holds step,
  selected member, and typed digits in React state, and drives submission with
  `useActionState`.
- New action `loginAttempt(prevState, formData)` in `src/app/login/actions.ts` that
  **returns** `{ error: 'wrong' | 'rate' } | { ok: true }` instead of redirecting on
  failure — so a wrong attempt stays on the keypad. On success it sets the session
  cookie server-side and returns `{ ok: true }`; the client then navigates to `/today`
  (`router.replace`). Reuses `authenticate(prodDb, ...)`, `rateLimit`, the UUID guard.
- `authenticate` and `logout` are unchanged. The redirect-style `login` action may be
  removed once `LoginFlow` is the only caller (confirm no other references first).
- `src/app/login/page.tsx` becomes a thin server component: fetch roster, render
  `<LoginFlow roster={...} />`.

**Security note:** identical guarantees to today — rate limiting keyed on `memberId`,
UUID-shape rejection before the limiter, bcrypt verify, no plaintext logged, passcode
never in a URL.

### 4.2 Today (`/today`)
Full-black home screen.

- Top row: white logotype (left) + initials avatar (right). **The avatar is the
  logout control** — a `<form action={logout}>` submit button with
  `aria-label="Log out"`.
- Phase block: eyebrow (`Baseline · no product` / `Within · one sachet daily`), a large
  day number with `/ 14` (baseline) or `/ 28` (within), caption `Days into the protocol`;
  streak (zap icon + number) on the right. Pre/complete states render a matching
  message instead of a day number.
- Two ledgers, each a labelled `repeat(7, 1fr)` grid of cells: **Baseline (14 cells)**
  and **Within (28 cells)**. A cell is filled when that phase-day is logged, outlined
  for "today", faint for upcoming. Row label + `N / total logged` caption.
- Status rows: check-in status (done / not yet, with sub text) and sessions-today count.
- Two large action buttons at the bottom: **Morning check-in** (filled white when not
  yet done, outline "Edit check-in" when done) and **Log session** (outline). These
  link to `/checkin` and `/session`.
- **Install / push:** keep `InstallCard` and `EnablePush`, restyled subdued for the
  dark surface, below the actions. PWA install must stay reachable.

**Data.** Extend `getTodayStatus` (`src/lib/today.ts`) and its `TodayStatus` type with:
- `baselineLogged: number` — distinct check-in dates whose stamped phase window is
  baseline (dayIndex 0-13).
- `withinLogged: number` — distinct check-in dates in the within window (dayIndex 14-41).

Derived from the check-in dates already fetched (map each through `getPhase(startDate, date)`),
so no extra query. Pure and unit-tested. `phaseComplete`, `streak`, `dayIndex`,
`checkinDone`, `sessionCount` already exist and are reused. Baseline window = 14 days,
within window = 28 days (from `getPhase`), so ledgers use the real windows, not the
mockup's simplified 14+14.

### 4.3 Check-in (`/checkin`)
Black header bar + light body.

- Header bar (black, full-bleed): back arrow → `/today`, title `Morning check-in`,
  `~20s` on the right; sub line `{date} · {phase label}`.
- `FROM YOUR WATCH`: Recovery (0-100), Resting HR (bpm), Sleep (hrs) — the existing
  `NumberField`s, same names/bounds/defaults.
- `HOW YOU FEEL` (caption `1 low · 5 high`): four rows, each a label + anchor and a row
  of **five 1-5 tap pills**. New client component `HooperPicker`
  (`src/components/HooperPicker.tsx`) replacing `HooperSlider`: same props
  (`name`, `label`, optional `anchor`, `defaultValue`), a hidden input mirroring the
  selected value so FormData carries `hooperSleep` etc. unchanged. Anchors from the
  design: Sleep quality `poor → great`, Fatigue `fresh → wrecked`, Soreness
  `none → severe`, Stress `calm → tense`.
- Note textarea (optional). Submit button (`Save` / `Update` when editing today).
- Pre/complete guard states unchanged.
- **Remove** `HooperSlider.tsx`; replace `tests/HooperSlider.test.tsx` with
  `tests/HooperPicker.test.tsx` (jsdom + testing-library) asserting the hidden input
  submits the selected 1-5 value.

### 4.4 Session (`/session`)
Black header bar + light body.

- Header bar: back arrow → `/today`, title `Log a session`; sub line
  `Only long, hard or race efforts. One entry each.`
- Info chip (mist): `Log after any run over ~45 min or a hard effort.`
- Session type: existing `SessionTypeField` (shadcn `Select`), restyled. `Other`
  reveals the describe field (unchanged).
- RPE: label + large number readout (`{rpe}/10`) and a restyled range slider
  (0-10), anchors `0 · rest` / `10 · max`. Restyle `RpeSlider` to the design's big
  readout; keep name `rpe` and the hidden-input submit. `RpeSlider.test.tsx` stays green.
- Duration (min) + Distance (km) side by side — existing `NumberField`s.
- **Serving toggle (within phase only):** black card `Took a serving` + a **Switch**.
  Add a new `src/components/ui/switch.tsx` (shadcn/Base UI, monochrome restyle).
  Verify in a throwaway FormData render that it submits `tookServing` in a shape
  `saveSessionAction` already accepts (`'true'` or `'on'` when checked, absent when
  off). If Base UI `Switch` does not emit a native form input cleanly, fall back to
  the existing `Checkbox` visually styled as a switch — the wire format is the
  constraint, not the primitive. Baseline never renders it; the pure core still forces
  `took_serving` null in baseline regardless.
- Note textarea. Submit `Log session`.

### 4.5 History (`/history`)
Light body.

- Title `History`.
- Two stat cards: **day streak** (`computeStreak`, already used) and **completion %**
  for the current phase — `round(logged / phaseTotal * 100)` where `logged` and
  `phaseTotal` come from the same per-phase counts added in 4.2 (reuse, don't
  re-derive divergently). Label `{Baseline|Within} complete`.
- Day list: one card per `groupByDate` day. Collapsed shows day number + weekday, a
  phase tag, and a one-line session summary. **Expandable** (new client component
  `HistoryDayCard`, `src/components/HistoryDayCard.tsx`) revealing the check-in detail
  line, the Hooper line, and each session line; today's card shows an `Editable today`
  affordance linking to `/checkin` (and `/session` add, preserving current links).
  Expand/collapse is CSS-only (no `motion` package).

### 4.6 App shell (`src/app/(app)/layout.tsx`)
- Remove the global sticky top header (each screen now owns its top area; logout moved
  to the Today avatar).
- **Black bottom nav**, four tabs: Today / Check-in / Session / History (Check-in and
  Session become tabs, not only buttons). Icon over label; active tab white, inactive
  40% white. New client component `RunnerNav` (`src/components/RunnerNav.tsx`) using
  `usePathname` for the active state. Respect `env(safe-area-inset-bottom)`.
- Body keeps bottom padding clear of the nav.

### 4.7 Save toast (optional polish)
On successful save, `saveCheckinAction` / `saveSessionAction` redirect to
`/today?saved=checkin|session`. A small client `Toast` reads the param, shows a black
CSS-animated toast (`wiToastIn`-style keyframe, ~200ms, respects
`prefers-reduced-motion`), then strips the param via `router.replace`. No `motion`
package. If it adds friction, ship without it — the toast is not load-bearing.

## 5. Shared components / new files

| File | Type | Purpose |
| --- | --- | --- |
| `src/components/LoginFlow.tsx` | client | Two-step who → keypad login |
| `src/components/HooperPicker.tsx` | client | 1-5 pill row (replaces HooperSlider) |
| `src/components/RunnerNav.tsx` | client | Black bottom nav, active via usePathname |
| `src/components/HistoryDayCard.tsx` | client | Expandable history day |
| `src/components/ui/switch.tsx` | client | Monochrome shadcn Switch |
| `src/components/ScreenHeader.tsx` | server | Black header bar (back + title + right slot) for Check-in/Session |
| `src/components/Toast.tsx` | client | Optional save toast |

Changed: `login/page.tsx`, `login/actions.ts`, `today/page.tsx`, `lib/today.ts`,
`checkin/page.tsx`, `session/page.tsx`, `RpeSlider.tsx`, `history/page.tsx`,
`(app)/layout.tsx`, `checkin/actions.ts` + `session/actions.ts` (redirect target only,
if toast is included).

Removed: `HooperSlider.tsx`, `tests/HooperSlider.test.tsx`.

## 6. Testing

- **New:** `tests/HooperPicker.test.tsx` (hidden input submits selected value);
  extend `tests/today.test.ts` for `baselineLogged` / `withinLogged` counts across
  baseline/within/mixed date sets.
- **Green, unchanged:** `RpeSlider.test.tsx`, `checkin.action.test.ts`,
  `session.action.test.ts`, `login.action.test.ts`, `today.test.ts` existing cases,
  `streak`, `phase`, `history`, `dates`, `validation`.
- **Verify by build + type-check** (no browser in CI): pages, layout, `LoginFlow`,
  `RunnerNav`, `HistoryDayCard`, `switch`. `pnpm lint`, `pnpm test`, `pnpm build` all
  clean before done.
- The Switch FormData wire format is verified once in a throwaway render/test before
  relying on it (mirrors the diligence noted on the existing Checkbox).

## 7. Visual system (translation targets)

From the design, mapped to existing tokens in `src/app/globals.css`:
- Surfaces: black `--wi-black` full-bleed panels; light `--wi-paper` / `--wi-paper-dim`
  bodies; cards white with hairline `--wi-line`.
- On-dark text/lines: `text-wi-on-dark-2/3`, `border-wi-on-dark-line`,
  `bg-wi-on-dark-fill`.
- Type: uppercase tracked eyebrows/labels (`font-bold uppercase tracking-[0.14em]`,
  `text-2xs`), tight display headings (`tracking-[-0.02em]`), body 400/500 leading 1.5.
- Corners: 6px controls (`--wi-radius-control`), 10px cards (`rounded-lg`), 8px on
  action tiles / pills as the design specifies (arbitrary values where off-scale).
- Icons: `lucide-react` only (Home, Sunrise/Sun, Activity, Clock/History, Grid,
  Download, Users, Check, Zap, ChevronRight, ArrowLeft, AlertCircle, Key, Pencil,
  Delete/Backspace). No emoji, no inline hand-drawn SVG beyond what lucide provides.

## 8. Open risk / watch items

- Turbopack: do not run `pnpm build` while `pnpm dev` is live (poisons the CSS cache).
- Base UI `Switch` form-input behavior — verify before committing to it.
- Keep `LoginFlow` a client island; the page stays a server component so the roster
  query runs server-side and no member data is over-fetched.
