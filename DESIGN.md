# Design

Source of truth for the look of Spaarplanner. Spec: `docs/superpowers/specs/2026-10-21-spaarplanner-design.md` section 10.

Direction: warm and alive, not a bank. A dark hero card on top of the overview (the big amount in a display serif, the payday countdown as the loudest number), soft white cards on a tinted ground, pots in their own harmonious colours, a floating pill navigation on the phone and a sidebar on the desktop. Playfair Display for headings and amounts, Plus Jakarta Sans for text. Amounts: tabular figures, right-aligned in lists. No emoji, no confetti: the life comes from colour, type and a little motion.

The user picks one of four palettes and a theme (`light`, `dark`, `system`). Both live in `profiles.prefs` and are applied as `data-palette` and `data-theme` on `<html>` by the root layout, so there is no flash on load.

| id | Name | Main colours | Use |
|---|---|---|---|
| `zonsopgang` | Zonsopgang | plum #5B2A8C, apricot #F4A261, warm cream ground | the default and the brand: a sun rising over the horizon (see `LogoMark`) |
| `smaragd` | Smaragd & goud | emerald #0B5D45, gold #D8A93F | the palette of the user's own planner |
| `lagune` | Lagune | petrol #0E6479, aqua #5ED3C3 | cool and calm |
| `kersen` | Kersen | burgundy #A3234F, rose #F29BB2 | warm and playful |

The phase 1 ids `oceaan`, `salie` and `grafiet` are gone. Migration `20261023000001_palettes.sql` widens the CHECK on `profiles.prefs` and rewrites stored values (oceaan to lagune, salie to smaragd, grafiet to zonsopgang); `parsePrefs` maps them too, for the time between a deploy and the migration.

## Palette swap

A palette swap is editing the tokens in `src/app/globals.css`, nothing else.

- Change a colour: edit it in the palette block (`[data-palette="..."]`; `zonsopgang` is also on `:root`). Every block lists every token, because the swatches in the palette picker set `data-palette` on a card. Every colour is `light-dark(<light>, <dark>)`.
- Run `npm test`: `src/styles/contrast.test.ts` checks every text and non-text pair of the table below in light and dark for all palettes.
- Add a palette: one new full block in `globals.css`, plus its id in `PALETTES` (`src/lib/prefs.ts`), in the test's `PALETTES`, in `NAMES` of `src/components/palette-picker.tsx` and in a migration that widens the CHECK on `profiles.prefs`.
- Components use tokens only (`bg-ground`, `text-ink`, `bg-action`, `bg-hero-bg`, `var(--color-pot-1)`), never a hex value, never Tailwind palette colours, and never the `dark:` variant (it follows the operating system, not `data-theme`). The one allowed non-token colour is the scrim behind a dialog or sheet, `bg-black/50`.

## Colour tokens

`light-dark()` picks the first value in light and the second in dark. Values below are generated from `globals.css`; the shared `hero-tile`, `hero-line`, `hero-track` and `shadow` live on `:root` only.

