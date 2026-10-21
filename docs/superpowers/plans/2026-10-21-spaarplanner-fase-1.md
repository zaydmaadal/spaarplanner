# Spaarplanner fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build phase 1 of Spaarplanner: a mobile-first PWA where a user registers with a username, completes an 8-step onboarding, and sees pots, a projection, a simulator and a checklist, with a payday push notification, deployed automatically to Vercel with Supabase.

**Architecture:** Next.js 16.4 App Router app at the repo root. All money logic lives in pure TypeScript under `src/domain` (no I/O) and is unit tested first. `src/data` holds Supabase clients, mappers and server actions, the only code that writes. Supabase Postgres with RLS on every table; migrations run during the Vercel production build.

**Tech Stack:** Next.js 16.4, React 19.3, TypeScript (strict), Tailwind CSS 4.3, shadcn/ui (Radix) + Sonner, Zod 4, @supabase/ssr, Supabase CLI, web-push, Vitest 5, Playwright 1.64 + @axe-core/playwright, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-21-spaarplanner-design.md` (section numbers below refer to it as "spec §x").

**Workflow:** one branch and pull request per milestone (M1 to M4). CI must be green before merge. The repo is `zaydmaadal/spaarplanner`, local path `/home/user/spaarplanner`.

## Global Constraints

- Node `24.x` everywhere: `package.json` `engines`, `.nvmrc`, `actions/setup-node`, Vercel project setting.
- Money is integer cents (`number`). Display only via `formatEUR` (Task 2): `nl-BE`, 2 decimals, U+00A0 after `€`, negatives as `− € 50,00` (U+2212).
- `src/domain/**` imports nothing from `src/data`, `src/app`, `src/components`, `src/lib`, `next`, `react` or `@supabase/*` (ESLint `no-restricted-imports`).
- UI copy: Dutch, informal "je", sentence case, buttons name their action. Never the em dash character (U+2014) in copy or docs.
- Text contrast ≥ 4.5:1 in light and dark; touch targets ≥ 44 px; visible focus ring; never `maximum-scale=1`; honour `prefers-reduced-motion`.
- Motion tokens: easing `cubic-bezier(0.2, 0, 0, 1)`, durations 120 / 200 / 320 ms.
- Secrets (`SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, `ADMIN_USER_IDS`) are read only through `serverEnv()` (Task 10), only in files that `import 'server-only'`, and exist only in the Vercel Production environment.
- Every table: RLS on, `revoke all from anon, authenticated`, grants to `authenticated` only as needed, all privileges to `service_role`, index on `user_id`.
- Migrations are additive only (add columns or tables; removals happen in a later migration after the code no longer uses them).
- Vercel functions run in `fra1`. Supabase project in `eu-central-1` (Frankfurt).
- No analytics, no tracking scripts, no runtime requests to Google Fonts (`next/font/google` self-hosts).
- `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN = u.zaydmaadal.site`, never changed after launch.

## Review Focus

1. **Amounts typed the Belgian way** (`1.240,50`, `12,5`, `€ 50`, `12.50`): parsed to the right cents, garbage rejected with a message. Test: Task 2 `parseEuroInput` cases.
2. **Double tap on "Opslaan" in the deposit flow** (or a retry on a flaky connection): must not book the deposits twice. Each submit carries a client-generated `client_ref` UUID; `transactions` has `unique (user_id, client_ref)` and the action treats a conflict as success. Tests: Task 9 pgTAP unique test, Task 17 e2e double submit.
3. **Midnight and daylight-saving nights across time zones**: "today" is the user's local date, not the UTC date, also in the DST nights of 29 March and 25 October 2026. Tests: Task 3 `todayInTimeZone` cases and the Task 20 cron case at 23:30 UTC.
4. **A user who skips income, expenses and goals in onboarding**: onboarding still completes, the payday strip hides, the emergency fund gets the € 1.000 estimate, the overview renders without errors. Tests: Task 8 dashboard test with empty data, Task 15 e2e "skip everything".
5. **A deadline already in the past when a goal is created**: the preview and the goal show `niet haalbaar` with the extra amount, no crash or division by zero. Tests: Task 5 example 4, Task 17 e2e create goal with past deadline.

---

## File Structure

```
package.json, .nvmrc, tsconfig.json, next.config.ts, eslint.config.mjs, vitest.config.ts, playwright.config.ts, vercel.json
CLAUDE.md                         agent rules (Task 1)
DESIGN.md                         tokens and do/don't (Task 13)
scripts/vercel-build.sh           prod migrations then next build (Task 21)
.github/workflows/ci.yml          checks (Task 1, extended Task 9)
.github/workflows/backup.yml      weekly encrypted dump (Task 21)
.claude/skills/*                  vendored design skills (Task 13)
supabase/config.toml, migrations/20261021000001_init.sql, tests/*.test.sql   (Task 9)
src/domain/types.ts               shared domain types (Task 2)
src/domain/money.ts               formatEUR, parseEuroInput, toMonthlyCents (Task 2)
src/domain/dates.ts               ISO date and year-month helpers (Task 3)
src/domain/payday.ts              payday rules, periods, primary payday (Task 3)
src/domain/budget.ts              monthly budget, savings target, suggestions, warnings (Task 6)
src/domain/allocation.ts          allocate (Task 4)
src/domain/projection.ts          project, goalStatus, extraNeededCents, compareProjections (Task 5)
src/domain/certainty.ts           levels and labels (Task 7)
src/domain/checklist-rules.ts     evaluateRules (Task 7)
src/domain/dashboard.ts           buildDashboard (Task 8)
src/domain/fixtures/personas.ts   six persona datasets (Task 8)
src/lib/env.ts                    publicEnv, serverEnv, signupConfig (Task 10)
src/lib/push.ts                   sendPush (Task 19)
src/lib/push-client.ts            subscribe/unsubscribe in the browser (Task 19)
src/lib/service-worker.js         push + notificationclick (Task 19)
src/data/supabase/{browser,server,admin}.ts   clients (Task 10)
src/data/database.types.ts        generated (Task 9)
src/data/mappers.ts               rows to domain types (Task 14)
src/data/load.ts                  loadUserData (Task 14)
src/data/schemas.ts               Zod schemas shared by actions and forms (Task 11, 14)
src/data/actions/*.ts             server actions per entity (Tasks 11, 12, 14, 17, 18, 19)
src/data/cron/payday.ts           runPaydayCron (Task 20)
src/proxy.ts                      session, allow-list, password-change redirect, headers (Task 10)
src/app/...                       routes (Tasks 11, 12, 15 to 18, 20)
src/components/ui/*               shadcn primitives (Task 13)
src/components/*                  feature components (Tasks 13, 15 to 19)
e2e/*.spec.ts                     Playwright (Tasks 11, 15, 17, 18, 19, 21)
```

Shared result type for every server action, defined in `src/data/schemas.ts` (Task 11):
```ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };
```

---

## Milestone 1: Fundament (branch `m1-fundament`)

### Task 1: Scaffold, tooling and CI

**Files:**
- Create: Next.js app at repo root, `.nvmrc`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs` (extend), `CLAUDE.md`, `.github/workflows/ci.yml`, `src/domain/smoke.test.ts`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `e2e` (`playwright test`).

- [ ] **Step 1:** `npx create-next-app@16.4 <scratch>/app --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --use-npm`, then move its files into the repo root (the repo already has `docs/`, which create-next-app refuses). Set `"engines": { "node": "24.x" }`, write `.nvmrc` with `24`. Add dev deps: `vitest@5`, `@vitejs/plugin-react`, `vite-tsconfig-paths`, `@playwright/test@1.64`, `@axe-core/playwright`, `server-only`, `zod@4`.
- [ ] **Step 2:** `vitest.config.ts`: environment `node`, include `src/**/*.test.ts`. `playwright.config.ts`: `testDir: 'e2e'`, projects `iPhone 14` and `Pixel 7` devices, `webServer: { command: 'npm run start', port: 3000, reuseExistingServer: !process.env.CI }`.
- [ ] **Step 3:** In `eslint.config.mjs` add `no-restricted-imports` for files `src/domain/**` with patterns `@/data/*`, `@/app/*`, `@/components/*`, `@/lib/*`, `next`, `next/*`, `react`, `@supabase/*`.
- [ ] **Step 4: Write the smoke test** `src/domain/smoke.test.ts`: `expect(1 + 1).toBe(2)` (deleted in Task 2).
- [ ] **Step 5:** `CLAUDE.md` (≤ 60 lines): project one-liner and spec/plan paths; commands; layer rule; money rule; Dutch copy rules incl. no em dash; "smallest change that works" (ponytail); token rules (keep files short, look up docs via context7 when available instead of pasting, cheaper model for mechanical subtasks, one plan task per session, do not re-read large files); after every migration run the Supabase advisors via the Supabase MCP (`get_advisors`) and fix all except `leaked_password_protection`.
- [ ] **Step 6:** `.github/workflows/ci.yml` job `check` on `pull_request` and `push` to `main`: checkout, setup-node 24 with npm cache, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- [ ] **Step 7: Verify:** `npm run lint && npm run typecheck && npm test && npm run build` all exit 0.
- [ ] **Step 8: Commit** `chore: scaffold Next.js app, tooling and CI`

### Task 2: Domain types and money

**Files:**
- Create: `src/domain/types.ts`, `src/domain/money.ts`, `src/domain/money.test.ts`; delete `src/domain/smoke.test.ts`

**Interfaces:**
- Produces (`types.ts`):
```ts
export type Cents = number;
export type ISODate = string; // 'YYYY-MM-DD'
export type YearMonth = { year: number; month: number }; // month 1..12
export type Frequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly' | 'once';
export type IncomeKind = 'salary' | 'side' | 'student' | 'benefit' | 'allowance' | 'other';
export type PaydayRule =
  | { type: 'day_of_month'; day: number; weekend: 'before' | 'after' }
  | { type: 'last_working_day' }
  | { type: 'weekday'; weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7 } // 1 = monday
  | { type: 'irregular' };
export type Income = { id: string; name: string; kind: IncomeKind; frequency: Frequency; amountCents: Cents;
  amountLowCents: Cents | null; variability: 'fixed' | 'variable'; month: number | null; date: ISODate | null;
  paydayRule: PaydayRule; isEstimate: boolean; active: boolean };
export type BudgetLine = { id: string; kind: 'fixed' | 'living' | 'free'; category: string; name: string; amountCents: Cents; isEstimate: boolean };
export type GoalKind = 'emergency' | 'savings' | 'trip' | 'purchase' | 'other';
export type Goal = { id: string; kind: GoalKind; name: string; targetCents: Cents; targetIsEstimate: boolean;
  balanceCents: Cents; deadline: YearMonth | null; priority: number; weight: number; isMain: boolean;
  archived: boolean; createdAt: string };
export type PlanSettings = { monthlySavingsCents: Cents | null; emergencySharePct: number;
  incomeMode: 'careful' | 'normal'; includeOneOffIncome: boolean };
```
- Produces (`money.ts`): `formatEUR(cents: Cents): string`, `parseEuroInput(text: string): Cents | null`, `toMonthlyCents(amountCents: Cents, frequency: Frequency): Cents`, `ceilTo100(cents: Cents): Cents`.

- [ ] **Step 1: Write the failing tests** in `money.test.ts`:
```ts
expect(formatEUR(124000)).toBe('€ 1.240,00');
expect(formatEUR(0)).toBe('€ 0,00');
expect(formatEUR(-5000)).toBe('− € 50,00');
expect(parseEuroInput('12,50')).toBe(1250);
expect(parseEuroInput('1.240,50')).toBe(124050);
expect(parseEuroInput('1240')).toBe(124000);
expect(parseEuroInput('12.5')).toBe(1250);
expect(parseEuroInput('12.50')).toBe(1250);
expect(parseEuroInput('1.240')).toBe(124000);   // one dot + exactly 3 digits = thousands
expect(parseEuroInput('1.240.000')).toBe(124000000);
expect(parseEuroInput(' € 50 ')).toBe(5000);
for (const bad of ['', 'abc', '1,2,3', '-5', '0,005', '12,', '1.24.0']) expect(parseEuroInput(bad)).toBeNull();
expect(toMonthlyCents(10000, 'monthly')).toBe(10000);
expect(toMonthlyCents(10000, 'weekly')).toBe(43333);
expect(toMonthlyCents(10000, 'biweekly')).toBe(21666);
expect(toMonthlyCents(10000, 'yearly')).toBe(0);
expect(toMonthlyCents(10000, 'once')).toBe(0);
expect(ceilTo100(8571)).toBe(8600);
expect(ceilTo100(8600)).toBe(8600);
```
- [ ] **Step 2: Run** `npx vitest run src/domain/money.test.ts`. Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `money.ts`. `formatEUR` wraps `Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })` on the absolute value and prefixes `− ` for negatives; normalise any space between `€` and digits to U+00A0. `parseEuroInput`: strip `€` and whitespace; if a comma is present, dots must be thousand groups of 3 and the comma decimal with 1 to 2 digits; without comma, multiple dots or one dot followed by exactly 3 digits are thousands, otherwise the dot is decimal with 1 to 2 digits; negative or empty returns `null`.
- [ ] **Step 4: Run** the test file. Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): money formatting and parsing`

### Task 3: Dates, paydays and periods

**Files:**
- Create: `src/domain/dates.ts`, `src/domain/payday.ts`, `src/domain/payday.test.ts`

**Interfaces:**
- Produces (`dates.ts`): `daysInMonth(ym: YearMonth): number`, `weekdayOf(d: ISODate): 1..7` (1 = monday), `addDays(d: ISODate, n: number): ISODate`, `daysBetween(a: ISODate, b: ISODate): number`, `toYearMonth(d: ISODate): YearMonth`, `addMonths(ym: YearMonth, n: number): YearMonth`, `monthIndex(ym: YearMonth): number` (`year * 12 + month - 1`), `monthsInclusive(from: YearMonth, to: YearMonth): number` (min 1), `formatMonthNl(ym: YearMonth): string` (`'jan 2027'`, short names `jan feb mrt apr mei jun jul aug sep okt nov dec`), `todayInTimeZone(timeZone: string, now: Date): ISODate` (falls back to `Europe/Brussels` on an invalid zone).
- Produces (`payday.ts`): `export type Period = { start: ISODate; end: ISODate; month: YearMonth }`; `paydayInMonth(rule: PaydayRule, ym: YearMonth): ISODate | null`; `nextPayday(rule: PaydayRule | null, today: ISODate): ISODate | null` (first payday ≥ today); `currentPeriod(rule: PaydayRule | null, today: ISODate): Period`; `periodProgress(p: Period, today: ISODate): number` (`daysBetween(p.start, today) / (daysBetween(p.start, p.end) + 1)`); `primaryPaydayRule(incomes: Income[]): PaydayRule | null`.

All dates are plain `YYYY-MM-DD` strings computed in UTC arithmetic; no date library.

- [ ] **Step 1: Write the failing tests** (spec §5.2, §5.6, §5.9 rows 7 and 8):
```ts
const d31b = { type: 'day_of_month', day: 31, weekend: 'before' } as const;
const d31a = { type: 'day_of_month', day: 31, weekend: 'after' } as const;
const d29 = { type: 'day_of_month', day: 29, weekend: 'before' } as const;
expect(paydayInMonth(d31b, { year: 2027, month: 2 })).toBe('2027-02-26');
expect(paydayInMonth(d31a, { year: 2027, month: 2 })).toBe('2027-02-26'); // never into March
expect(paydayInMonth(d31a, { year: 2027, month: 1 })).toBe('2027-01-29'); // 31 jan is sunday
expect(paydayInMonth({ type: 'day_of_month', day: 3, weekend: 'after' }, { year: 2026, month: 10 })).toBe('2026-10-05');
expect(paydayInMonth({ type: 'day_of_month', day: 3, weekend: 'before' }, { year: 2026, month: 10 })).toBe('2026-10-02');
expect(paydayInMonth({ type: 'last_working_day' }, { year: 2026, month: 10 })).toBe('2026-10-30');
expect(paydayInMonth(d29, { year: 2026, month: 10 })).toBe('2026-10-29');
expect(paydayInMonth({ type: 'irregular' }, { year: 2026, month: 10 })).toBeNull();
expect(nextPayday(d29, '2026-10-20')).toBe('2026-10-29');
expect(nextPayday(d29, '2026-10-29')).toBe('2026-10-29');
expect(nextPayday(d29, '2026-10-30')).toBe('2026-11-27'); // 29 nov is sunday
expect(currentPeriod(d29, '2026-10-20')).toEqual({ start: '2026-09-29', end: '2026-10-28', month: { year: 2026, month: 9 } });
expect(currentPeriod(d29, '2026-10-29').start).toBe('2026-10-29');
expect(currentPeriod(null, '2026-10-20')).toEqual({ start: '2026-10-01', end: '2026-10-31', month: { year: 2026, month: 10 } });
expect(periodProgress(currentPeriod(d29, '2026-10-20'), '2026-10-20')).toBeCloseTo(0.7);
expect(todayInTimeZone('Europe/Brussels', new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-25');
expect(todayInTimeZone('Europe/Brussels', new Date('2026-03-29T00:30:00Z'))).toBe('2026-03-29');
expect(todayInTimeZone('Not/AZone', new Date('2026-10-24T23:30:00Z'))).toBe('2026-10-25');
expect(formatMonthNl({ year: 2027, month: 1 })).toBe('jan 2027');
expect(monthsInclusive({ year: 2026, month: 11 }, { year: 2027, month: 1 })).toBe(3);
expect(monthsInclusive({ year: 2026, month: 11 }, { year: 2026, month: 9 })).toBe(1);
```
`primaryPaydayRule` tests: salary monthly € 2.150 day 29 + side monthly € 300 day 5 + student weekly → the day-29 rule; only `irregular` incomes → `null`; a `variable` income compares on `amountCents`.
- [ ] **Step 2: Run** `npx vitest run src/domain/payday.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `dates.ts` and `payday.ts`. `paydayInMonth`: clamp the day to `daysInMonth`, then shift a weekend day; `after` that would leave the month falls back to `before`. `currentPeriod` with a rule: start = latest payday ≤ today (look at this month, else previous month), end = day before the next payday after start. `todayInTimeZone` uses `Intl.DateTimeFormat('en-CA', { timeZone })`.
- [ ] **Step 4: Run** the test file. Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): paydays and periods`

### Task 4: Allocation

**Files:**
- Create: `src/domain/allocation.ts`, `src/domain/allocation.test.ts`, `src/domain/test-helpers.ts` (goal builders `emergency(target, balance?)`, `goal(id, target, opts?)`)

**Interfaces:**
- Consumes: `Goal`, `YearMonth` (Task 2), `monthsInclusive` (Task 3), `ceilTo100` (Task 2).
- Produces: `allocate(availableCents: Cents, goals: Goal[], emergencySharePct: number, periodMonth: YearMonth): Record<string, Cents>` (a key for every non-archived goal, 0 when it gets nothing). Exactly spec §5.3 steps 1 to 5, sort order deadline → priority → createdAt → id, shares floored to the cent, remainder cents of step 3 to the first goal in sort order with room.

- [ ] **Step 1: Write the failing tests** (period month november 2026, euros as cents):
```ts
const nov = { year: 2026, month: 11 };
// spec §5.9 row 1..6, first-period column
expect(allocate(50000, [emergency(150000), goal('reis', 100000)], 100, nov)).toEqual({ nood: 50000, reis: 0 });
expect(allocate(50000, [emergency(150000), goal('reis', 100000)], 50, nov)).toEqual({ nood: 25000, reis: 25000 });
expect(allocate(50000, [emergency(150000, 150000), goal('laptop', 120000, { deadline: { year: 2027, month: 1 } }), goal('reis', 100000, { priority: 2 })], 100, nov))
  .toEqual({ nood: 0, laptop: 40000, reis: 10000 });
expect(allocate(50000, [emergency(150000, 150000), goal('laptop', 120000, { deadline: nov })], 100, nov)).toEqual({ nood: 0, laptop: 50000 });
expect(allocate(0, [emergency(150000), goal('reis', 100000)], 100, nov)).toEqual({ nood: 0, reis: 0 });
expect(allocate(30000, [emergency(10000, 10000), goal('a', 100000, { weight: 2 }), goal('b', 100000, { priority: 2 })], 100, nov)).toEqual({ nood: 0, a: 20000, b: 10000 });
// remainder cents, step 4 (ahead of schedule), step 5 (buffer), archived
expect(allocate(100, [goal('a', 1000), goal('b', 1000, { priority: 2 }), goal('c', 1000, { priority: 3 })], 100, nov)).toEqual({ a: 34, b: 33, c: 33 });
expect(allocate(50000, [emergency(150000, 150000), goal('laptop', 120000, { deadline: { year: 2027, month: 12 } })], 100, nov)).toEqual({ nood: 0, laptop: 50000 });
expect(allocate(50000, [emergency(150000, 150000), goal('reis', 100000, { balance: 100000 })], 100, nov)).toEqual({ nood: 50000, reis: 0 });
expect(allocate(50000, [emergency(0), goal('oud', 1000, { archived: true })], 100, nov)).toEqual({ nood: 50000 });
```
- [ ] **Step 2: Run** `npx vitest run src/domain/allocation.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `allocate`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): allocation rules`

### Task 5: Projection, status and effect preview

**Files:**
- Create: `src/domain/projection.ts`, `src/domain/projection.test.ts`

**Interfaces:**
- Consumes: `allocate` (Task 4), `addMonths`, `monthIndex`, `formatMonthNl` (Task 3).
- Produces:
```ts
export type OneOff = { month: YearMonth; cents: Cents };
export type ProjectionInput = { goals: Goal[]; savingsCents: Cents; emergencySharePct: number;
  startMonth: YearMonth; depositedThisPeriodCents: Cents; oneOffs: OneOff[] };
export type Fill = number | 'full' | null; // period index k, already full, or not within horizon
export type Projection = { fill: Record<string, Fill>; horizon: number };
export function horizonFor(goals: Goal[], startMonth: YearMonth): number; // max(120, months to latest deadline), ≤ 480
export function project(input: ProjectionInput): Projection;
export function fillMonth(fill: Fill, startMonth: YearMonth): YearMonth | 'full' | null;
export type GoalStatus = 'op_schema' | 'krap' | 'niet_haalbaar';
export function goalStatus(input: ProjectionInput, goalId: string): GoalStatus | null; // null when no deadline
export function extraNeededCents(input: ProjectionInput, goalId: string): Cents; // 0 unless niet_haalbaar; whole euros
export type Shift = { goalId: string; from: YearMonth | 'full' | null; to: YearMonth | 'full' | null; deltaMonths: number | null };
export function compareProjections(before: Projection, after: Projection, startMonth: YearMonth): Shift[]; // only goals whose fill changed
```
Period 0 gets `max(0, savingsCents - depositedThisPeriodCents)`; goal balances already include this period's deposits. A one-off adds its full amount to the period whose month equals `oneOff.month`. `goalStatus` runs `project` with `savingsCents` and with `Math.floor(savingsCents * 0.9)`. `extraNeededCents` binary-searches the smallest whole-euro increase (cap € 100.000) for which the goal fills by its deadline month.

- [ ] **Step 1: Write the failing tests** (`k` = period index from november 2026):
```ts
const base = { savingsCents: 50000, emergencySharePct: 100, startMonth: nov, depositedThisPeriodCents: 0, oneOffs: [] };
// §5.9 rows 1..6
expect(project({ ...base, goals: [emergency(150000), goal('reis', 100000)] }).fill).toEqual({ nood: 2, reis: 4 });
expect(project({ ...base, emergencySharePct: 50, goals: [emergency(150000), goal('reis', 100000)] }).fill).toEqual({ nood: 4, reis: 3 });
const ex3 = { ...base, goals: [emergency(150000, 150000), goal('laptop', 120000, { deadline: { year: 2027, month: 1 } }), goal('reis', 100000, { priority: 2 })] };
expect(project(ex3).fill).toEqual({ nood: 'full', laptop: 2, reis: 4 });
expect(goalStatus(ex3, 'laptop')).toBe('op_schema');
const ex4 = { ...base, goals: [emergency(150000, 150000), goal('laptop', 120000, { deadline: nov })] };
expect(project(ex4).fill.laptop).toBe(2);
expect(goalStatus(ex4, 'laptop')).toBe('niet_haalbaar');
expect(extraNeededCents(ex4, 'laptop')).toBe(70000);
expect(project({ ...base, savingsCents: 0, goals: [emergency(150000), goal('reis', 100000)] }).fill).toEqual({ nood: null, reis: null });
expect(project({ ...base, savingsCents: 30000, goals: [emergency(10000, 10000), goal('a', 100000, { weight: 2 }), goal('b', 100000, { priority: 2 })] }).fill)
  .toEqual({ nood: 'full', a: 4, b: 6 });
// krap: fills in deadline month, misses with 10 % less
expect(goalStatus({ ...base, savingsCents: 40000, goals: [emergency(150000, 150000), goal('laptop', 120000, { deadline: { year: 2027, month: 1 } })] }, 'laptop')).toBe('krap');
expect(goalStatus(ex3, 'reis')).toBeNull();
// deposits this period are not counted twice
expect(project({ ...base, depositedThisPeriodCents: 20000, goals: [emergency(150000, 20000), goal('reis', 100000)] }).fill).toEqual({ nood: 2, reis: 4 });
// one-off income in december
expect(project({ ...base, oneOffs: [{ month: { year: 2026, month: 12 }, cents: 100000 }], goals: [emergency(150000), goal('reis', 100000)] }).fill).toEqual({ nood: 1, reis: 2 });
// horizon
expect(horizonFor([goal('hijra', 1, { deadline: { year: 2056, month: 11 } })], nov)).toBe(361);
expect(horizonFor([goal('x', 1, { deadline: { year: 2070, month: 1 } })], nov)).toBe(480);
// effect preview: adding a laptop pushes the trip from mrt to mei 2027
const before = project({ ...base, goals: [emergency(150000), goal('reis', 100000)] });
const after = project({ ...base, goals: [emergency(150000), goal('reis', 100000), goal('laptop', 120000, { priority: 2 })] });
expect(after.fill).toEqual({ nood: 2, reis: 6, laptop: 7 });
expect(compareProjections(before, after, nov)).toEqual([
  { goalId: 'reis', from: { year: 2027, month: 3 }, to: { year: 2027, month: 5 }, deltaMonths: 2 },
  { goalId: 'laptop', from: null, to: { year: 2027, month: 6 }, deltaMonths: null },
]);
```
- [ ] **Step 2: Run** `npx vitest run src/domain/projection.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `projection.ts`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): projection, goal status and effect preview`

### Task 6: Budget

**Files:**
- Create: `src/domain/budget.ts`, `src/domain/budget.test.ts`

**Interfaces:**
- Consumes: `toMonthlyCents` (Task 2), `currentPeriod` (Task 3), `OneOff` (Task 5).
- Produces:
```ts
export type Budget = { incomeCents: Cents; expensesCents: Cents; roomCents: Cents };
export function monthlyBudget(incomes: Income[], lines: BudgetLine[], mode: 'careful' | 'normal'): Budget; // careful uses amountLowCents for variable incomes
export function savingsPerMonth(plan: PlanSettings, roomCents: Cents): Cents; // plan.monthlySavingsCents ?? max(0, room)
export function suggestedSavings(incomeCents: Cents): Cents; // 20 %, rounded to nearest € 10
export function suggestedEmergencyTarget(expensesCents: Cents): Cents; // 3 × expenses, or 100000 when 0
export type BudgetWarning = { key: 'negative_budget' } | { key: 'over_target'; wantCents: Cents; roomCents: Cents };
export function budgetWarnings(plan: PlanSettings, budget: Budget): BudgetWarning[];
export function oneOffIncomes(incomes: Income[], fromPeriodStart: ISODate, startMonth: YearMonth, horizon: number): OneOff[]; // yearly in its month each year, once on its date, never before fromPeriodStart
```
- [ ] **Step 1: Write the failing tests:**
```ts
const variable = income({ amountCents: 120000, amountLowCents: 80000, variability: 'variable' });
const lines = [line('fixed', 70000)];
expect(monthlyBudget([variable], lines, 'careful')).toEqual({ incomeCents: 80000, expensesCents: 70000, roomCents: 10000 });
expect(monthlyBudget([variable], lines, 'normal').roomCents).toBe(50000);           // §5.9 row 9
expect(monthlyBudget([income({ amountCents: 10000, frequency: 'weekly' })], [], 'normal').incomeCents).toBe(43333);
expect(monthlyBudget([income({ amountCents: 300000, frequency: 'yearly', month: 12 })], [], 'normal').incomeCents).toBe(0);
expect(savingsPerMonth(plan({ monthlySavingsCents: null }), -5000)).toBe(0);
expect(savingsPerMonth(plan({ monthlySavingsCents: 60000 }), 50000)).toBe(60000);
expect(suggestedSavings(215000)).toBe(43000);
expect(suggestedSavings(123456)).toBe(25000);
expect(suggestedEmergencyTarget(165000)).toBe(495000);
expect(suggestedEmergencyTarget(0)).toBe(100000);
expect(budgetWarnings(plan({ monthlySavingsCents: null }), { incomeCents: 1, expensesCents: 2, roomCents: -1 })).toEqual([{ key: 'negative_budget' }]);
expect(budgetWarnings(plan({ monthlySavingsCents: 60000 }), { incomeCents: 0, expensesCents: 0, roomCents: 50000 })).toEqual([{ key: 'over_target', wantCents: 60000, roomCents: 50000 }]);
expect(oneOffIncomes([income({ amountCents: 200000, frequency: 'yearly', month: 12 }), income({ amountCents: 5000, frequency: 'once', date: '2026-08-01' })], '2026-11-01', nov, 14))
  .toEqual([{ month: { year: 2026, month: 12 }, cents: 200000 }, { month: { year: 2027, month: 12 }, cents: 200000 }]);
```
(`income`, `line`, `plan` builders go in `src/domain/test-helpers.ts`.)
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `budget.ts`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): monthly budget and suggestions`

### Task 7: Certainty and checklist rules

**Files:**
- Create: `src/domain/certainty.ts`, `src/domain/checklist-rules.ts`, `src/domain/checklist-rules.test.ts`

**Interfaces:**
- Produces (`certainty.ts`): `type Level = 1 | 2 | 3 | 4 | 5`; `type Certainty = { level: Level; reason: string }`; `CERTAINTY_LABEL: Record<Level, string>` = `{ 5: 'zeker', 4: 'vrij zeker', 3: 'laten nakijken', 2: 'schatting', 1: 'gok' }`; `derived(inputs: Level[], reason: string): Certainty` (min of inputs, capped at 4).
- Produces (`checklist-rules.ts`):
```ts
export type RuleGoal = { id: string; name: string; status: GoalStatus | null; extraNeededCents: Cents; targetIsEstimate: boolean };
export type RuleContext = { periodStart: ISODate; nextPayday: ISODate | null; depositDueCents: Cents; budget: Budget;
  warnings: BudgetWarning[]; goals: RuleGoal[]; incomes: Income[]; prefs: { firstJob?: boolean; noInterestSavings?: boolean } };
export type RuleItem = { key: string; title: string; urgency: 'week' | 'month' | 'later'; certainty: Certainty };
export function evaluateRules(ctx: RuleContext): RuleItem[]; // ordered week, month, later
```
Rule items are computed on every render and never stored while open. `checklist_items` stores a rule row only when the user ticks it (`done_at`) or dismisses it (`dismissed_at`); the UI hides rule items whose key has such a row. This is how spec §5.8 "titles computed at display" and "open items whose condition is false disappear" are met.

- [ ] **Step 1: Write the failing tests**, one per key in spec §5.8, with exact titles:
```ts
expect(keys(evaluateRules(ctx({ depositDueCents: 50000, nextPayday: '2026-10-29' })))).toContain('deposit:2026-09-29');
expect(title(evaluateRules(ctx({ depositDueCents: 50000, nextPayday: '2026-10-29' })), 'deposit:2026-09-29')).toBe('Zet € 500,00 opzij op 29 oktober');
expect(keys(evaluateRules(ctx({ depositDueCents: 0 })))).not.toContain('deposit:2026-09-29');
expect(title(evaluateRules(ctx({ warnings: [{ key: 'negative_budget' }] })), 'negative_budget')).toBe('Je geeft meer uit dan je verdient: kijk je vaste kosten na');
expect(title(evaluateRules(ctx({ warnings: [{ key: 'over_target', wantCents: 60000, roomCents: 50000 }] })), 'over_target')).toBe('Je wil € 600,00 sparen maar houdt € 500,00 over');
expect(keys(evaluateRules(ctx({})))).toContain('standing_order');
expect(title(evaluateRules(ctx({ goals: [{ id: 'g1', name: 'Laptop', status: 'niet_haalbaar', extraNeededCents: 70000, targetIsEstimate: false }] })), 'goal_unreachable:g1'))
  .toBe('Spaar € 700,00 meer per maand of verschuif de deadline van Laptop');
expect(rule(evaluateRules(ctx({ goals: [{ id: 'g2', name: 'Rijbewijs', status: null, extraNeededCents: 0, targetIsEstimate: true }] })), 'estimate:g2'))
  .toMatchObject({ title: 'Zoek de echte prijs van Rijbewijs op', urgency: 'later', certainty: { level: 2 } });
expect(rule(evaluateRules(ctx({ prefs: { firstJob: true } })), 'ziekenfonds')).toMatchObject({ urgency: 'month', certainty: { level: 3 } });
expect(keys(evaluateRules(ctx({ incomes: [income({ kind: 'student' })] })))).toContain('student_hours');
expect(keys(evaluateRules(ctx({ incomes: [income({ kind: 'side' })] })))).toContain('side_income_tax');
expect(keys(evaluateRules(ctx({ prefs: { noInterestSavings: true } })))).toContain('no_interest');
expect(rule(evaluateRules(ctx({ depositDueCents: 50000, nextPayday: '2026-10-29' })), 'deposit:2026-09-29').certainty.level).toBe(4);
expect(derived([5, 2], 'x')).toEqual({ level: 2, reason: 'x' });
expect(derived([5, 5], 'x').level).toBe(4);
```
Date in titles: `29 oktober` (day + full month name, never a year). The test context builder `ctx(overrides)` defaults to `periodStart: '2026-09-29'`, `nextPayday: null`, `depositDueCents: 0`, empty lists and prefs.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** both files. Titles exactly as in spec §5.8 with `formatEUR`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(domain): certainty levels and checklist rules`

### Task 8: Dashboard assembly and persona fixtures

**Files:**
- Create: `src/domain/dashboard.ts`, `src/domain/dashboard.test.ts`, `src/domain/fixtures/personas.ts`

**Interfaces:**
- Consumes: everything from Tasks 2 to 7.
- Produces:
```ts
export type UserData = { profile: { displayName: string; timeZone: string; prefs: { firstJob?: boolean; noInterestSavings?: boolean } };
  plan: PlanSettings; incomes: Income[]; lines: BudgetLine[]; goals: Goal[];
  depositsThisPeriod: Record<string, Cents> /* per goal, filled by the loader for the current period */;
  closedRuleKeys: string[] };
