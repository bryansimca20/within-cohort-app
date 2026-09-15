# WITHIN Cohort Log

## 1. Project Overview

Installable PWA where the WITHIN Cohort (7 runners + 2-3 founders) logs the Cohort
Protocol every day. It is the operational tool behind the deck in
`../presentations/within-cohort-protocol-2026-07-20/`. Full spec and plan:

- Spec: [docs/superpowers/specs/2026-07-23-within-cohort-log-design.md](docs/superpowers/specs/2026-07-23-within-cohort-log-design.md)
- Plan: `docs/superpowers/plans/2026-07-23-within-cohort-log.md` (gitignored, local only)

**v1 is capture-only.** It reliably collects clean, baseline-anchored logs (a daily
morning check-in and event-triggered session logs) over a 6-week protocol, lets
founders monitor completion and export CSV, and nothing more. Every derived metric,
chart, and the Recovery Intelligence Report are **phase 2 and must not be built in v1**.

- Backend is a small serverless Postgres via Drizzle, custom passcode auth, and one
  Web Push cron. Deploys to **Vercel**.
- Membership is fixed and hand-picked. No public sign-up.

## 2. Commands

| Command | What it does |
| --- | --- |
| `pnpm dev` | Dev server (Turbopack) at `http://localhost:3000` |
| `pnpm build` | Production build (Turbopack) |
| `pnpm start` | Serve the built app |
| `pnpm lint` | ESLint (flat config, `eslint-config-next`) |
| `pnpm test` | Vitest suite once |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm db:generate` | Generate Drizzle migrations from `src/db/schema.ts` into `drizzle/` |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |
| `pnpm seed` | Seed the cohort roster + print one-time passcodes (edit the roster first) |
| `pnpm dlx shadcn@latest add <component>` | Add a shadcn/ui primitive |

Package manager is **pnpm** (`pnpm-lock.yaml` is source of truth; pinned via the `packageManager` field in `package.json`). No `npm` / `yarn` lockfiles. pnpm forwards bare flags to the script, so `pnpm dev --port 3003` works directly (no `--` separator). Native build scripts (esbuild, sharp, unrs-resolver) are pre-approved via `pnpm.onlyBuiltDependencies`.

## 3. Environment

- **Node.js** `>= 20.9` (Next.js 16). Dev machine runs Node 22.
- Secrets in `.env.local` (gitignored) locally and Vercel project settings in prod.
  Adding a key means mirroring it here and surfacing it to the user first.

| Key | Purpose |
| --- | --- |
| `DATABASE_URL` | Serverless Postgres (Neon / Vercel Postgres) connection string |
| `SESSION_SECRET` | iron-session cookie signing secret, **32+ chars** |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push (generate with `pnpm dlx web-push generate-vapid-keys`) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Same value as `VAPID_PUBLIC_KEY`, deliberately client-exposed for `pushManager.subscribe()` |
| `CRON_SECRET` | Bearer token the reminder cron route checks |

- Never prefix a secret with `NEXT_PUBLIC_`. `VAPID_PUBLIC_KEY` is the only value the
  client legitimately needs; expose it deliberately, not by convention.

## 4. Tech Stack

- **Next.js 16** — App Router, Turbopack for `dev` and `build`. This major has breaking
  changes vs. training data: `cookies()` and route `params` are async, the middleware
  file convention is deprecated in favour of `proxy.ts`. Read the bundled guides in
  `node_modules/next/dist/docs/` before writing framework code.
- **React 19** / `react-dom` 19.
- **TypeScript 5**, strict mode.
- **Tailwind CSS v4** — CSS-first, no `tailwind.config.*`; tokens are CSS variables in
  [src/app/globals.css](src/app/globals.css).
- **shadcn/ui** — the UI primitive layer (Base UI, style `base-nova`, base color
  `neutral`, RSC). Primitives live in `src/components/ui/`, restyled to the WITHIN
  monochrome system. See UI and Design Rules.
- **lucide-react** — the only icon source.
- **Drizzle ORM** + **postgres** — schema in [src/db/schema.ts](src/db/schema.ts),
  migrations in `drizzle/`. The prod client (`src/db/client.ts`) is a **lazy get-only
  Proxy** so importing it without `DATABASE_URL` (e.g. in tests) does not connect.
- **iron-session** (signed cookie) + **bcryptjs** (passcode hashing).
- **web-push** (VAPID) + a Vercel cron for reminders.
- **date-fns** / **date-fns-tz** — all "today" logic is timezone-aware.
- **zod** — shared client/server validation ([src/lib/validation.ts](src/lib/validation.ts)).
- **Vitest** + **@electric-sql/pglite** — tests. See Testing.

## 5. Architecture

App Router under [src/](src/) with the `@/*` → `./src/*` alias.

```
src/
├── middleware.ts          # Session guard (redirects to /login without the cookie)
├── app/
│   ├── layout.tsx         # Root layout (Inter, globals, PWA meta)
│   ├── globals.css        # Tailwind v4 import + WITHIN monochrome tokens
│   ├── login/             # Passcode login page + login/logout actions
│   ├── (app)/             # Runner area (guarded): today, checkin, session, history
│   │   ├── layout.tsx     # App shell (header, bottom nav) — standalone-PWA safe
│   │   ├── today/         # page.tsx
│   │   ├── checkin/       # page.tsx + actions.ts (saveCheckin core + wrapper)
│   │   ├── session/       # page.tsx + actions.ts (saveSession core + wrapper)
│   │   └── history/       # page.tsx
│   ├── admin/             # Founder area (requireAdmin): dashboard, member/[id], members, export
│   └── api/               # push/subscribe, cron/remind (route handlers)
├── components/
│   ├── ui/                # shadcn/ui primitives (WITHIN-restyled, owned in-repo)
│   ├── brand/             # WITHIN brand mark (WithinLogo) — see WITHIN Design System
│   └── *.tsx              # Composed feature components (forms, sliders, install card)
├── db/                    # schema.ts, client.ts (lazy Proxy)
└── lib/                   # phase, dates, validation, session, passcode, streak, today,
                           # csv, dashboard, history, rateLimit, push — pure/infra helpers
tests/                     # Vitest specs + helpers/testDb.ts (pglite harness)
drizzle/                   # generated SQL migrations (committed)
scripts/                   # seed.ts, gen-icons.mjs
```

- **Server Components by default.** `"use client"` only for interactivity (sliders,
  forms with `useActionState`, install detection), pushed as deep as possible.
- **`params` and `cookies()` are async** in Next 16: `const { id } = await params;`.

## Rules

- Path alias `@/*` → `./src/*`. Always use it.
- `page.tsx` / `layout.tsx` are async server components; add `"use client"` only when
  needed, as deep in the tree as possible.
- A `"use server"` file exports **only async functions**. Types/consts its callers need
  live in `src/lib/` or a sibling non-action file, never in the action file.
- Co-locate route-specific code; promote to `src/components/` or `src/lib/` only when
  reused across 2+ routes. `src/lib/` is pure/framework helpers, not one-off route glue.

## Coding Conventions

**TypeScript**
- Strict mode. Avoid `any`. Avoid the non-null assertion `!` in app logic — handle
  `null`/`undefined` explicitly (early return, guard, default). The narrow exception is
  reading a required env var at a trusted boundary (`process.env.X!`), which is fine.
- Prefer inferred types. Derive DB types from Drizzle (`typeof members.$inferSelect`,
  exported as `Member`), input types from zod (`z.infer<typeof checkinSchema>`). Do not
  hand-maintain a parallel interface for a table or a validated payload.
- Route files (`page.tsx`, `layout.tsx`) use default exports (Next requires it). Every
  other file uses **named exports**.

**Server actions and pure cores**
- Split each write into a **pure core** that takes the db as its first argument and a
  thin `"use server"` wrapper: `saveCheckin(db, member, input, now)` + `saveCheckinAction(formData)`.
  The core is unit-tested against pglite; the wrapper adds `requireMember()`/`requireAdmin()`,
  parses `FormData`, `revalidatePath`, `redirect`. This is the established pattern
  (checkin/session/dashboard/export/members) — follow it for every new write.
- Type the db param as `AnyPgDatabase = PgDatabase<PgQueryResultHKT, Schema>` (from
  `drizzle-orm/pg-core`) so both the prod client and a pglite test db type-check.
- Wrappers **re-validate** and **reject missing/empty required fields** before coercion.
  A server action is reachable by direct POST — never trust the form did the checking.
- Query only via Drizzle method chains. Never do reflective access (`{...db}`,
  `instanceof`, property enumeration) on the `db` Proxy — it implements only a `get` trap.

**Comments**
- One `/** ... */` line above each exported function/component describing purpose, not
  the type signature. Skip self-explanatory throwaways. No dead/commented-out code.

## UI and Design Rules

**Use shadcn/ui and lucide as much as possible. This is the primary UI rule.**

- **Always prefer a shadcn/ui primitive over a custom implementation.** Check
  `src/components/ui/` first. A slider is shadcn `Slider`, a text/number field is
  `Input` + `Label`, a dropdown is `Select`, a checkbox is `Checkbox`, a button is
  `Button`, a panel is `Card`. Compose and wrap these — do not re-invent them.
- `ui/` primitives are **WITHIN-restyled and owned in-repo**. Re-running
  `pnpm dlx shadcn@latest add <component>` overwrites the file with the vanilla version;
  after any re-add, reapply the WITHIN monochrome restyle and diff before committing.
- If a needed shadcn component is **not installed**, install it
  (`pnpm dlx shadcn@latest add <component>`). If a component does **not exist in shadcn at
  all**, surface options to the user before hand-rolling one.
- **Icons: `lucide-react` only.** Stroke, ~2px, `currentColor`, sized to adjacent type.
  Never emoji, never a Unicode pictograph. The logomark is a brand mark, not an icon.
- Feature components (forms, the install card) **compose** `ui/` primitives; they do not
  duplicate primitive styling.
- For the logo, use `WithinLogo` in [src/components/brand/](src/components/brand/) — never
  hand-draw the mark. Headings and eyebrows are class recipes on the type scale (see WITHIN
  Design System), not components, until a screen repeats one.

**Styling**
- **Tailwind utilities only — never `style={}` for a static value.** Use arbitrary
  values for off-scale numbers (`rounded-[6px]`, `tracking-[0.14em]`, `max-w-[420px]`).
  `style={}` is allowed only for runtime-driven values (an animated width from state).
- Use `cn()` (from `src/lib/utils.ts`) for conditional classes.
- Extract a component for a repeated multi-class pattern, never a CSS class.

## WITHIN Design System

The durable brand guardrail — **the same system that ships in
`../within-website-coming-soon`**. Both apps carry an identical token layer; keep them in
lockstep (port new tokens from that app, never re-derive them). Tokens live in
[src/app/globals.css](src/app/globals.css); brand primitives in
[src/components/brand/](src/components/brand/). Source of truth: the Claude Design project
`9a760727-dad3-4223-afd7-78934815824f` ("Within Design System"); values mirror
`../presentations/design-system/`.

**Where the system lives — reach for a token/utility, never hard-code a raw value.**

| Layer | Defined as (in `globals.css`) | Use it as |
| --- | --- | --- |
| Raw palette | `--color-wi-*` (`@theme`) | `bg-wi-black`, `text-wi-ink-500`, `border-wi-line`, `bg-wi-paper` |
| On-dark tints | `--color-wi-on-dark-*` (`@theme`) | `text-wi-on-dark-2`, `border-wi-on-dark-line` on black panels |
| Semantic (shadcn bridge) | `--primary`, `--muted-foreground`, `--border`, … | `bg-primary`, `text-muted-foreground`, `bg-card`, `border-border` |
| Type scale | `--text-display-2xl … --text-2xs` (`@theme`) | `text-display-lg`, `text-h1`, `text-body`, `text-2xs` |
| Radius / shadow / motion / type tokens | `--wi-radius-*`, `--wi-shadow-*`, `--wi-ease-*`, `--wi-tracking-*` (`:root`) | `rounded-[6px]` controls / `rounded-lg` cards; arbitrary-value classes reading the token |

**Brand primitives (`src/components/brand/`).**
- `WithinLogo` — the official logotype/logomark PNGs from `public/brand/`. Prefer it over
  any hand-drawn mark.

There is deliberately **no** `WiHero` / `WiEyebrow` component: this app has no marketing
hero, and the uppercase micro-label is a one-line class recipe (see Type below), not yet
worth a component. Componentize a heading or eyebrow only when a real screen repeats it 3+
times (the abstraction rule).

**Color — monochrome, no hue anywhere.** The whole palette is `#000000` · `#191919` ·
`#f2f2f2` · `#ffffff` (+ documented ink/line/mist greys). Hierarchy comes from weight, fill,
and contrast, never chroma. Status (success/error, checked-in/missing) is monochrome.
Never invent a color, never `oklch`, never a `dark:` variant. Default body text is charcoal
(`--foreground`); reserve full black (`text-wi-black` / `text-card-foreground`) for emphasis.

