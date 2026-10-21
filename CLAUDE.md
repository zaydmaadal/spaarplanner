# Spaarplanner

Next.js PWA savings planner for Belgian users (Dutch UI).
Spec: `docs/superpowers/specs/2026-10-21-spaarplanner-design.md`
Plan: `docs/superpowers/plans/2026-10-21-spaarplanner-fase-1.md`

## Commands

- `npm run dev` / `build` / `start`
- `npm run lint`, `npm run typecheck` (`tsc --noEmit`)
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
- Smallest change that works (ponytail): no speculative config,
  options or abstractions. Deleting beats adding.

## Working with tokens

- Keep files short.
- Look up library docs via context7 when available instead of pasting them.
- Use a cheaper model for mechanical subtasks.
- One plan task per session.
- Do not re-read large files you already read.

## Database

After every migration, run the Supabase advisors through the Supabase
MCP (`get_advisors`) and fix all findings except `leaked_password_protection`.