export type GoalView = Goal & { isFull: boolean; fill: YearMonth | 'full' | null; status: GoalStatus | null; extraNeededCents: Cents; allocatedCents: Cents };
export type Dashboard = { today: ISODate; period: Period; nextPayday: ISODate | null; daysToPayday: number | null; progress: number;
  budget: Budget; savingsCents: Cents; warnings: BudgetWarning[]; goals: GoalView[]; mainGoal: GoalView | null;
  mainGoalWaitsFor: { goalName: string; fill: YearMonth | null } | null; depositPrefill: Record<string, Cents>;
  rules: RuleItem[] /* minus closedRuleKeys */ ; projectionInput: ProjectionInput };
export function buildDashboard(data: UserData, today: ISODate): Dashboard;
```
`mainGoal` = goal with `isMain`, else the emergency goal. `mainGoalWaitsFor` is set when the main goal gets 0 this period and the emergency fund is not full. `depositPrefill[g] = max(0, allocatedCents[g] - depositsThisPeriod[g])`.
- Produces (`personas.ts`): `zayd`, `haider`, `student`, `gezin`, `tiener`, `freelancer`: `UserData`, built from spec §3 (Zayd: net € 2.200, mama € 1.000 and own € 200 as budget lines, goals Noodfonds 3.600, Reis 3.000, Huwelijk 6.500, Hijra 16.700 deadline okt 2029, Hajj; Haider: net € 2.150 day 29, an estimated emergency fund (€ 1.000) and one trip goal, no budget lines; student: weekly € 120 variable low € 60, stage via no goal, trip € 600; gezin: two salaries, loan, studies goal; tiener: weekly allowance € 15, rijbewijs € 1.500 estimate; freelancer: salary + side income, tax pot).

- [ ] **Step 1: Write the failing tests:**
```ts
const today = '2026-10-20';
const h = buildDashboard(haider, today);
expect(h.nextPayday).toBe('2026-10-29');
expect(h.daysToPayday).toBe(9);
expect(h.savingsCents).toBe(43000);               // suggestedSavings applied as estimate when no budget lines and no plan amount
expect(Object.values(h.depositPrefill).reduce((a, b) => a + b, 0)).toBe(43000);
expect(buildDashboard(student, today).nextPayday).toBeNull();
expect(buildDashboard(tiener, today).nextPayday).toBeNull();
expect(horizonFor(zayd.goals, buildDashboard(zayd, today).period.month)).toBeGreaterThan(120);
expect(buildDashboard(freelancer, today).rules.map(r => r.key)).toContain('side_income_tax');
expect(buildDashboard(gezin, today).goals.length).toBeGreaterThan(0);
const empty = buildDashboard({ ...haider, incomes: [], lines: [], goals: [emergency(100000)] }, today);
expect(empty.nextPayday).toBeNull();
expect(empty.savingsCents).toBe(0);
expect(empty.mainGoal?.kind).toBe('emergency');
expect(buildDashboard({ ...haider, closedRuleKeys: ['standing_order'] }, today).rules.map(r => r.key)).not.toContain('standing_order');
```
Note for Haider: when `plan.monthlySavingsCents` is null and there are no budget lines, `buildDashboard` uses `suggestedSavings(incomeCents)` (spec §5.1 standard proposal) and the onboarding persists it (Task 15).
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** `buildDashboard` and the fixtures.
- [ ] **Step 4: Run** `npm test`. Expected: all domain tests PASS.
- [ ] **Step 5: Commit** `feat(domain): dashboard assembly and persona fixtures`. Open PR `M1 fundament`, merge when CI is green.

---

## Milestone 2: Database en login (branch `m2-db-auth`)

### Task 9: Supabase schema, RLS and pgTAP tests

**Files:**
- Create: `supabase/config.toml` (via `npx supabase init`), `supabase/migrations/20261021000001_init.sql`, `supabase/tests/schema.test.sql`, `supabase/tests/rls.test.sql`, `src/data/database.types.ts`
- Modify: `package.json` (dev dep `supabase` pinned; scripts `db:start`, `db:test` = `supabase test db`, `db:types` = `supabase gen types typescript --local > src/data/database.types.ts`), `.github/workflows/ci.yml`

**Interfaces:**
- Produces: tables exactly as spec §6 plus `transactions.client_ref uuid not null` with `unique (user_id, client_ref)` (Review Focus 2); view `goal_balances(goal_id, user_id, balance_cents)`; function `private.handle_new_user()` + trigger on `auth.users`; generated `Database` type.

- [ ] **Step 1:** `config.toml`: `[auth] enable_signup = false`, `minimum_password_length = 10`, `[auth.email] enable_confirmations = false`, `site_url = "http://127.0.0.1:3000"`.
- [ ] **Step 2: Write the failing pgTAP tests.** Helpers inside the test files: insert two users into `auth.users` (`a@u.zaydmaadal.site`, `b@u.zaydmaadal.site`), switch with `set local role authenticated; set local request.jwt.claims = '{"sub":"<id>","role":"authenticated"}'`. Assertions:
  - `schema.test.sql`: `has_table` for all 10 tables; RLS enabled on each (`select relrowsecurity`); the trigger creates `profiles.username = 'a'` and a `plans` row; inserting a second `emergency` goal for one user throws `23505`; `transactions.amount_cents = 100000000001` throws `23514`; `push_subscriptions.endpoint = 'http://example.com/x'` throws `23514`, `'https://fcm.googleapis.com/fcm/send/abc'` succeeds; duplicate `(user_id, client_ref)` throws `23505`; as `service_role`, `select count(*) from push_subscriptions` succeeds.
  - `rls.test.sql`: as A, `select count(*) from goals where user_id = B` is 0; A inserting a transaction with B's `goal_id` throws `23503`; A `update profiles set username = 'x'` throws `42501`; A cannot `select` from `admin_audit` (`42501`); A sees own row in `goal_balances`, not B's.
- [ ] **Step 3: Run** `npx supabase start && npx supabase test db`. Expected: FAIL (tables missing).
- [ ] **Step 4: Write the migration** following spec §6 and the Global Constraints: enums as `text` + CHECK; amount, text-length and `pg_column_size(prefs) < 8192` checks; partial unique indexes `goals (user_id) where kind = 'emergency'` and `goals (user_id) where is_main`; `unique (id, user_id)` on goals and FK `transactions (goal_id, user_id) references goals (id, user_id) on delete cascade`; endpoint check regex `^https://(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com)/`; column grants on `profiles` excluding `username`; `private.handle_new_user()` `security definer set search_path = ''`; view with `security_invoker = true`.
- [ ] **Step 5: Run** `npx supabase db reset && npx supabase test db`. Expected: all PASS. Run `npm run db:types`.
- [ ] **Step 6:** Extend `ci.yml` with job `db` (ubuntu, Docker available): `npx supabase start`, `npx supabase test db`, `npm run db:types` then `git diff --exit-code src/data/database.types.ts`.
- [ ] **Step 7: Commit** `feat(db): phase 1 schema with RLS and pgTAP tests`