| Token | zonsopgang light | zonsopgang dark | smaragd light | smaragd dark | lagune light | lagune dark | kersen light | kersen dark |
|---|---|---|---|---|---|---|---|---|
| `--color-ground` | #F8F3EE | #150D1C | #F2F6F2 | #0C1512 | #EDF4F5 | #0A1417 | #FAF1F2 | #170B0F |
| `--color-surface` | #FFFFFF | #1F1529 | #FFFFFF | #13201B | #FFFFFF | #112126 | #FFFFFF | #211217 |
| `--color-tint` | #EFE7E1 | #2B1E38 | #E8F0EA | #1A2A24 | #E0ECEE | #182C32 | #F3E4E6 | #2D1B21 |
| `--color-tint-accent` | #F0E5F8 | #2B1E38 | #D5EADF | #1D3B30 | #D3EAEE | #182C32 | #F8DDE4 | #2D1B21 |
| `--color-hairline` | #E6DCD3 | #3A2B49 | #D3E0D7 | #26382F | #D2E1E4 | #24393F | #EBD7DA | #3D272E |
| `--color-ink` | #24132F | #F3EBF8 | #102620 | #E3EDE7 | #0C262E | #E4F0F2 | #2A101A | #F7EAED |
| `--color-ink-2` | #5B4A66 | #C2B4CF | #52665D | #AFC3B9 | #4B6168 | #AFC5CB | #6A4A55 | #CBB1B9 |
| `--color-muted` | #5B4A66 | #A798B6 | #52665D | #9AB0A6 | #4B6168 | #96B0B7 | #6A4A55 | #B398A1 |
| `--color-action` | #5B2A8C | #C6A5F2 | #0B5D45 | #45C08F | #0E6479 | #5CC6DC | #A3234F | #F08CA8 |
| `--color-on-action` | #FFFFFF | #1A0F24 | #FFFFFF | #06140F | #FFFFFF | #04141A | #FFFFFF | #2A0A14 |
| `--color-progress` | #6A35A8 | #C6A5F2 | #0B5D45 | #45C08F | #0E6479 | #5CC6DC | #A3234F | #F08CA8 |
| `--color-active-bg` | #F0E5F8 | #2B1E38 | #D5EADF | #1D3B30 | #D3EAEE | #182C32 | #F8DDE4 | #2D1B21 |
| `--color-active-ink` | #5B2A8C | #D3B8F5 | #0B5D45 | #45C08F | #0B5668 | #7BD3E5 | #8E1C44 | #F6A6BC |
| `--color-accent-ink` | #4A2178 | #D3B8F5 | #0B5D45 | #45C08F | #0B5668 | #7BD3E5 | #8E1C44 | #F6A6BC |
| `--color-pot-1` | #3B1F5C | #CDB6EB | #5B6F66 | #93A89F | #0C3947 | #B5D6DE | #4A1426 | #E8BCC8 |
| `--color-pot-2` | #D9622B | #D9622B | #17707C | #5BBBC7 | #E0614A | #F08A76 | #2F7D6D | #4FB5A0 |
| `--color-pot-3` | #2E8B83 | #2E8B83 | #9E3B5C | #E48AA8 | #6F65B5 | #A096E0 | #7C5BA8 | #B596DC |
| `--color-pot-4` | #E0A23A | #E0A23A | #D8A93F | #E2B659 | #E7B65C | #E7B65C | #E09A3A | #E9AE5A |
| `--color-pot-5` | #6A35A8 | #C6A5F2 | #0B5D45 | #45C08F | #0E6479 | #5CC6DC | #A3234F | #F08CA8 |
| `--color-seg-fixed` | #3B1F5C | #CDB6EB | #1F3A30 | #BFD3C8 | #0C3947 | #B5D6DE | #4A1426 | #E8BCC8 |
| `--color-seg-living` | #A68BC9 | #A68BC9 | #8FB0A0 | #8FB0A0 | #86B3BF | #86B3BF | #C99AA9 | #C99AA9 |
| `--color-seg-savings` | #6A35A8 | #C6A5F2 | #0B5D45 | #45C08F | #0E6479 | #5CC6DC | #A3234F | #F08CA8 |
| `--color-seg-free` | #F4C9A0 | #F4C9A0 | #E9D08F | #E9D08F | #F6C9BE | #F6C9BE | #F3CFA0 | #F3CFA0 |
| `--color-spark` | #F4A261 | #F4A261 | #D8A93F | #D8A93F | #5ED3C3 | #5ED3C3 | #F29BB2 | #F29BB2 |
| `--color-hero-accent` | #F4A261 | #F4A261 | #D8A93F | #D8A93F | #5ED3C3 | #5ED3C3 | #F29BB2 | #F29BB2 |
| `--color-on-spark` | #2A1405 | #2A1405 | #1B1405 | #1B1405 | #052420 | #052420 | #2D0814 | #2D0814 |
| `--color-hero-bg` | #2B1744 | #22123A | #0B3A2D | #0A241C | #0B3C4C | #082A35 | #4A1426 | #36101D |
| `--color-hero-ink` | #F6EEFA | #F6EEFA | #EFF6F1 | #EFF6F1 | #ECF6F8 | #ECF6F8 | #FBEEF1 | #FBEEF1 |
| `--color-hero-muted` | #BCA7D3 | #BCA7D3 | #A7C6B7 | #A7C6B7 | #A6C8D0 | #A6C8D0 | #D5A9B6 | #D5A9B6 |
| `--color-warn-bg` | #FEEDC9 | #FEEDC9 | #FEEDC9 | #FEEDC9 | #FEEDC9 | #FEEDC9 | #FEEDC9 | #FEEDC9 |
| `--color-warn-ink` | #81520A | #81520A | #81520A | #81520A | #81520A | #81520A | #81520A | #81520A |
| `--color-error` | #C4242A | #F2777C | #C4242A | #F2777C | #C4242A | #F2777C | #C4242A | #F2777C |