**Type — Inter only, no italics** at any weight (upright everywhere). Two registers:
hero/label = 700, UPPERCASE, tight tracking (`font-bold uppercase tracking-[0.14em]`, e.g.
`text-2xs` eyebrows / `text-h1` titles); body = 400/500, leading 1.5. The scale is exposed
as `text-display-2xl … text-2xs`.

**Voice — honest, introverted, high-performing.** Short declarative statements. Facts
over adjectives. **No em dashes.** No emoji, no exclamation marks, no hype words.

**Form.** Near-square corners: 6px controls (`--wi-radius-control`), 10px cards
(`rounded-lg`). Hairline `#d6d6d6` borders; emphasis borders full black at 1.5-2px. Low,
tight, neutral shadows (`--wi-shadow-sm/md/lg`) — no gradients, no textures, no decorative
illustration.

**Motion.** The motion *tokens* ship (`--wi-ease-out`, `--wi-duration-*`, `--wi-press-scale`)
so any micro-interaction stays on-system: quick, precise, **no visible bounce**, short
opacity/transform tweens only. Unlike the marketing site the capture screens deliberately
add **no** `motion` package or scroll-reveal animation. It's a 7 a.m. one-handed capture
tool, so content appears instantly. The single exception is the first-run `/welcome`
onboarding route, which lazy-loads `motion` (imported only under
`src/components/onboarding/`, so route code-splitting keeps it out of every capture-screen
bundle). New motion must not leak outside that folder.