### Task 10: Env, Supabase clients and proxy

**Files:**
- Create: `src/lib/env.ts`, `src/lib/env.test.ts`, `src/data/supabase/browser.ts`, `src/data/supabase/server.ts`, `src/data/supabase/admin.ts`, `src/proxy.ts`, `src/lib/paths.ts`, `src/lib/paths.test.ts`
- Dependencies: `@supabase/ssr`, `@supabase/supabase-js`

**Interfaces:**
- Produces:
```ts
// env.ts
export const publicEnv: { supabaseUrl: string; supabasePublishableKey: string; authEmailDomain: string; vapidPublicKey: string };
export function signupConfig(): { mode: 'open' | 'invite' | 'closed'; inviteCode: string | null }; // missing → 'closed'; invite without code throws
export function serverEnv(): { supabaseSecretKey: string; vapidPrivateKey: string; vapidSubject: string; cronSecret: string; adminUserIds: string[] }; // lazy, cached, throws on first use if invalid; cronSecret ≥ 32 chars
// paths.ts
export function isPublicPath(pathname: string): boolean;
// supabase/browser.ts
export function createBrowserSupabase(): SupabaseClient<Database>;
// supabase/server.ts  (import 'server-only')
export async function createServerSupabase(): Promise<SupabaseClient<Database>>;
export async function requireUserId(): Promise<string>; // getClaims; redirect('/inloggen') when absent
// supabase/admin.ts  (import 'server-only')
export function createAdminSupabase(): SupabaseClient<Database>; // secret key, no session persistence
```
- [ ] **Step 1: Write the failing tests:** `signupConfig()` returns `closed` when `SIGNUP_MODE` is unset, `{ mode: 'invite', inviteCode: 'abc' }` when set, throws for `invite` without `INVITE_CODE`; `serverEnv()` throws when `CRON_SECRET` has 31 chars parses `ADMIN_USER_IDS='u1, u2'` to `['u1','u2']` and an empty value to `[]`; `isPublicPath` is true for `/inloggen`, `/registreren`, `/privacy`, `/api/cron/loondag`, `/manifest.webmanifest`, `/icons/icon-192.png`, `/_next/static/x.js`, and false for `/`, `/overzicht`, `/beheer`, `/api/other`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** `proxy.ts` (export `proxy` and `config.matcher` excluding static assets): create the server client per the official `@supabase/ssr` Next.js guide, call `supabase.auth.getClaims()`; when no claims and `!isPublicPath` redirect to `/inloggen`; when `claims.app_metadata.must_change_password` and path is not `/wachtwoord-wijzigen` redirect there; set headers per spec §12: nonce CSP (`default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; connect-src 'self' <supabaseUrl>; frame-ancestors 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; worker-src 'self'`), `Strict-Transport-Security: max-age=63072000; includeSubDomains`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`.
- [ ] **Step 4: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: env validation, Supabase clients and proxy`