Roles:

| Token | Use |
|---|---|
| `ground` | page background |
| `surface` | cards, sheets, inputs |
| `tint` | quiet fills: bar tracks, secondary buttons |
| `tint-accent` | soft accent fill behind accent text |
| `hairline` | borders and dividers |
| `ink`, `ink-2`, `muted` | text: normal, secondary, quiet labels (`muted` is `ink-2` in light) |
| `action`, `on-action` | the main button and the text on it |
| `progress` | progress bars and savings |
| `active-bg`, `active-ink` | the active tab |
| `accent-ink` | accent text on `tint-accent` (light) |
| `pot-1` to `pot-5` | the colours of savings pots; they never clash within one palette, and pots 1 to 3 are three different hues so the first goals are easy to tell apart |
| `spark` | the warm highlight: the savings tile, the hero bar, the sun in the logo. `on-spark` is the text on it |
| `hero-bg`, `hero-ink`, `hero-muted`, `hero-accent` | the dark hero card (overview, auth pages, onboarding welcome): background, text, quiet text, highlight. The same in light and dark, with `hero-tile`, `hero-line` and `hero-track` (translucent white) for tiles, borders and bar tracks on it |
| `seg-fixed`, `seg-living`, `seg-savings`, `seg-free` | segments of the stacked bar |
| `warn-bg`, `warn-ink` | warning notices |
| `error` | errors |

Other tokens: `--radius-strip` 14 px, `--radius-card` 20 px, `--radius-hero` 28 px; `--font-display` (Playfair Display 600 and 700, via `next/font`, for headings, big amounts and the countdown), `--font-body` (Plus Jakarta Sans 400 to 700); `--shadow-card`, `--shadow-nav`; `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)`; `--duration-1` 120 ms, `--duration-2` 200 ms, `--duration-3` 320 ms. Names such as `bg-background`, `text-foreground`, `bg-primary` and `border-input` are aliases for the shadcn components and the account forms. The token for the warm highlight is `spark`, not `accent`, because `accent` is already the shadcn alias of `tint-accent`.

## Spacing

A 4 px grid, mostly 4, 8, 12, 16, 24. Inside things stay tight; the air is between sections.

| Where | Value |
|---|---|
| Card padding | 12 to 16 px (`p-3`, `p-4`); 32 px (`p-8`) only for the desktop onboarding card and the hero |
| Gap inside a card or list | 8 px (`gap-2`), between rows 4 to 8 px |
| Gap between cards | 12 px (`gap-3`), between sections 24 px |
| Page side margin | 16 px, 20 px from 400 px, 32 px from 768 px, 40 px from 1024 px |

## Layout

- Under 1024 px: one column, max 512 px (672 px from 768 px), a floating pill nav at the bottom. The pill sits `0.75rem` above `env(safe-area-inset-bottom)` (the viewport has `viewport-fit=cover`), so the home indicator never covers it; the page keeps `6.5rem` plus the safe area as bottom padding.
- From 1024 px: a fixed 240 px sidebar on the left (`SidebarNav`, with a Storten button), content up to 1100 px, 2 columns where a page asks for it.
- Onboarding: one centred card, 512 px, 576 px from 768 px, 672 px from 1024 px, with the progress segments above it.

## Motion