**Logo.** Always use `WithinLogo` (PNGs in `public/brand/`). **Never redraw, trace, or
recolour the mark.**

**Intentional divergences from the coming-soon copy — do not "fix" them.** cohort's
`globals.css` omits `@import "shadcn/tailwind.css";` (no `shadcn` dep; owned primitives
don't need base-nova's base layer) and the app adds the `motion` package only for the
`/welcome` onboarding route (never on capture screens). The token layer is otherwise
identical.

- Built for one-handed phone use at 7 a.m.: large tap targets, minimal typing, sliders
  over keyboards.

## Testing

- **Vitest** (`*.test.ts` / `*.test.tsx` in `tests/`). `testTimeout` is 20000ms (bcrypt
  under parallel load can exceed the 5000ms default). Vitest globals are on (`test`,
  `expect` without import).
- **Database tests use pglite, not mocks.** `makeTestDb()` in
  [tests/helpers/testDb.ts](tests/helpers/testDb.ts) spins an in-memory Postgres and runs
  the real `drizzle/` migrations. Run `pnpm db:generate` before testing new schema.
- **What to test:** pure logic and pure cores — `phase`, `dates`, `streak`, `validation`,
  `csv`, `dashboard`, `history` grouping, and every `save*`/`*Rows`/`create*` db-param
  core (insert/read/upsert behavior, phase stamping, guard rejections) against pglite.
  Tests must assert real inserted/returned data, not that a function was called.