### Task 11: Register, log in, change password, log out

**Files:**
- Create: `src/data/schemas.ts` (start: `ActionResult`, `usernameSchema`, `passwordSchema`), `src/data/schemas.test.ts`, `src/data/actions/auth.ts`, `src/data/actions/auth.test.ts`, `src/app/(publiek)/layout.tsx`, `src/app/(publiek)/inloggen/page.tsx`, `src/app/(publiek)/registreren/page.tsx`, `src/app/(app)/wachtwoord-wijzigen/page.tsx`, `src/app/page.tsx`, `src/lib/auth-email.ts`, `e2e/auth.spec.ts`

**Interfaces:**
- Consumes: Task 10 clients and `signupConfig`.
- Produces: `usernameToEmail(username: string): string` (lowercase + `@` + domain); `registerAction(input: { username: string; password: string; inviteCode?: string }): Promise<ActionResult>`; `changePasswordAction(input: { password: string }): Promise<ActionResult>` (updates password, clears `app_metadata.must_change_password` with the admin client, refreshes the session); `logoutAction(): Promise<void>` (Task 19 adds push cleanup before sign-out). Log in happens in the browser: `createBrowserSupabase().auth.signInWithPassword({ email: usernameToEmail(u), password })`.

- [ ] **Step 1: Write the failing tests:**
  - `usernameSchema` accepts `haider`, `zayd.m`, `a_1`; rejects `ab`, `.zayd`, `zayd.`, `za..yd`, `Zé`, 21 chars; lowercases `Haider` to `haider`. `passwordSchema` rejects 9 chars.
  - `registerAction` with the admin client mocked (`vi.mock('@/data/supabase/admin')`): `SIGNUP_MODE=closed` → `{ ok: false, error: 'Registreren is nu gesloten.' }`; `invite` with wrong code → `error: 'Deze uitnodigingscode klopt niet.'`; when the profiles count created in the last hour is 5 → `error: 'Er zijn net veel accounts aangemaakt. Probeer het over een uur opnieuw.'`; happy path calls `auth.admin.createUser` with `{ email: 'haider@u.zaydmaadal.site', password, email_confirm: true }`; duplicate username (createUser error `email_exists`) → `fieldErrors.username: 'Deze gebruikersnaam is al in gebruik.'`.
  - `e2e/auth.spec.ts`: register `haider-<random>` → lands on `/onboarding/1`; log out; log in → lands on `/onboarding/1`; with server started with `SIGNUP_MODE=closed` the register page shows "Registreren is nu gesloten." (separate project config using env override).