Subtle and fast, always `--ease-standard`, 120, 200 or 320 ms. Everything is switched off by the `prefers-reduced-motion` rule at the end of `globals.css`.

| What | How |
|---|---|
| Cards fade and slide in, staggered | class `rise`, `style={{ "--i": n }}` adds `n * 50ms` |
| Progress bars fill on mount | class `bar-fill` (already on `ProgressBar` and the onboarding segments), 700 ms |
| Money counts up | `<CountUp cents>` (client): the final amount is in the HTML, it counts from 70% to 100% in 600 ms. Use it for hero figures only |
| Pressed state | every enabled `button` dips to 97%; links and cards add the class `press` |
| Page change | `(app)/template.tsx` wraps the page in React `<ViewTransition>` (fade in, short fade out); the active pill of the nav has a `view-transition-name`, so it slides to the new tab |
| Toast, sheet, dialog | Sonner and the shadcn components animate themselves |

## Contrast

The test requires 4.5:1 for all text pairs (also `hero-ink` and `hero-muted` on `hero-bg`, `on-spark` on `spark`), 3:1 for `progress` on `surface`, for `spark` and `hero-accent` on `hero-bg`, and for every pot and segment on `surface` in dark. In light the pastel segments (`seg-free`, `pot-4`) are 1.6 to 3.1:1 on white by design, so every bar is paired with a text label and an amount; meaning is never carried by colour alone. The dark pot and segment colours are lighter than their light twins so a bar does not vanish on a dark card. `accent-ink` is the text on `tint-accent`.

## Rules (spec 10.2)

Do:
- One main figure per screen (32 px), other figures 20 to 24 px.
- Space on a 4 px grid, see Spacing.
- Contrast of at least 4.5:1 for all text, also small grey labels. Say it in words or icons too.
- One accent colour per palette (`action`, `progress`, the active tab) plus its warm highlight `spark` for the hero and the savings tile. Pots may use their own `pot-n` colour. Status colours (good, warning, error) are separate.
- Motion with `--ease-standard` and 120, 200 or 320 ms, only for feedback and transitions. With `prefers-reduced-motion` only instant changes (a global rule in `globals.css`).
- Forms: `inputmode="decimal"`, comma and dot both allowed, labels always visible, a fixed euro prefix.
- Dutch, informal "je", sentence case, buttons say what they do ("Pot opslaan").
- Real buttons and links, a visible focus ring, touch targets of at least 44 px, never block zooming (no `maximum-scale`), follow the device font size.
- Element ids from `useId()`, never hard-coded: Next keeps the previous route mounted but hidden.
- In a server component an id from `useId()` is numbered per request, so it can equal an id on a hidden page: name a region with `aria-label`, never with `aria-labelledby` and a generated id. Client components keep `useId()` (unique within their own tree).

Don't:
- Colour gradients, glass effects, glow, emoji, confetti, or a coloured border on the left of a card. The one allowed pattern is the hero's contour (`.contour`: thin concentric lines in `hero-line`, around the sun).
- A status colour used as decoration.
- Colour as the only carrier of meaning.
- The em dash character (U+2014) in copy, comments or docs.

## Amounts

Money is integer cents. Show it only through `formatEUR` (`src/domain/money.ts`) or `<Money cents={n} />`: `nl-BE`, 2 decimals, a no-break space (U+00A0) after the euro sign, and a negative as minus sign U+2212, a no-break space, then the amount.

- `€ 1.240,00`
- `− € 50,00`

`<Money>` adds `tabular-nums`, `white-space: nowrap` and the display font. In lists, put amounts in a fixed right-aligned column and end with a total row.

## Components

