# Design

Source of truth for the look of Spaarplanner. Spec: `docs/superpowers/specs/2026-10-21-spaarplanner-design.md` section 10.

Direction A (soft and warm) as the base: round cards (radius 20 to 28 px), white surfaces on a soft ground, Gabarito for headings and amounts, Figtree for text. Amounts like direction B: tabular figures, right-aligned in lists.

The user picks one of three palettes (`oceaan` default, `salie`, `grafiet`) and a theme (`light`, `dark`, `system`). Both live in `profiles.prefs` and are applied as `data-palette` and `data-theme` on `<html>` by the root layout, so there is no flash on load.

## Palette swap

A palette swap is editing the tokens in `src/app/globals.css`, nothing else.

- Change a colour: edit it in the palette block (`[data-palette="..."]`; `oceaan` is the complete block on `:root`). Every colour is `light-dark(<light>, <dark>)`.
- Run `npm test`: `src/styles/contrast.test.ts` checks every text and non-text pair of the table below in light and dark for all palettes.
- Add a palette: one new block in `globals.css` that lists only what differs from `oceaan`, plus its id in `PALETTES` (`src/lib/prefs.ts`), in the test's `PALETTES` and in `NAMES` of `src/components/palette-picker.tsx`.
- Components use tokens only (`bg-ground`, `text-ink`, `bg-action`, `var(--color-pot-1)`), never a hex value, never Tailwind palette colours, and never the `dark:` variant (it follows the operating system, not `data-theme`). The one allowed non-token colour is the scrim behind a dialog or sheet, `bg-black/50`.

## Colour tokens

`light-dark()` picks the first value in light and the second in dark. The build turns it into a pair of custom properties that older browsers understand; `data-theme` and the system setting switch both.

| Token | oceaan light | oceaan dark | salie light | salie dark | grafiet light | grafiet dark |
|---|---|---|---|---|---|---|
| `--color-ground` | #EDF1F7 | #0F0F10 | #EDF1EE | #0F0F10 | #EEEFF2 | #0F0F10 |
| `--color-surface` | #FFFFFF | #161618 | #FFFFFF | #161618 | #FFFFFF | #161618 |
| `--color-tint` | #E2E8F1 | #222225 | #E4EAE6 | #222225 | #E4E6EA | #222225 |
| `--color-tint-accent` | #DAE3F8 | #222225 | #DCEAE3 | #222225 | #E2E4E9 | #222225 |
| `--color-hairline` | #DCE3ED | #2E2E33 | #D9E1DC | #2E2E33 | #E2E4E8 | #2E2E33 |
| `--color-ink` | #0F1A2E | #EDEDEE | #17201D | #EDEDEE | #15161A | #EDEDEE |
| `--color-ink-2` | #4A586E | #B4B4B4 | #56625C | #B4B4B4 | #555A62 | #B4B4B4 |
| `--color-muted` | #4A586E | #9A9A9A | #56625C | #9A9A9A | #555A62 | #9A9A9A |
| `--color-action` | #2E46B8 | #8EA2FF | #22655B | #6FC2B0 | #15161A | #EDEDEE |
| `--color-on-action` | #FFFFFF | #0F0F10 | #FFFFFF | #0F0F10 | #FFFFFF | #0F0F10 |
| `--color-progress` | #2E46B8 | #8EA2FF | #22655B | #6FC2B0 | #8F6BFF | #A88BFF |
| `--color-active-bg` | #DAE3F8 | #222225 | #DCEAE3 | #222225 | #8F6BFF | #222225 |
| `--color-active-ink` | #2E46B8 | #8EA2FF | #22655B | #6FC2B0 | #15161A | #A88BFF |
| `--color-accent-ink` | #1F3392 | #8EA2FF | #174A43 | #6FC2B0 | #555A62 | #A88BFF |
| `--color-pot-1` | #16244F | #C9D3EE | #3F5976 | #6F8FB5 | #25272C | #D5D8DE |
| `--color-pot-2` | #2E46B8 | #8EA2FF | #6A8876 | #6A8876 | #8F6BFF | #A88BFF |
| `--color-pot-3` | #C95A38 | #C95A38 | #C59B52 | #C59B52 | #6A6F78 | #6A6F78 |
| `--color-pot-4` | #7D93B6 | #7D93B6 | #93A79B | #93A79B | #B7BBC2 | #B7BBC2 |
| `--color-seg-fixed` | #16244F | #C9D3EE | #1F2B33 | #C5D3DC | #25272C | #D5D8DE |
| `--color-seg-living` | #7D93B6 | #7D93B6 | #93A79B | #93A79B | #50555D | #8C919A |
| `--color-seg-savings` | #2E46B8 | #8EA2FF | #22655B | #6FC2B0 | #8F6BFF | #A88BFF |
| `--color-seg-free` | #F3BBA4 | #F3BBA4 | #DEC690 | #DEC690 | #B7BBC2 | #B7BBC2 |
| `--color-warn-bg` | #FEEDC9 | #FEEDC9 | #FEEDC9 | #FEEDC9 | #FEEDC9 | #FEEDC9 |
| `--color-warn-ink` | #81520A | #81520A | #81520A | #81520A | #81520A | #81520A |
| `--color-error` | #C4242A | #F2777C | #C4242A | #F2777C | #C4242A | #F2777C |

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
| `pot-1` to `pot-4` | the colours of savings pots |
| `seg-fixed`, `seg-living`, `seg-savings`, `seg-free` | segments of the stacked bar |
| `warn-bg`, `warn-ink` | warning notices |
| `error` | errors |