- [ ] **Step 2: Run** `npx vitest run src/data`. Expected: FAIL.
- [ ] **Step 3: Implement** actions and pages (plain forms with `useActionState`; labels visible; errors next to fields). `src/app/page.tsx` redirects to `/overzicht` when logged in, else `/inloggen`. `(app)` routes redirect to `/onboarding/<step>` while `onboarding_completed_at` is null (in `(app)/layout.tsx`, Task 13 creates the layout file; here add the check to the page-level helper `requireOnboarded()` in `src/data/supabase/server.ts`).
- [ ] **Step 4: Run** `npm test` and, with local Supabase and `.env.local` from `npx supabase status -o env`, `npm run build && npx playwright test e2e/auth.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: username registration, login and password change`

### Task 12: Admin password reset

**Files:**
- Create: `src/data/actions/admin.ts`, `src/data/actions/admin.test.ts`, `src/app/beheer/page.tsx`

**Interfaces:**
- Produces: `requireAdmin(): Promise<string>` (user id in `serverEnv().adminUserIds`, else `notFound()`); `resetPasswordAction(input: { username: string }): Promise<ActionResult<{ tempPassword: string }>>` (random 16-char password from `crypto.randomBytes`, `auth.admin.updateUserById(id, { password, app_metadata: { must_change_password: true } })`, insert `admin_audit { admin_id, target_user_id, action: 'password_reset' }`).