| Component | Notes |
|---|---|
| `Money` | `cents`, `className?` |
| `CertaintyMeter` | `level` 1 to 5, `reason`; five segments, the `CERTAINTY_LABEL` text and the reason; `role="img"` with `aria-label="Zekerheid N van 5: label"` |
| `ProgressBar` | `value` 0 to 1 (clamped), `label` (accessible name), `color?` as `var(--color-...)`; show the amounts next to it |
| `StackedBar` | `segments` of `{ label, cents, color }`; the legend with label and amount carries the meaning |
| `BottomNav` | `active` (a tab, or `storten` on the deposit screen); every screen renders it with its own tab. A floating pill under 1024 px, `lg:hidden`, with a raised Storten button in the middle and a sliding active pill (view transition). Content needs bottom padding, which `src/app/(app)/layout.tsx` provides |
| `SidebarNav` | client component in `(app)/layout.tsx`, from 1024 px: logo, a Storten button, the four tabs; the active one comes from the URL |
| `LogoMark` | the brand mark (sun over a horizon) in palette tokens |
| `AuthShell`, `AuthHero` | `src/components/auth-shell.tsx`: login and register (hero above, or on the left from 1024 px, the form in a card that overlaps it). `AuthHero` alone is the welcome block of onboarding step 1. The page keeps its own h1 |
| `CountUp` | `cents`, `className?`: `Money` that counts up once on mount; for hero figures |
| `form-fields` | `TextField`, `MoneyField` (fixed euro prefix, `inputmode="decimal"`, optional `onRemove` for a stored amount that is not a list row), `SelectField`, `TextareaField`, `CheckField`, `Choice` (one out of a few), `Toggles` (switch items on or off), `Item` (a row of a list form with its remove button). Label always visible, hint and error tied with `aria-describedby`, ids from `useId` |
| `EffectPreview` | `before`, `after` as `previewInputs` makes them (same horizon, one-off income for it); the goal's own "Klaar rond ..." with status and advice, then a sentence per other goal that moves. Shown in the goal form before saving |
| `GoalCard`, `History`, `DepositForm` | `src/components/goals` and `deposit`: a pot in the list (with arrows for its priority), the bookings of one pot, and the deposit or withdrawal form (one `clientRef` per row, kept until the save succeeds) |
| `StepShell` | `src/components/onboarding`: one onboarding step, or the same form on its own page with `mode="edit"` (no progress, no "Overslaan", the button says "Opslaan"); `level={2}` makes the title an h2 for a second form on a page (Meer: inkomen, spaarplan), so a page keeps one h1. On a Meer page a stored row without an amount is an error under its field, never a delete: removing is the row's own "Verwijderen" button (`blankAmount`, `refuseBlank`) |
| `InstallGuide` | how to put the app on the home screen, iOS and Android apart |
| `PalettePicker` | `value`, `onChange`; each card shows its own palette; choosing sets `data-palette` on `<html>` at once, the parent saves it |
| `Timeline`, `Checklist` | `src/components/plan`: the Plan screen. `Timeline` lists the pots by fill month (`byFill`: full first, never last, ties keep their priority), `Checklist` the open steps per urgency (`checklistGroups`: rule steps before own steps) with a tick and a dismiss button per step and a form for a step of your own |
| `Appearance`, `PlanSettingsForm` | `src/components/settings`: Meer. `Appearance` is the `PalettePicker` plus the theme switch (licht, donker, systeem), shown on `<html>` at once and saved with both values. `PlanSettingsForm` holds the plan settings the onboarding has no form for (wisselend inkomen, eenmalig inkomen meetellen, noodfonds-aandeel), each shown only where it applies |
| `src/components/ui/*` | shadcn (new-york, Radix) with the tokens mapped; buttons and inputs are 44 px high, close buttons are 44 px. `Slider` hands `aria-labelledby` (or `aria-label`) and `aria-valuetext` to its thumb: label it, show its value next to it and give the value in words |

`src/app/(app)` holds the screens that need a finished onboarding (`requireOnboarded()`). Onboarding and `/wachtwoord-wijzigen` stay outside it, or the proxy's must-change redirect would loop. Its `loading.tsx` (grey blocks, no shimmer) and `error.tsx` (a card with "Opnieuw proberen", which calls `retry()` and never shows the error) are the loading and error state of every screen in it (spec 8.8).

## Skills

`.claude/skills` holds four vendored design skills (source and changes in each `ORIGIN.md`): `motion-design`, `web-design-guidelines`, `impeccable-rules`, `taste-app-screens`. The spec and this file win where they disagree.