- **What not to test:** framework glue. Server-action wrappers, pages, and route handlers
  that depend on `cookies()`/`redirect()`/`requireMember` are verified by `pnpm build`
  + `tsc`, not by mock-heavy tests. Extract the testable logic into a pure core instead.
- **TDD.** Write the failing test, run it red, implement, run it green, then commit.
- Test output must be pristine — a stray warning is a finding.
- No browser in CI here: UI is verified by build + type-check. A `.tsx` component test
  (jsdom + `@testing-library/react`) is appropriate for a standalone primitive (see
  `tests/HooperSlider.test.tsx`), not for a db-querying server component.

## Domain Rules (do not violate)

- **Capture-only.** No analytics, charts, training-load, trends, or report generation in
  v1. If a task drifts toward computing insight from the logs, stop — that is phase 2.
- **Phase stamping is immutable.** Each check-in / session stores the `phase`
  (`baseline` | `within`) computed at write time from the cohort-wide start date
  (the `cohort_config` singleton row, founder-set in Admin; no env fallback. Pages read
  it via `await getCohortStartDateOrNull(db)` and render a "cohort not opened yet" state
  when it is null). Windows: day 0-13 baseline (`BASELINE_DAYS` = 14),
  14-41 within (`WITHIN_DAYS` = 28), `<0` blocked (pre-start), `>=42` read-only (complete):
  a 6-week protocol, 2 weeks off product then 4 weeks on it. Both lengths are exported
  from [src/lib/phase.ts](src/lib/phase.ts) and every window, day counter and ledger
  length derives from them, so a phase length changes there and nowhere else. Use
  `phaseProgress(state, dayIndex)` for a "day N of M" label rather than re-deriving the
  offset. Never recompute a stored row's phase for display — read the stamped value.
  Pure cores take the start date as an explicit `startDate` param; only the
  `"use server"` wrapper / page reads the env.
