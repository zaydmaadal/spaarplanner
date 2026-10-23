# Spaarplanner

Next.js PWA savings planner for Belgian users (Dutch UI).
Spec: `docs/superpowers/specs/2026-10-21-spaarplanner-design.md`
Plan: `docs/superpowers/plans/2026-10-21-spaarplanner-fase-1.md`

## Commands

- `npm run dev` / `build` / `start`
- `npm run lint`, `npm run typecheck` (`next typegen && tsc --noEmit`)
- `npm test` (vitest run), `npm run e2e` (playwright test)
- Node 24 (`.nvmrc`). CI runs lint, typecheck, test, build.

## Rules

- Layers: `src/domain/**` is pure TypeScript. It imports nothing from
  `@/data`, `@/app`, `@/components`, `@/lib`, `next`, `react` or
  `@supabase/*` (ESLint enforces this).
- Money: integer cents (`number`). Display only through `formatEUR`
  (`nl-BE`, 2 decimals, U+00A0 after the euro sign).
- Copy: Dutch, informal "je", sentence case, buttons name their action.
  Never use the em dash character (U+2014) in copy, code comments or docs.
- Next.js 16 differs from older versions: read the bundled docs in
  `node_modules/next/dist/docs/` before writing Next.js code.
- Smallest change that works (ponytail): no speculative config,
  options or abstractions. Deleting beats adding.

## Skills

Vendored in `.claude/skills` (source and changes in each `ORIGIN.md`). Use them:

- UI work: `impeccable` (its craft-floor before any UI edit; `critique`, `audit`, `polish`),
  `taste-app-screens`, `web-design-guidelines`, `frontend-ui-engineering`.
- Motion: `motion-design`, `apple-design`, `vercel-react-view-transitions`.
- React and Next.js code: `vercel-react-best-practices`.
- Look at the result with `playwright-cli` (390px and 1440px) before calling UI work done.
  The cloud container has no Chrome: put
  `{"browser":{"browserName":"chromium","launchOptions":{"executablePath":"/opt/pw-browsers/chromium"}}}`
  in `.playwright/cli.config.json` (gitignored).
- Review and fixes: `code-review-and-quality`, `code-simplification`,
  `debugging-and-error-recovery`; `doubt-driven-development` and `security-and-hardening`
  for auth, money and input handling.
- Unclear asks: `interview-me`. Large changes: `incremental-implementation`.
  Before a release: `shipping-and-launch`, `performance-optimization`.

## Working with tokens

- Keep files short.
- Look up library docs via context7 when available instead of pasting them.
- Use a cheaper model for mechanical subtasks.
- One plan task per session.
- Do not re-read large files you already read.

## Database

After every migration, run the Supabase advisors through the Supabase
MCP (`get_advisors`) and fix all findings except `leaked_password_protection`.