- [ ] **Step 1: Write the failing tests:** non-admin → `notFound` called and no admin API call; unknown username → `error: 'Geen gebruiker met die naam.'`; admin happy path → returns a 16-char `tempPassword`, calls `updateUserById` with `app_metadata.must_change_password = true`, inserts one `admin_audit` row.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** action and page (one form: username → shows the temporary password once with the text "Geef dit wachtwoord persoonlijk door. Bij het inloggen moet de gebruiker het meteen wijzigen.").
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: admin password reset`. Open PR `M2 database en login`, merge when CI is green.

---

## Milestone 3: Schermen (branch `m3-schermen`)

### Task 13: Design tokens, skills, layout and base components

**Files:**
- Create: `DESIGN.md`, `src/styles/contrast.test.ts`, `src/components/ui/*` (shadcn: sheet, dialog, slider, checkbox, button, input, label; `sonner`), `src/components/money.tsx`, `src/components/certainty-meter.tsx`, `src/components/progress-bar.tsx`, `src/components/stacked-bar.tsx`, `src/components/bottom-nav.tsx`, `src/app/(app)/layout.tsx`, `.claude/skills/{motion-design,web-design-guidelines,impeccable-rules,taste-app-screens}/SKILL.md`
- Modify: `src/app/globals.css`, `src/app/layout.tsx` (fonts, `lang="nl"`, viewport without `maximum-scale`, Sonner `Toaster`)

**Interfaces:**
- Produces: CSS tokens `--color-ground, --color-surface, --color-tint, --color-tint-accent, --color-hairline, --color-ink, --color-ink-2, --color-muted, --color-accent, --color-accent-ink, --color-on-accent, --color-pot-1..4, --color-seg-fixed, --color-seg-living, --color-seg-savings, --color-seg-free, --color-warn-bg, --color-warn-ink, --color-error, --radius-strip (20px), --radius-card (24px), --radius-hero (28px), --font-display (Gabarito), --font-body (Figtree), --ease-standard, --duration-1..3`. Components: `<Money cents={n} className? />` (uses `formatEUR`, `tabular-nums`, `white-space: nowrap`), `<CertaintyMeter level={1..5} reason={string} />` (5 segments + `CERTAINTY_LABEL` text + reason, `role="img"` with `aria-label="Zekerheid N van 5: label"`), `<ProgressBar value={0..1} label={string} color? />`, `<StackedBar segments={{ label, cents, color }[]} />`, `<BottomNav active={'overzicht'|'doelen'|'plan'|'meer'} />` (middle button "Storten" → `/storten`).

- [ ] **Step 1:** Light tokens from the Oceaan mockup: ground `#EDF1F7`, surface `#FFFFFF`, tint `#E2E8F1`, tint-accent `#DAE3F8`, hairline `#DCE3ED`, ink `#0F1A2E`, ink-2 `#4A586E`, accent `#2E46B8`, accent-ink `#1F3392`, on-accent `#FFFFFF`, pot-1 `#16244F`, pot-2 accent, pot-3 `#C95A38`, pot-4 `#7D93B6`, seg-fixed `#16244F`, seg-living `#7D93B6`, seg-savings accent, seg-free `#F3BBA4`, warn-bg `#FEEDC9`, warn-ink `#81520A`, error `#C4242A`. Dark (`prefers-color-scheme: dark` and `[data-theme=dark]`): ground `#0f0f10`, surface `#161618`, tint `#222225`, hairline `#2e2e33`, ink `#ededee`, ink-2 `#b4b4b4`, muted `#9a9a9a`, accent `#8EA2FF`, on-accent `#0f0f10` (adjust only if the contrast test fails).
- [ ] **Step 2: Write the failing test** `contrast.test.ts`: parse `globals.css`, and for light and dark assert WCAG contrast ≥ 4.5 for pairs ink/ground, ink/surface, ink-2/ground, ink-2/surface, ink-2/tint, muted/surface (dark), muted/tint (dark), on-accent/accent, accent/surface, warn-ink/warn-bg, error/surface.
- [ ] **Step 3: Run** `npx vitest run src/styles`. Expected: FAIL until tokens exist; then implement tokens and run again. Expected: PASS.
- [ ] **Step 4:** `npx shadcn@latest init` (base: Radix, style new-york) and add the listed components and `sonner`. Fonts via `next/font/google` (`Gabarito` 600/700, `Figtree` 400/600) bound to the font tokens.
- [ ] **Step 5:** Vendor skills: clone at the reviewed commits (`Leonxlnx/taste-skill@6010f91`, `pbakaus/impeccable@dad8dbb`, `vercel-labs/agent-skills@063bee9`, `lottiefiles/motion-design-skill@f9a8a04`) into a scratch dir with `--depth 1` and hooks disabled; copy only Markdown text. `motion-design`: remove the rule "Always three motion layers: primary + secondary + ambient". `web-design-guidelines`: fetch the rules file its SKILL.md points to once, save as `rules.md`, change SKILL.md to read the local file. `impeccable-rules`: the craft and anti-pattern rules only, no hooks or scripts. `taste-app-screens`: the app-screens reference only. Grep the copies for `npx`, `curl`, `http`; none may instruct running anything.
- [ ] **Step 6:** `DESIGN.md`: the token table, spec §10.2 rules as do/don't, the amount format, and "palette swap = edit `globals.css` tokens only".
- [ ] **Step 7:** Components and `(app)/layout.tsx` (content padding-bottom for the nav, `requireOnboarded()`).
- [ ] **Step 8: Run** `npm test && npm run build`. Expected: PASS.
- [ ] **Step 9: Commit** `feat(ui): design tokens, base components and vendored design skills`

### Task 14: Data loading, mappers and entity actions

**Files:**
- Create: `src/data/mappers.ts`, `src/data/mappers.test.ts`, `src/data/load.ts`, `src/data/actions/{profile,plan,incomes,budget,goals,transactions,checklist}.ts`, `src/data/actions/goals.test.ts`, `src/data/actions/transactions.test.ts`
- Modify: `src/data/schemas.ts`

**Interfaces:**
- Consumes: `UserData` (Task 8), `Database` (Task 9), clients (Task 10).
- Produces:
```ts
// mappers.ts: row → domain
export function toIncome(row: Tables<'income_sources'>): Income;
export function toBudgetLine(row: Tables<'budget_lines'>): BudgetLine;
export function toGoal(row: Tables<'goals'>, balanceCents: Cents): Goal; // deadline 'YYYY-MM-DD' → YearMonth
export function toPlan(row: Tables<'plans'>): PlanSettings;
// load.ts
export async function loadUserData(today: ISODate): Promise<UserData>; // one parallel fetch, RLS-scoped; depositsThisPeriod per goal for currentPeriod
// schemas.ts additions (Zod, amounts as strings parsed with parseEuroInput)
export const moneySchema; export const incomeSchema; export const budgetLineSchema; export const goalSchema;
export const transactionSchema; // { goalId, amount, direction: 'in'|'out', occurredOn, note?, clientRef: uuid }
// actions (all return ActionResult and revalidatePath('/', 'layout'))
saveIncomeAction, deleteIncomeAction, saveBudgetLineAction, deleteBudgetLineAction, savePlanAction,
saveProfileAction, saveGoalAction, reorderGoalsAction(ids: string[]), setMainGoalAction(id), archiveGoalAction(id), unarchiveGoalAction(id),
addTransactionsAction(items: TransactionInput[]) /* one insert, client_ref conflict = success */,
closeRuleItemAction(key: string, how: 'done'|'dismissed'), addChecklistItemAction(title), toggleChecklistItemAction(id)
```
- [ ] **Step 1: Write the failing tests:**
  - `toGoal({ deadline: '2027-01-01', … }, 5000)` → `deadline: { year: 2027, month: 1 }, balanceCents: 5000`.
  - `addTransactionsAction` with a mocked server client: withdrawal of € 60 on a pot with balance € 50 → `{ ok: false, error: 'Je kan niet meer opnemen dan er in de pot zit.' }`; a `23505` on `client_ref` → `{ ok: true }`.
  - `archiveGoalAction`: emergency goal → `error: 'Je noodfonds kan je niet archiveren.'`; goal with balance > 0 → `error: 'Haal eerst het geld uit deze pot of verplaats het.'`.
  - `goalSchema`: `target: '0'` rejected; `name` of 81 chars rejected; `weight: 0` rejected.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Every action calls `requireUserId()` first and never takes `user_id` from input.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(data): loaders, mappers and entity actions`