- **Timezone.** The whole cohort is on Jakarta time. All "today" uses the
  `COHORT_TIMEZONE` constant (`Asia/Jakarta`, in [src/lib/cohort.ts](src/lib/cohort.ts))
  via `localDateFor`. `localDate` is that calendar date. Never server-local time, never a
  per-member timezone.
- **Edit policy.** Check-ins are same-local-day editable only. **Sessions** are
  editable and deletable by their owner for the whole protocol window (they lock
  when the protocol completes); a session's `localDate` and stamped `phase` never
  change on edit, and `tookServing` follows the stored phase (baseline forces null).
  Deletion is a hard delete. Still no backfill in v1 (a missed day is a visible
  gap, not an invented row).
- **Auth.** Login is member-name select + a **4-digit passcode** (`generatePasscode` emits
  1000-9999). `members.passcode_hash` (bcrypt) is the **only** value login verifies
  against. `members.passcode_plain` stores the same code in the clear so a founder can
  remind a member of it from `/admin/members` without resetting it; it is nullable
  because rows created before that column have a hash and nothing recoverable. Both
  columns are written together by `createMember` / `resetMemberPasscode` / `seed`, so a
  reset invalidates the old code and makes it unrevealable. A passcode is never logged,
  never put in a URL, and never rendered into page HTML: the admin roster fetches one
  through `revealPasscodeAction` on demand, so an unopened `/admin/members` response
  carries no codes. This is a deliberate tradeoff for an 8-person internal tool. A
  4-digit space is 9000 candidates, so a leaked db yields every code to offline brute
  force whether or not the plaintext is stored; the rate limiter on the login route is
  the real defense. Every admin action/page calls `requireAdmin()` first; the runner area
  calls `requireMember()`.
- **`took_serving`** is meaningful only in the `within` phase — the core forces it to
  `null` in baseline regardless of input.
- **First-run onboarding.** `members.onboardedAt` (nullable timestamp) marks first-run
  completion, stamped once via `markOnboarded` at the end of the `/welcome` flow. Null →
  the runner is routed to `/welcome`; set → straight to `/today`. Three gates enforce
  once-ever: the login result, the `(app)` layout, and the `/welcome` page. Detection is
  server-side only. Never add per-device or localStorage gating.

## When in Doubt

Stop and ask. Surface tradeoffs, name what is confusing, do not pick silently. When a
needed component, token, dependency, or env var does not exist, propose options before
writing code.