Other tokens: `--radius-strip` 20 px, `--radius-card` 24 px, `--radius-hero` 28 px; `--font-display` (Gabarito 600 and 700), `--font-body` (Figtree 400 and 600); `--ease-standard` `cubic-bezier(0.2, 0, 0, 1)`; `--duration-1` 120 ms, `--duration-2` 200 ms, `--duration-3` 320 ms. Names such as `bg-background`, `text-foreground`, `bg-primary` and `border-input` are aliases for the shadcn components and the account forms.

## Values changed for contrast or visibility

Light values are exactly the approved mockups. Dark values are the shared greys plus the per-palette accent from the brief, except:

| Token | Brief | Now | Why |
|---|---|---|---|
| `error` (dark) | #C4242A, 3.13:1 on `surface` | #F2777C, 6.63:1 | text must reach 4.5:1 |
| `pot-1`, `seg-fixed` (dark, oceaan) | #16244F, 1.20:1 on `surface` | #C9D3EE, 12.08:1 | a navy bar vanishes on a dark card |
| `pot-1` (dark, salie) | #3F5976, 2.50:1 | #6F8FB5, 5.40:1 | same |
| `seg-fixed` (dark, salie) | #1F2B33, 1.25:1 | #C5D3DC, 11.81:1 | same |
| `pot-1`, `seg-fixed` (dark, grafiet) | #25272C, 1.21:1 | #D5D8DE, 12.66:1 | same |
| `seg-living` (dark, grafiet) | #50555D, 2.41:1 | #8C919A, 5.71:1 | same |
| `accent-ink` (dark) | not given | the palette's `progress` | text on `tint-accent` in dark |

The test also requires 3:1 for every pot and segment on `surface` in dark. In light the pastel segments (`seg-free`, `pot-4`) are 1.6 to 3.1:1 on white by design, so every bar is paired with a text label and an amount; meaning is never carried by colour alone.

## Rules (spec 10.2)

Do:
- One main figure per screen (32 px), other figures 20 to 24 px.
- Space on a 4 px grid, side margin 16 px (20 px from 400 px wide).
- Contrast of at least 4.5:1 for all text, also small grey labels. Say it in words or icons too.
- One accent colour: only for the main action, progress and the active tab. Status colours (good, warning, error) are separate from the accent.
- Motion with `--ease-standard` and 120, 200 or 320 ms, only for feedback and transitions. With `prefers-reduced-motion` only instant changes (a global rule in `globals.css`).
- Forms: `inputmode="decimal"`, comma and dot both allowed, labels always visible, a fixed euro prefix.
- Dutch, informal "je", sentence case, buttons say what they do ("Pot opslaan").
- Real buttons and links, a visible focus ring, touch targets of at least 44 px, never block zooming (no `maximum-scale`), follow the device font size.
- Element ids from `useId()`, never hard-coded: Next keeps the previous route mounted but hidden.
- In a server component an id from `useId()` is numbered per request, so it can equal an id on a hidden page: name a region with `aria-label`, never with `aria-labelledby` and a generated id. Client components keep `useId()` (unique within their own tree).

Don't:
- Gradients, glass effects, glow, emoji, or a coloured border on the left of a card.
- A second accent colour, or a status colour used as decoration.
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
| `BottomNav` | `active` (a tab, or `storten` on the deposit screen); every screen renders it with its own tab. The middle button "Storten" goes to `/storten`. Content needs bottom padding, which `src/app/(app)/layout.tsx` provides |
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