### Task 15: Onboarding

**Files:**
- Create: `src/app/onboarding/[stap]/page.tsx`, `src/components/onboarding/step-{1..8}.tsx`, `src/components/onboarding/progress.tsx`, `src/components/install-guide.tsx`, `src/data/actions/onboarding.ts`, `src/data/actions/onboarding.test.ts`, `e2e/onboarding.spec.ts`

**Interfaces:**
- Consumes: Task 14 actions; `suggestedSavings`, `suggestedEmergencyTarget`, `monthlyBudget` (Task 6).
- Produces: `setOnboardingStepAction(step: 1..8): Promise<ActionResult>`; `completeOnboardingAction(input: { emergencyTargetCents: Cents | null; startBalanceCents: Cents; emergencySharePct: 50 | 100 }): Promise<ActionResult>` (creates the emergency goal with `target = input ?? suggestedEmergencyTarget(expenses)` (`target_is_estimate` when not given), books a `source: 'start'` transaction capped at the target, sets `plans.emergency_share_pct`, sets `onboarding_completed_at`, persists `suggestedSavings` into `plans.monthly_savings_cents` as estimate when the user left step 5 untouched and entered no budget lines). Step components are reused by Meer (Task 18) via a `mode: 'onboarding' | 'edit'` prop.

Content per step: spec §8.2. Goal cards in step 7 with default estimates: Reis € 1.500, Rijbewijs € 1.500, Laptop € 1.000, Auto € 8.000, Huwelijk € 10.000, Hajj € 7.000, Iets anders (no default, amount required). "Stage vinden" creates a user checklist item. The first goal added gets `is_main`. When any goal has a deadline, ask "Noodfonds eerst helemaal vullen, of tegelijk met je doelen?" with "Eerst noodfonds" (100) / "Tegelijk" (50). Step 7 ends with a timeline preview using `project` + `formatMonthNl`. Step 8 has the `context_note` textarea (max 2.000) and `InstallGuide` (iOS: Deel-knop → "Zet op beginscherm"; Android: menu → "App installeren"; the line "Je logt één keer opnieuw in in de geïnstalleerde app.").

- [ ] **Step 1: Write the failing tests:**
  - `completeOnboardingAction` (mocked client): expenses € 1.650 and no target → emergency target 495000 with `target_is_estimate = true`; start balance € 6.000 with target € 4.950 → transaction 495000; skipped everything → target 100000.
  - `e2e/onboarding.spec.ts` "Haider": register, step 2 net `2150` day 29, skip 3 and 4, step 5 keep the proposed amount, skip 6, step 7 add "Reis" with `2500` and deadline next july, choose "Tegelijk", step 8 finish → `/overzicht` shows "Hoi Haider" and the payday strip with "Volgende loondag" (the server uses the real date, so do not assert a fixed date).
  - e2e "skip everything" (Review Focus 4): register, press "Overslaan" on every step → `/overzicht` renders, no payday strip, emergency fund card shows `€ 1.000,00` and the label "schatting".
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** steps and actions. Each step saves on "Volgende" and stores `onboarding_step`; reloading returns to the saved step.
- [ ] **Step 4: Run** `npm test` and `npx playwright test e2e/onboarding.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: onboarding in 8 steps`

### Task 16: Overview

**Files:**
- Create: `src/app/(app)/overzicht/page.tsx`, `src/components/overview/{payday-strip,main-goal-card,salary-split,pots-list,simulator,next-steps}.tsx`, `src/components/overview/simulate.ts`, `src/components/overview/simulate.test.ts`, `e2e/overview.spec.ts`

**Interfaces:**
- Consumes: `loadUserData`, `buildDashboard` (Tasks 14, 8), components (Task 13), `project`, `savingsPerMonth`, `monthlyBudget` (Tasks 5, 6), `savePlanAction` (Task 14).
- Produces: `simulate(base: UserData, today: ISODate, input: { savingsCents: Cents | null; extraIncomeCents: Cents; extraExpensesCents: Cents; incomeMode: 'careful'|'normal' }): { savingsCents: Cents; fills: Record<string, YearMonth | 'full' | null> }` in `src/components/overview/simulate.ts` (pure, imports only `@/domain`), tested in `src/components/overview/simulate.test.ts`. Slider ranges: savings € 0 to max(€ 2.000, 2 × current), step € 25; extra income € 0 to € 1.000, step € 50; extra expenses € 0 to € 1.000, step € 50. "Zo instellen" calls `savePlanAction({ monthlySavingsCents, incomeMode })` only.

Sections and order: spec §8.3. Main goal card shows `mainGoalWaitsFor` as "Krijgt nu nog niets: eerst je noodfonds, vol rond maart 2027". Pots show `fill` via `formatMonthNl` ("vol rond mei 2027", "vol", "niet binnen 40 jaar" when `null`). Salary split table has a total row "Netto per maand". Next steps = first 3 of `rules` + open user items.

- [ ] **Step 1: Write the failing tests:** `simulate(haider, '2026-10-20', { savingsCents: 50000, extraIncomeCents: 0, extraExpensesCents: 0, incomeMode: 'normal' }).savingsCents` is 50000; with `savingsCents: null` and `extraExpensesCents: 10000` savings equal the room minus 10000; e2e: on the overview, moving the savings slider to the right changes the trip's "klaar" month to an earlier or equal month and "Zo instellen" shows the toast "Je plan is aangepast." 
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** unit and e2e. Expected: PASS.
- [ ] **Step 5: Commit** `feat: overview with simulator`

### Task 17: Goals and deposits

**Files:**
- Create: `src/app/(app)/doelen/page.tsx`, `src/app/(app)/doelen/[id]/page.tsx`, `src/app/(app)/doelen/nieuw/page.tsx`, `src/app/(app)/storten/page.tsx`, `src/components/goals/{goal-card,goal-form,effect-preview,history}.tsx`, `src/components/deposit/deposit-form.tsx`, `e2e/goals.spec.ts`

**Interfaces:**
- Consumes: Task 14 actions, `compareProjections`, `goalStatus`, `extraNeededCents` (Task 5), `depositPrefill` (Task 8).
- Produces: `<EffectPreview before={ProjectionInput} after={ProjectionInput} />` rendering each `Shift` as "<naam> schuift <n> maanden op, van <maand> naar <maand>" (or "komt <n> maanden vroeger"), and for a new goal "Klaar rond <maand>".

Archive shows a Sonner toast "Pot gearchiveerd" with action "Ongedaan maken" (8 s) calling `unarchiveGoalAction`. The emergency fund has no archive button. Deposit form generates one `clientRef` per submit (`crypto.randomUUID()`), disables the button while pending, and prefills from `depositPrefill`.

- [ ] **Step 1: Write the failing e2e tests** (`e2e/goals.spec.ts`, logged-in Haider fixture via registration helper):
  - create "Laptop" `1200` without deadline → preview shows "Reis schuift" and a month; after saving, the goals list shows Laptop with "vol rond".
  - create a goal with a deadline in the past (Review Focus 5) → preview and detail show "niet haalbaar" and "Spaar € … meer per maand".
  - `/storten`: prefilled amounts sum to the plan amount; double-click "Opslaan" (Review Focus 2) → history shows each deposit once.
  - withdrawal larger than balance → error "Je kan niet meer opnemen dan er in de pot zit."
  - archive then "Ongedaan maken" → goal is back.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx playwright test e2e/goals.spec.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: goals with effect preview and deposits`

### Task 18: Plan, Meer, privacy, export and account deletion

**Files:**
- Create: `src/app/(app)/plan/page.tsx`, `src/app/(app)/meer/page.tsx`, `src/app/(app)/meer/{profiel,inkomen,uitgaven,plan,context}/page.tsx`, `src/app/(publiek)/privacy/page.tsx`, `src/data/actions/account.ts`, `src/data/actions/account.test.ts`, `src/app/api/export/route.ts`, `e2e/account.spec.ts`, `e2e/a11y.spec.ts`

**Interfaces:**
- Consumes: onboarding step components in `edit` mode (Task 15), Task 14 actions.
- Produces: `deleteAccountAction(input: { password: string }): Promise<ActionResult>` (verifies the password with a non-persisting client `signInWithPassword`, then `auth.admin.deleteUser`, then signs out); `GET /api/export` returns `application/json` attachment `spaarplanner-export.json` with the user's rows from the 8 tables in spec §7.

Plan page: timeline (goals ordered by fill, `formatMonthNl`) and checklist grouped "Deze week", "Deze maand", "Later" with tick and dismiss (rule items via `closeRuleItemAction`, user items via `toggleChecklistItemAction`) and "Eigen stap toevoegen". Meer: links per spec §8.7, theme switch storing `prefs.theme` and setting `data-theme` on `<html>`. Privacy page content per spec §12 (responsible person Zayd Maadal, data list, processors Supabase (Frankfurt), Vercel, GitHub, push services of Google, Apple and Mozilla, backups 90 days, how to download and delete).

- [ ] **Step 1: Write the failing tests:** `deleteAccountAction` with a wrong password → `error: 'Dit wachtwoord klopt niet.'` and no `deleteUser` call; e2e: export downloads JSON containing the user's goal names; delete account with the right password → redirected to `/inloggen` and logging in again fails; `/privacy` loads without a session; `e2e/a11y.spec.ts` runs axe on `/inloggen`, `/registreren`, `/privacy`, `/onboarding/2`, `/overzicht`, `/doelen`, `/storten`, `/plan`, `/meer` and expects no `serious` or `critical` violations.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test && npx playwright test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: plan, settings, privacy, export and account deletion`. Open PR `M3 schermen`, merge when CI is green.

---

## Milestone 4: Push en livegang (branch `m4-push-live`)

### Task 19: PWA install and push subscription

**Files:**
- Create: `src/app/manifest.ts`, `public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png`, `src/lib/service-worker.js`, `src/lib/push-client.ts`, `src/data/actions/push.ts`, `src/data/actions/push.test.ts`, `src/components/push-card.tsx`
- Modify: `src/data/actions/auth.ts` (`logoutAction`), overview page (insert `PushCard` after the payday strip), `src/app/(app)/meer/page.tsx` (meldingen toggle)
- Dependency: `web-push`

**Interfaces:**
- Produces: `pushSubscriptionSchema` (endpoint `https` and host in the allow-list of spec §6; `keys.p256dh`, `keys.auth` non-empty); `savePushSubscriptionAction(sub: PushSubscriptionJSON): Promise<ActionResult>` (admin client deletes any row with that endpoint, then the user client inserts); `removePushSubscriptionAction(endpoint: string): Promise<ActionResult>`; client `subscribeToPush(): Promise<'ok'|'denied'|'unsupported'>` (must be called inside a click handler), `unsubscribeFromPush(): Promise<void>`; `<PushCard />` visible when `matchMedia('(display-mode: standalone)').matches && Notification.permission === 'default'` and no subscription on this device.

Manifest: `name: 'Spaarplanner'`, `short_name: 'Spaarplanner'`, `start_url: '/overzicht'`, `display: 'standalone'`, colors from tokens, the four icons. Service worker per the Next.js 16.4 PWA guide (registered with `new URL('../lib/service-worker.js', import.meta.url)`, `scope: '/'`): `push` shows title and body from the payload; `notificationclick` focuses or opens `/storten`. `logoutAction` calls `unsubscribeFromPush()` client-side before submitting, and the server removes the row.

- [ ] **Step 1: Write the failing tests:** schema rejects `http://fcm.googleapis.com/x`, `https://evil.example/x`, accepts `https://fcm.googleapis.com/fcm/send/abc` and `https://web.push.apple.com/abc`; `savePushSubscriptionAction` deletes an existing row with the same endpoint via the admin client before inserting; e2e (`e2e/public.spec.ts`): `GET /manifest.webmanifest` without a session returns 200 JSON with `display: 'standalone'`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: PWA manifest, service worker and push subscription`

### Task 20: Payday cron

**Files:**
- Create: `src/lib/push.ts`, `src/data/cron/payday.ts`, `src/data/cron/payday.test.ts`, `src/app/api/cron/loondag/route.ts`, `vercel.json`

**Interfaces:**
- Consumes: `primaryPaydayRule`, `paydayInMonth`, `todayInTimeZone`, `addDays`, `toYearMonth` (Task 3), `toIncome` (Task 14).
- Produces:
```ts
// push.ts (server-only)
export async function sendPush(sub: { endpoint: string; p256dh: string; auth: string }, payload: { title: string; body: string; url: string }): Promise<'ok' | 'gone' | 'error'>; // web-push with timeout 10 s; 404/410 → 'gone'
// cron/payday.ts
export type CronDeps = { db: SupabaseClient<Database>; send: typeof sendPush };
export async function runPaydayCron(now: Date, deps: CronDeps): Promise<{ users: number; claimed: number; sent: number; removed: number }>;
```
Algorithm: run `select 1` style keep-alive query (`select count(*) from profiles`); load all profiles with active incomes and push subscriptions; per user in `try/catch`: `today = todayInTimeZone(profile.timezone, now)`; `rule = primaryPaydayRule(incomes)`; due when `paydayInMonth(rule, toYearMonth(today)) === today`, or `=== addDays(today, -1)` (catch-up); claim with `insert into notification_log (user_id, kind, for_date) values (…, 'payday', <payday>) on conflict do nothing returning id`; only when a row returns, send `{ title: 'Loondag!', body: 'Vul in wat je opzijzette.', url: '/storten' }` to each subscription; `gone` → delete row; `error` → `failure_count + 1`, delete at 5. Route `GET`: compare `Authorization: Bearer <CRON_SECRET>` with `timingSafeEqual` (lengths checked first), else 401; call `runPaydayCron(new Date(), { db: createAdminSupabase(), send: sendPush })`; return the counts as JSON.

`vercel.json`: `{ "regions": ["fra1"], "crons": [{ "path": "/api/cron/loondag", "schedule": "0 6 * * *" }], "buildCommand": "bash scripts/vercel-build.sh" }` (script added in Task 21).

- [ ] **Step 1: Write the failing tests** (`payday.test.ts`, in-memory fake `db` and `send`):
  - user with day-29 rule at `now = 2026-10-29T06:00:00Z` → `claimed 1, sent 1`; running again the same day → `claimed 0, sent 1` total unchanged (no second send).
  - `now = 2026-10-30T06:00:00Z` with no log row for 2026-10-29 → catch-up sends once.
  - user in `Europe/Brussels` with a day-23 rule at `now = 2026-10-22T23:30:00Z` (UTC date 22, local 23 oktober 01:30; Review Focus 3) → sends; the same user at `now = 2026-10-22T21:30:00Z` (local 22 oktober 23:30) → does not send.
  - `send` returns `'gone'` → subscription deleted (`removed 1`); fifth `'error'` → deleted.
  - one user with timezone `'Bad/Zone'` and one valid user → both processed, no throw.
  - route: missing or wrong bearer → 401; correct → 200 with counts.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: payday push cron`

### Task 21: Production pipeline, backups and first deploy

**Files:**
- Create: `scripts/vercel-build.sh`, `.github/workflows/backup.yml`, `e2e/smoke.prod.spec.ts`, `README.md` (setup and operations)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1:** `scripts/vercel-build.sh`: `set -euo pipefail`; if `VERCEL_ENV = production`: `npx supabase db push --db-url "$SUPABASE_DB_URL"`; then `npx next build`. Locally verify with `VERCEL_ENV=preview bash scripts/vercel-build.sh` (builds without migrating).
- [ ] **Step 2:** `backup.yml`: `schedule: '17 3 * * 0'` and `workflow_dispatch`; steps: `npx supabase db dump --db-url "$SUPABASE_DB_URL" --role-only | gpg --batch --symmetric --cipher-algo AES256 --passphrase-fd 3 3<<<"$BACKUP_PASSPHRASE" > roles.sql.gpg`, same for schema (default) and data (`--data-only --use-copy`); upload the three `.gpg` files with `actions/upload-artifact` `retention-days: 90`. No plaintext file is ever written.
- [ ] **Step 3:** Create the Supabase project via the Supabase MCP (`create_project`, org `svwydupsfymigvqzinxu`, name `spaarplanner`, region `eu-central-1`, a generated database password). Read the URL and publishable key via MCP (`get_project_url`, `get_publishable_keys`); get the secret key and the session-pooler connection string from the dashboard (Zayd, one-time). Apply the migration with `npx supabase db push --db-url <pooler url>`. Run `get_advisors` (security and performance); fix everything except `leaked_password_protection`.
- [ ] **Step 4:** Ask Zayd for the one-time dashboard settings (spec §11): Authentication → Sign In / Providers → "Allow new users to sign up" off; minimum password length 10; Authentication → audit logs "write to database" off.
- [ ] **Step 5:** Create the Vercel project via the Vercel MCP linked to `zaydmaadal/spaarplanner` (framework Next.js, Node 24). Set env vars: public ones for all environments (`NEXT_PUBLIC_*`, `SIGNUP_MODE=open` for Production, `closed` for Preview); secrets for Production only (`SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:<Zayd's address>`, `CRON_SECRET` from `openssl rand -hex 32`, `ADMIN_USER_IDS` empty for now). VAPID keys from `npx web-push generate-vapid-keys`.
- [ ] **Step 6:** Merge PR `M4 push en livegang`; watch the production deployment until `READY`. Run `e2e/smoke.prod.spec.ts` against the production URL: register `smoke-<timestamp>`, log in, open `/overzicht`, delete the account. If registration fails with `email_address_invalid`, ask Zayd to add an A record for `u.zaydmaadal.site` and retry.
- [ ] **Step 7:** Zayd registers his own account; set `ADMIN_USER_IDS` to his UUID (Vercel MCP) and redeploy. Call the cron route once with the bearer token and expect `200` with counts.
- [ ] **Step 8:** Ask Zayd to add GitHub secrets `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` (and keep the passphrase offline); trigger `backup.yml` with `workflow_dispatch` and check three `.gpg` artifacts exist.
- [ ] **Step 9:** `README.md`: local setup (`npm ci`, `npx supabase start`, `.env.local` from `supabase status -o env`), scripts, deploy flow, the one-time steps above, restore procedure (`gpg -d` then `psql` into a local database, check row counts monthly).
- [ ] **Step 10: Commit** `chore: production pipeline, backups and runbook`

---

## Self-review notes

- Spec coverage: §5.1 to §5.9 → Tasks 2 to 8; §6 → Task 9; §7 → Tasks 10 to 12 and 18; §8.2 → Task 15; §8.3 → 16; §8.4 and §8.5 → 17; §8.6 to §8.8 and §12 privacy → 18; §9 → 19 and 20; §10 → 13; §11 → 1, 9, 21; §13 → tests in every task.
- Addition beyond the spec, from Review Focus 2: `transactions.client_ref` for idempotent deposits.
- Interpretation of spec §5.8: rule items are computed on render and only stored when closed (Task 7).
