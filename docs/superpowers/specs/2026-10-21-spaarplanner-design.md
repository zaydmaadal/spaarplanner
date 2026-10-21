# Spaarplanner: ontwerp (spec)

Datum: 2026-10-21. Status: ter review bij Zayd. Versie 2 (na review door 5 agents, zie §18).
Dit document beschrijft wat we bouwen en waarom. Het implementatieplan staat in `docs/superpowers/plans/`.

## 1. Doel

Een mobile-first webapp (PWA, op je beginscherm te zetten) waarmee je in één oogopslag ziet waar je geld naartoe gaat en wanneer je doelen bereikt zijn. Je vult bij de start je inkomen, loondag, uitgaven en doelen in. De app maakt daaruit een verdeling, een tijdlijn en een stappenplan, en herinnert je op loondag om je storting in te vullen.

**Voor wie, nu:** Zayd, familie en vrienden (± 20 mensen).
**Voor wie, later:** een betaald product. De architectuur moet dat toelaten zonder herbouw.

**Fase 1 is geslaagd als:**
1. Zayd en Haider de onboarding afronden in ± 5 minuten, zonder uitleg.
2. Ze op loondag een pushmelding krijgen en hun storting in minder dan 30 seconden invullen.
3. De simulator en de tijdlijn kloppen met de uitgewerkte voorbeelden in §5.9 (getest).
4. Niemand de gegevens van een ander kan zien (getest met RLS-tests).
5. Een push naar `main` de app automatisch live zet, inclusief databasemigraties, zonder handwerk.

## 2. Scope

### Fase 1 (dit document, volledig uitgewerkt)
- Account: gebruikersnaam en wachtwoord, open registratie met een schakelaar die ook echt dichtgaat.
- Onboarding in 8 korte stappen.
- Overzicht: loondag, hoofddoel, verdeling van je loon, potten, simulator, volgende stappen.
- Doelen (potten): aanmaken, aanpassen, archiveren, met een preview van het effect op je andere doelen.
- Stortingen en opnames per pot.
- Plan: tijdlijn en checklist, gemaakt met vaste regels.
- Pushmelding op loondag.
- Instellingen: gegevens aanpassen, gegevens downloaden, account wissen, app installeren, meldingen.
- Licht en donker thema.
- Vrije tekst over jezelf (vakantiedagen, hobby's, context) wordt al bewaard, zodat de AI het in fase 2 meteen kan gebruiken.

### Niet in fase 1, met reden
| Onderdeel | Fase | Reden |
|---|---|---|
| AI-chat, toon, memory-import | 2 | Eerst een stevig datamodel en rekenregels waar de AI mee kan werken. Anders wordt het vooral praten. |
| Reisplanner | 3 | Een reis is een doel met posten. Het fundament (doelen, projectie) moet eerst staan. |
| Wekelijkse herinnering bij onregelmatig inkomen | 3 | Eén extra soort melding; eerst de loondagmelding bewijzen. |
| CSV/XLSX-import van bankafschriften | 4 | Vraagt een parser per bank en een aparte tabel. |
| Meerdere talen, gedeelde doelen, betalingen | Product | Niet nodig voor familie en vrienden. |

### Roadmap
| Fase | Inhoud |
|---|---|
| 1 | Fundament (dit document) |
| 2 | AI-chat met voorstelkaarten, memory-import, toon, captcha en AI-limieten |
| 3 | Reisplanner met geschatte en zekere prijzen, AI-reismodus, wekelijkse herinnering |
| 4 | CSV/XLSX-import van bankafschriften, daarna eventueel een PSD2-koppeling |

## 3. Persona's en wat fase 1 voor hen moet doen

Elke persona wordt een vaste testdataset (seed) met minstens één domeintest.

| Persona | Situatie | Wat fase 1 moet kunnen |
|---|---|---|
| Zayd | Eerste job, vaste bijdrage aan mama, noodfonds eerst, lange doelen (huwelijk, hijra, Hajj), sparen zonder rente | Vaste kost "mama", Hajj en hijra als potten, noodfonds eerst, gewichten per pot, lange horizon (tot 40 jaar), voorkeur "sparen zonder rente", persoonlijke elementen (bv. basmala) als optie |
| Haider | Eerste job, eerste loon snel op, nog geen systeem, wil reizen | Een standaardvoorstel voor sparen als hij weinig invult (§5.1), loondagmelding, één reisdoel, de keuze "noodfonds eerst of tegelijk" |
| Student | Laag en wisselend inkomen (weekends, vakanties), soms per week betaald, stage zoeken, wil op reis | Wisselend inkomen met een voorzichtig bedrag, inkomen per week, "stage vinden" als checklist-item, kleine potten |
| Gezin 45+ | Lening, studiekosten kinderen, pensioen | Werkt volledig zonder AI; volgt de lettergrootte van het toestel |
| Tiener 15-17 | Zakgeld, vakantiejob, rijbewijs als doel | Inkomen per week of onregelmatig, zonder loondagmelding. Voor een betaald product spelen minderjarigen-regels (toestemming ouders); niet in fase 1 |
| Freelancer / bijberoep | Wisselend inkomen, moet sociale bijdragen en belasting opzijzetten | Inkomen van type "bijberoep", een pot voor belasting zonder deadline, checklist-item over belasting |

## 4. Architectuur

### 4.1 Stack (versies vastgelegd op 2026-10-20)
| Onderdeel | Keuze | Waarom |
|---|---|---|
| Framework | Next.js 16.4 (App Router), React 19.3, TypeScript | Standaard voor Vercel, server actions, één codebase |
| Styling | Tailwind CSS 4.3 (CSS-first `@theme`) | Design tokens op één plek |
| UI-bouwstenen | shadcn/ui op Radix (in de repo gekopieerd) voor Sheet, Dialog, Slider, Checkbox; Sonner voor meldingen | Toegankelijk zonder zware afhankelijkheid; shadcn's oude Toast is vervangen door Sonner |
| Validatie | Zod 4 | Eén schema voor formulier, server action en env |
| Database en login | Supabase (Postgres 17, Auth, RLS), regio Frankfurt `eu-central-1` | Gratis voor deze schaal, EU-data, RLS |
| Supabase in Next | `@supabase/ssr` met publishable en secret keys, sessie verversen in `proxy.ts` | Huidige officiële aanpak (Next 16 hernoemde middleware naar proxy) |
| Hosting | Vercel, functies in regio `fra1` (`"regions": ["fra1"]` in `vercel.json`) | Auto-deploy vanuit GitHub, previews per branch |
| Push | Web Push met VAPID (`web-push`), service worker volgens de Next.js 16.4 PWA-gids | Geen externe dienst nodig |
| Grafieken | Eigen SVG-componenten | Een paar balken en lijnen, geen grafiekbibliotheek nodig |
| Tests | Vitest 5 (domein en acties), pgTAP via `supabase test db` (RLS), Playwright 1.64 + axe (e2e en toegankelijkheid) | Elke laag apart te testen |
| Node | 24.x, vastgezet in `package.json` (`engines`), `.nvmrc`, CI en Vercel | Ondersteund tot april 2028; de tools vragen minimaal 22 |
| Fase 2 | AI SDK 7 via Vercel AI Gateway | Model wisselen is één string |

### 4.2 Lagen
```
src/domain/      Pure TypeScript. Rekenregels, geen I/O, geen React, geen Supabase.
                 Herbruikbaar in een latere gsm-app en in AI-tools (fase 2).
src/data/        Supabase-clients, queries en server actions per entiteit.
                 De enige laag die schrijft. UI en (later) AI gebruiken dezelfde actions.
src/components/  UI: primitives (ui/) en feature-componenten.
src/app/         Routes en layouts. Dun: haalt data op, roept domain aan, toont componenten.
src/lib/         Env-validatie, push, service worker, kleine hulpfuncties.
supabase/        config.toml, migrations, seed (persona's), RLS-tests.
```
Regel: `src/domain` importeert niets uit de andere mappen (ESLint `no-restricted-imports`).

### 4.3 Mappen
```
spaarplanner/
├─ src/
│  ├─ app/
│  │  ├─ (publiek)/inloggen, registreren, privacy
│  │  ├─ onboarding/[stap]
│  │  ├─ (app)/overzicht, doelen, doelen/[id], plan, storten, meer
│  │  ├─ (account)/wachtwoord-wijzigen   (buiten (app): geen onboarding-check, anders een redirectlus met de proxy)
│  │  ├─ beheer/                (alleen ADMIN_USER_IDS)
│  │  ├─ api/cron/loondag/route.ts
│  │  ├─ manifest.ts
│  │  └─ globals.css            (design tokens)
│  ├─ domain/                   money, period, payday, allocation, projection, certainty, checklist-rules (+ *.test.ts)
│  ├─ data/                     supabase/{browser,server,admin}.ts, per entiteit een bestand
│  ├─ components/ui/, components/<feature>/
│  └─ lib/env.ts, lib/push.ts, lib/service-worker.js
├─ supabase/ config.toml, migrations/, tests/ (pgTAP), seed.sql
├─ scripts/vercel-build.sh      (migreert productie vóór de build, zie §11)
├─ e2e/ (Playwright)
├─ docs/ superpowers/specs, superpowers/plans, adr/
├─ .claude/skills/ (nagelezen kopieën van design-skills, zie bijlage A)
├─ .github/workflows/ ci.yml, backup.yml
├─ DESIGN.md, CLAUDE.md, vercel.json
```

### 4.4 Omgevingsvariabelen
Publieke variabelen worden bij de build gevalideerd (Zod, `src/lib/env.ts`). Geheime variabelen worden pas gevalideerd bij het eerste gebruik, zodat CI en previews kunnen bouwen zonder geheimen.

| Naam | Omgeving | Doel |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | alle | Supabase |
| `NEXT_PUBLIC_AUTH_EMAIL_DOMAIN` | alle | domein van de interne e-mailadressen: `u.zaydmaadal.site`. **Nooit wijzigen na de lancering.** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | alle | Web Push |
| `SIGNUP_MODE` | alle | `open`, `invite` of `closed`. Ontbreekt de variabele, dan geldt `closed`. Op productie: `open`. |
| `INVITE_CODE` | alle | verplicht als `SIGNUP_MODE=invite` |
| `SUPABASE_SECRET_KEY` | alleen Production | registratie, cron, beheer, account wissen |
| `SUPABASE_DB_URL` | alleen Production (build) | migraties tijdens de productiebuild (Supavisor session pooler, IPv4) |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | alleen Production | Web Push versturen |
| `CRON_SECRET` | alleen Production | beveiligt de cron-route; minimaal 32 willekeurige tekens |
| `ADMIN_USER_IDS` | alleen Production | komma-lijst van auth-UUID's met toegang tot `/beheer` |

## 5. Rekenregels (`src/domain`)

### 5.1 Geld en maandbudget
- Alle bedragen zijn gehele **centen** (`number`). Delen wordt naar beneden afgerond op 1 cent; afrondingsresten gaan naar het eerste doel in de sorteervolgorde dat nog ruimte heeft.
- Tonen: `Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' })`, altijd 2 decimalen. Tussen € en het bedrag staat een harde spatie (U+00A0). Een opname toont als `− € 50,00` (minteken U+2212).
- Inkomen per maand: `monthly` telt volledig, `weekly` × 52 / 12, `biweekly` × 26 / 12 (naar beneden afgerond). `yearly` en `once` tellen niet mee in het maandbudget (zie 5.4).
```
inkomen_maand   = som van de maandbedragen (bij wisselend inkomen: zie 5.4)
uitgaven_maand  = som van alle budgetlijnen (vast + leven + vrij)
spaarruimte     = inkomen_maand - uitgaven_maand
spaardoel_maand = plans.monthly_savings_cents als dat ingevuld is,
                  anders max(0, spaarruimte)   ("volgt je spaarruimte")
```
- Waarschuwingen: `spaarruimte < 0` geeft "Je geeft meer uit dan je verdient". Een ingevuld spaardoel boven de spaarruimte geeft "Je wil € X sparen maar houdt € Y over".
- **Standaardvoorstel (Haider):** als de gebruiker geen uitgaven invult, stelt de app `spaardoel = 20 % van inkomen_maand`, afgerond op € 10, voor als schatting (zekerheid 2). De gebruiker past het aan of bevestigt het.

### 5.2 Periode
- **Primaire loondag:** de vaste loondag van het grootste maandelijkse inkomen met een vaste loondag-regel. Alleen die stuurt de loondag-strook, de periode en de pushmelding. Andere inkomens tellen enkel mee in de maandtotalen.
- **Periode:** van de laatste primaire loondag (vandaag inbegrepen) tot de dag vóór de volgende. Zonder vaste loondag: de kalendermaand.
- Periode 0 is de lopende periode, periode 1 de volgende, enzovoort. De "maand" van een periode is de kalendermaand waarin ze begint.

### 5.3 Verdeling over doelen (per periode)
Invoer: het beschikbare bedrag `A`, het noodfonds `E`, de andere actieve doelen (niet vol, niet gearchiveerd) en `noodfonds_aandeel` (0 tot 100 %). Een doel is **vol** als saldo ≥ doelbedrag.

1. **Noodfonds eerst:** is `E` niet vol, dan krijgt het `min(floor(A × aandeel / 100), resterend_E)`.
2. **Doelen met deadline** (niet het noodfonds), gesorteerd op deadline, dan prioriteit, dan aanmaakdatum, dan id:
   `nodig = min(resterend, ceil_op_100_cent(resterend / maanden_over))`; het doel krijgt `min(nodig, A)` (gedeeltelijk mag).
   `maanden_over` = aantal kalendermaanden van de maand van de periode tot en met de deadlinemaand, minimaal 1. Een voorbije deadline vraagt dus het volledige restbedrag nu.
3. **Doelen zonder deadline** (niet het noodfonds) verdelen de rest volgens hun gewicht (`weight ≥ 1`), elk begrensd op wat het nog nodig heeft.
4. Wat dan nog overblijft gaat naar de **doelen met deadline**, sneller dan nodig, in dezelfde volgorde, begrensd.
5. Wat dan nog overblijft gaat naar het **noodfonds**, ook als dat vol is ("buffer"). Het noodfonds is het enige doel dat boven zijn doelbedrag mag gaan.

### 5.4 Vooruitrekenen (projectie)
- Periode per periode vanaf de huidige saldi. Horizon: `max(120, maanden tot de laatste deadline)`, maximaal 480 (40 jaar).
- Periode 0 krijgt `max(0, spaardoel - al geboekte stortingen deze periode)`; volgende perioden krijgen het volle `spaardoel_maand`.
- Eenmalig inkomen (`yearly` in zijn maand, `once` op zijn datum, nooit vóór de lopende periode) telt mee als `include_one_off_income` aan staat: het volle bedrag komt bij het spaardoel van die periode en wordt volgens 5.3 verdeeld.
- **Wisselend inkomen:** heeft een inkomen `variability = variable`, dan gebruikt de projectie standaard het lage bedrag (`income_mode = careful`); de gebruiker kan `normal` kiezen. Dit verandert alleen iets als het spaardoel de spaarruimte volgt.
- Uitvoer per doel: de **vulmaand** (de periode waarin het vol raakt), "al vol" of "niet binnen de horizon".
- **Status van een doel met deadline**, afgeleid uit de projectie:
  - `op schema`: vol uiterlijk in de deadlinemaand, ook met 10 % minder sparen per maand;
  - `krap`: vol uiterlijk in de deadlinemaand, maar met 10 % minder sparen niet meer;
  - `niet haalbaar`: vol na de deadlinemaand of niet binnen de horizon. De app toont het kleinste aantal hele euro's extra per maand waarmee het wel lukt (binair zoeken, de projectie is goedkoop).
  Doelen zonder deadline krijgen geen status, alleen een vulmaand.
- **Effect van een nieuw of gewijzigd doel:** de projectie vóór en na de wijziging, met per ander doel hoeveel maanden de vulmaand verschuift ("Laptop schuift 3 maanden op, van mei naar aug 2027"). Je ziet dit als preview voor je opslaat.

### 5.5 Simulator
Drie schuifregelaars, alleen voor "wat als": sparen per maand (standaard "volgt je spaarruimte"), extra inkomen per maand, en extra uitgaven per maand. De uitkomst is de projectie uit 5.4 met die aanpassingen. "Zo instellen" schrijft alleen `plans.monthly_savings_cents` en `income_mode` weg. Echt inkomen en echte uitgaven pas je aan in Meer.

### 5.6 Loondag
Regels voor een maandelijks inkomen: `day_of_month` (1 tot 31) of `last_working_day`. Wekelijks of tweewekelijks inkomen heeft een weekdag maar geen loondagmelding in fase 1. Een inkomen kan ook `irregular` zijn (geen loondag).
- Eerst afkappen op de laatste dag van de maand (31 in februari wordt 28 of 29), dan pas het weekend verschuiven.
- Valt de dag in een weekend, dan geldt de werkdag ervoor (standaard) of erna (instelbaar). "Erna" mag nooit in de volgende maand vallen; dan geldt toch "ervoor". Zo heeft elke maand precies één loondag.
- `shortcut: Belgische feestdagen worden niet meegerekend; toevoegen als een gebruiker een verkeerde melding krijgt.`

### 5.7 Zekerheid
Elke getoonde waarde of elk advies kan een zekerheid dragen: `{ niveau: 1..5, reden: string }`. In de UI: een kleine balk van 5 stappen plus het label in tekst, nooit alleen kleur. We tonen geen percentage, omdat een percentage van een taalmodel niet betrouwbaar is; 5 stappen met een reden zijn eerlijker.

| Niveau | Label | Wanneer |
|---|---|---|
| 5 | zeker | jouw eigen, bevestigde invoer |
| 4 | vrij zeker | berekend uit jouw invoer |
| 3 | laten nakijken | een regel of wettelijk feit dat kan veranderen |
| 2 | schatting | een bedrag dat jij of de app als schatting markeert |
| 1 | gok | geen bron, alleen een richtwaarde |

Regels: een berekening krijgt het laagste niveau van haar invoer (de zwakste schakel), maximaal 4. Een mening of advies van de AI (fase 2) krijgt maximaal 2, tenzij het steunt op een berekening van `src/domain`; dan maximaal 4.

### 5.8 Checklist met vaste regels
Elke regel heeft een sleutel, een voorwaarde op benoemde data, een titel, urgentie (`week`, `month`, `later`) en zekerheid. Bedragen en datums in de titel worden **bij het tonen** berekend, zodat ze nooit verouderen. Regels draaien na de onboarding en na elke wijziging aan inkomen, uitgaven, plan of doelen. Een open regel-item waarvan de voorwaarde niet meer geldt, wordt verwijderd. Afgevinkte en weggeklikte items blijven bewaard, zodat dezelfde sleutel niet terugkomt.

| Sleutel | Voorwaarde | Titel | Urgentie | Zekerheid |
|---|---|---|---|---|
| `deposit:<periodestart>` | bedrag uit 5.3 voor deze periode, min al geboekte stortingen, > 0 | Zet € X opzij op [loondag] | week | 4 |
| `negative_budget` | spaarruimte < 0 | Je geeft meer uit dan je verdient: kijk je vaste kosten na | week | 4 |
| `over_target` | ingevuld spaardoel > spaarruimte | Je wil € X sparen maar houdt € Y over | week | 4 |
| `standing_order` | eenmalig na de onboarding | Zet een automatische overschrijving klaar op je loondag | month | 4 |
| `goal_unreachable:<doel>` | status `niet haalbaar` | Spaar € X meer per maand of verschuif de deadline van [doel] | month | 4 |
| `estimate:<doel>` | doelbedrag is een schatting | Zoek de echte prijs van [doel] op | later | 2 |
| `ziekenfonds` | `prefs.first_job = true` | Sluit aan bij een ziekenfonds als titularis | month | 3 |
| `student_hours` | een inkomen van type `student` | Hou je studentenuren bij: studentenarbeid heeft een jaarlimiet | month | 3 |
| `side_income_tax` | een inkomen van type `side` | Zet een deel van je bijverdienste opzij voor belasting | month | 3 |
| `no_interest` | `prefs.no_interest_savings = true` | Kies een spaarpot zonder rente bij je bank | month | 3 |

Items die de gebruiker zelf maakt (bv. "Stage vinden" uit onboarding stap 7) hebben `source = 'user'` en geen sleutel.

### 5.9 Uitgewerkte voorbeelden (elke rij is een test)
Lopende periode = november 2026, nog niets gestort. "Nood" = noodfonds. Bedragen in euro.

| # | Invoer | Eerste periode | Vulmaand |
|---|---|---|---|
| 1 | spaardoel 500, aandeel 100 %, Nood 0/1.500, Reis 0/1.000 | Nood 500, Reis 0 | Nood jan 2027, Reis mrt 2027 |
| 2 | als 1, aandeel 50 % | Nood 250, Reis 250 | Reis feb 2027, Nood mrt 2027 |
| 3 | spaardoel 500, Nood vol (1.500/1.500), Laptop 0/1.200 deadline jan 2027, Reis 0/1.000 | Laptop 400, Reis 100 | Laptop jan 2027 (`op schema`), Reis mrt 2027 |
| 4 | spaardoel 500, Nood vol, Laptop 0/1.200 deadline nov 2026 | Laptop 500 | Laptop jan 2027 (`niet haalbaar`, € 700 per maand extra nodig) |
| 5 | spaardoel 0, Nood 0/1.500, Reis 0/1.000 | niets | beide "niet binnen de horizon" |
| 6 | spaardoel 300, Nood vol, A 0/1.000 gewicht 2, B 0/1.000 gewicht 1 | A 200, B 100 | A mrt 2027, B mei 2027 |
| 7 | loondag dag 31, februari 2027 | | 28 feb is een zondag, dus vrijdag 26 feb 2027 (ook bij "erna") |
| 8 | loondag laatste werkdag, oktober 2026 | | 31 okt is een zaterdag, dus vrijdag 30 okt 2026 |
| 9 | inkomen wisselend, normaal 1.200, laag 800, uitgaven 700, spaardoel volgt spaarruimte | spaardoel 100 (voorzichtig) of 500 (normaal) | |

Deze voorbeelden zijn nagerekend met een prototype van de regels in 5.3 en 5.4.

## 6. Datamodel (Supabase)

Algemeen:
- Elke tabel heeft `user_id uuid not null references auth.users on delete cascade` (behalve `profiles`, waar `id` de user is), RLS aan en een index op `user_id`. Bedragen zijn `bigint` in centen.
- Rechten: eerst `revoke all on <tabel> from anon, authenticated`, dan aan `authenticated` alleen wat nodig is. `service_role` (alleen op de server) krijgt alle rechten, want nieuwe Supabase-projecten geven die niet meer automatisch.
- RLS-beleid: `to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)`; voor `profiles` met `id` in plaats van `user_id`.
- CHECK-constraints op elke enum, elk bedrag (`between -100000000000 and 100000000000`), elke tekst (namen ≤ 80 tekens, notities ≤ 200, uitleg ≤ 1.000, `context_note` ≤ 2.000) en de grootte van `prefs` (< 8 kB). Zo kan niemand via de API de gratis database van 500 MB volschrijven of de cron laten crashen.

| Tabel | Kolommen (belangrijkste) |
|---|---|
| `profiles` | `id` (= auth user), `username` (uniek, niet wijzigbaar), `display_name`, `locale` (`nl-BE`), `currency` (`EUR`), `timezone` (`Europe/Brussels`), `onboarding_step`, `onboarding_completed_at`, `prefs jsonb` (`no_interest_savings`, `show_basmala`, `first_job`, `palette`, `theme`, `context_note`), `created_at` |
| `plans` | `user_id` (pk), `monthly_savings_cents` (null = volgt spaarruimte), `emergency_share_pct` (0-100, standaard 100), `income_mode` (`careful`/`normal`), `include_one_off_income`, `updated_at` |
| `income_sources` | `id`, `name`, `kind` (`salary`/`side`/`student`/`benefit`/`allowance`/`other`), `frequency` (`monthly`/`weekly`/`biweekly`/`yearly`/`once`), `amount_cents`, `amount_low_cents` (bij wisselend), `variability` (`fixed`/`variable`), `month` (bij yearly), `date` (bij once), `payday_rule jsonb` (`{type: day_of_month, day, weekend: before/after}`, `{type: last_working_day}`, `{type: weekday, weekday}` of `{type: irregular}`), `is_estimate`, `active` |
| `budget_lines` | `id`, `kind` (`fixed`/`living`/`free`), `category`, `name`, `amount_cents`, `is_estimate`, `sort` |
| `goals` | `id`, `kind` (`emergency`/`savings`/`trip`/`purchase`/`other`), `name`, `target_cents` (verplicht, > 0), `target_is_estimate`, `deadline` (optioneel), `priority` (smallint, 1 = hoogst), `weight` (≥ 1, standaard 1), `is_main` (bool), `status` (`active`/`archived`), `color_token`, `created_at`; uniek (`id`, `user_id`); hoogstens één `emergency` en één `is_main` per gebruiker (partiële unieke index) |
| `transactions` | `id`, `goal_id`, `amount_cents` (positief = storting, negatief = opname), `occurred_on`, `note`, `source` (`manual`/`start`/`import`/`ai`), `created_at`; foreign key (`goal_id`, `user_id`) → `goals(id, user_id)` on delete cascade, zodat niemand op het doel van een ander kan boeken |
| `checklist_items` | `id`, `rule_key` (uniek per gebruiker, optioneel), `title`, `body`, `urgency`, `due_on`, `certainty_level`, `certainty_reason`, `source` (`rule`/`user`/`ai`), `done_at`, `dismissed_at` |
| `push_subscriptions` | `id`, `endpoint` (uniek, https en op een bekende push-host: `fcm.googleapis.com`, `*.push.apple.com`, `updates.push.services.mozilla.com`, `*.notify.windows.com`), `p256dh`, `auth`, `user_agent`, `created_at`, `last_success_at`, `failure_count` |
| `notification_log` | `id`, `kind` (`payday`), `for_date`, `created_at`; uniek (`user_id`, `kind`, `for_date`) |
| `admin_audit` | `id`, `admin_id`, `target_user_id`, `action`, `created_at`; alleen `service_role` heeft toegang |

- Saldo van een pot = som van zijn transacties (view `goal_balances`, `security_invoker = true`, `select` voor `authenticated`).
- "Vol" wordt afgeleid (saldo ≥ doelbedrag); `status` kent alleen `active` en `archived`.
- Een opname groter dan het saldo wordt geweigerd in de server action. Een pot met saldo archiveren kan pas na een opname of verschuiving naar een andere pot.
- **Registratie-trigger:** een functie in een apart schema `private`, `security definer set search_path = ''`, maakt bij een nieuwe auth-user een `profiles`-rij (username = deel vóór de `@` van het e-mailadres) en een `plans`-rij. Het noodfonds komt pas bij het afronden van de onboarding (§8.2).
- Kolomrechten: `authenticated` mag `profiles.username` niet wijzigen.

## 7. Login en accounts

- **Registreren** gebeurt in een server action:
  1. `SIGNUP_MODE` controleren (`closed` blokkeert, `invite` vraagt `INVITE_CODE`).
  2. Gebruikersnaam valideren: 3-20 tekens, `a-z 0-9 . _ -`, begint en eindigt met een letter of cijfer, geen twee punten na elkaar, wordt lowercase. Wachtwoord minimaal 10 tekens.
  3. Maximaal 5 nieuwe accounts per uur voor de hele app (geteld in `profiles`).
  4. `auth.admin.createUser({ email: <gebruikersnaam>@<NEXT_PUBLIC_AUTH_EMAIL_DOMAIN>, password, email_confirm: true })` met de secret key.
  5. De browser logt daarna in.
  Publieke registratie via Supabase staat **uit** (`enable_signup = false`), zodat niemand de app kan omzeilen met de publieke key. De schakelaar werkt dus echt.
- **Inloggen** gebeurt in de browser met `signInWithPassword`, zodat de limiet van Supabase per IP per gebruiker geldt in plaats van voor heel Vercel samen.
- **Wachtwoord vergeten:** er is geen e-mail. De gebruiker vraagt het aan Zayd (die checkt wie het is, bv. via WhatsApp). `/beheer` (alleen voor `ADMIN_USER_IDS`, gecontroleerd op de pagina én in elke actie) maakt een willekeurig tijdelijk wachtwoord dat één keer getoond wordt, zet `app_metadata.must_change_password = true` en schrijft een regel in `admin_audit`. `proxy.ts` stuurt zo iemand naar `/wachtwoord-wijzigen` tot het gewijzigd is.
- **Later echte e-mail:** eigen SMTP instellen, "Secure email change" uitzetten, en een stap "voeg je e-mailadres toe". Inloggen zoekt dan via `profiles` het echte e-mailadres op bij de gebruikersnaam. Geen datamigratie nodig.
- **Sessie:** `proxy.ts` ververst de sessie met `getClaims()` en stuurt bezoekers zonder sessie naar `/inloggen`, behalve op deze publieke paden: `/inloggen`, `/registreren`, `/privacy`, `/api/cron/*`, `/manifest.webmanifest`, de iconen, de service worker en `/_next/*`.
- **Uitloggen** zegt ook het pushabonnement van dit toestel op en wist de rij, zodat op een gedeeld toestel de volgende gebruiker geen meldingen van de vorige krijgt.
- **Account wissen:** in Meer, met je wachtwoord opnieuw invullen. Wist de auth-user; alle tabellen volgen via `on delete cascade`.
- **Gegevens downloaden:** één JSON-bestand met de eigen rijen uit `profiles`, `plans`, `income_sources`, `budget_lines`, `goals`, `transactions`, `checklist_items` en `push_subscriptions`.
- **Captcha** (Cloudflare Turnstile, gratis in Supabase) gaat aan **voor** de AI live gaat in fase 2.

## 8. Schermen en flows

### 8.1 Navigatie
Onderaan: Overzicht, Doelen, middenknop, Plan, Meer. In fase 1 is de middenknop "Storten"; in fase 2 wordt het de AI ("Vraag"). De layout verandert dus niet als de AI komt.

### 8.2 Onboarding (8 stappen, elke stap overslaanbaar, voortgang bewaard in `onboarding_step`)
1. **Welkom:** naam waarmee de app je aanspreekt.
2. **Inkomen:** netto per maand, week of twee weken; vast of wisselend (dan ook een laag bedrag); loondag-regel. Vinkje "Dit is mijn eerste job". Extra inkomen toevoegen (bijberoep, flexi, studentenjob, zakgeld).
3. **Eenmalig inkomen:** 13de maand, vakantiegeld, belastingteruggave (optioneel, als schatting).
4. **Vaste kosten:** keuzeknoppen voor veelvoorkomende kosten (huur, gsm, verzekering, abonnementen, bijdrage thuis, lening) met een bedrag; eigen kosten toevoegen.
5. **Leven, vrije tijd en sparen:** budget voor eten, vervoer, uitgaan en hobby's. Daaronder het bedrag dat overblijft, als bewerkbaar veld "Dit wil ik sparen" (vooraf ingevuld met de spaarruimte, of het standaardvoorstel uit 5.1).
6. **Wat je al hebt:** huidig spaargeld en je noodfonds. Voorstel doelbedrag = 3 × uitgaven per maand (vast + leven + vrij), aanpasbaar. Bestaand spaargeld wordt een transactie `Startsaldo` op het noodfonds, tot het doelbedrag; wat erboven ligt, kan je in stap 7 over je doelen verdelen.
7. **Doelen:** voorbeeldkaarten (reis, rijbewijs, laptop, auto, huwelijk, Hajj, "iets anders"). Elke kaart heeft een standaardbedrag als schatting (bv. rijbewijs € 1.500, laptop € 1.000) voor wie "weet ik nog niet" kiest. De kaart "Stage vinden" maakt een checklist-item, geen pot. Het eerste doel dat je toevoegt wordt je hoofddoel. Heeft een doel een deadline, dan vraagt de app: "Noodfonds eerst helemaal vullen, of tegelijk met je doelen?" (100 % of 50 %). Daarna een preview van de tijdlijn.
8. **Voorkeuren en installeren:** kleurpalet (Oceaan, Salie of Grafiet, met een klein voorbeeld), sparen zonder rente, persoonlijke elementen (optioneel, alleen bewaard als je het aanzet), en een tekstveld "Wat moet de app nog over jou weten?" (vakantiedagen, hobby's, plannen; bewaard in `prefs.context_note`, in fase 1 nog niet gebruikt in berekeningen). Dan de uitleg om de app op je beginscherm te zetten (iOS en Android apart), met: "Je logt één keer opnieuw in in de geïnstalleerde app."

Na stap 8: het noodfonds-doel wordt aangemaakt (als stap 6 overgeslagen is: doelbedrag 3 × uitgaven, of € 1.000 als er geen uitgaven zijn, als schatting), de regels uit 5.8 maken de checklist, en de gebruiker komt op het overzicht.

### 8.3 Overzicht
Zoals de mockup (richting A), van boven naar onder:
- groet en datum;
- loondag-strook, verborgen als er geen vaste loondag is;
- meldingenkaart (zie §9);
- hoofddoel: het doel met `is_main`, anders het noodfonds. Krijgt het deze periode niets, dan staat er waarom ("Krijgt nu nog niets: eerst je noodfonds, vol rond maart 2027");
- verdeling van je loon (gestapelde balk en tabel met totaal);
- potten, elk met de vulmaand;
- simulator;
- de 3 dringendste checklist-items.

### 8.4 Doelen
Lijst van potten met saldo, voortgang en vulmaand. Volgorde aanpasbaar (prioriteit). Detail: saldo, doel, deadline, status, geschiedenis van stortingen, knoppen Storten, Opname, Aanpassen, Als hoofddoel instellen en Archiveren ("Ongedaan maken" binnen 8 seconden). Het noodfonds kan je niet archiveren. Nieuw of aanpassen: formulier met de effect-preview uit 5.4.

### 8.5 Storten
Snelle flow vanuit de pushmelding: "Hoeveel zette je opzij?", per pot vooraf ingevuld met de verdeling van deze periode min wat al geboekt is. Eén tik op "Opslaan" boekt alles. Ook een losse storting of opname per pot.

### 8.6 Plan
Tijdlijn: per doel de vulmaand, als lijst met mijlpalen. Checklist gegroepeerd per urgentie, afvinken en wegklikken, eigen item toevoegen.

### 8.7 Meer
Profiel, inkomen, uitgaven, plan (spaardoel of "volgt mijn spaarruimte", noodfonds-aandeel, voorzichtig of normaal, eenmalig inkomen meetellen), "Wat de app over je weet" (de context-tekst), kleurpalet (Oceaan, Salie, Grafiet) en thema (licht/donker/systeem), meldingen, app installeren, privacy, gegevens downloaden, account wissen, uitloggen.

### 8.8 Lege, laad- en foutstaten
- Laden: de echte layout met grijze blokken op ware grootte, zonder shimmer.
- Fout: in de kaart zelf, met wat misging en een knop "Opnieuw proberen".
- Leeg: één zin en één actie (bv. "Nog geen doelen. Maak je eerste doel.").

## 9. Pushmelding op loondag

- `vercel.json` plant een cron (Hobby: 1 keer per dag, ± 59 minuten precisie) om 06:00 UTC naar `/api/cron/loondag`. De route vergelijkt `CRON_SECRET` met `timingSafeEqual` en weigert anders.
- De route doet elke dag eerst een lichte databasequery (houdt het gratis project actief; geen garantie, de pauze-mail van Supabase blijft de terugval).
- Daarna, per gebruiker in een eigen `try/catch` (ongeldige tijdzone valt terug op `Europe/Brussels`): is vandaag in zijn tijdzone de primaire loondag, of was het gisteren en is er nog geen log, dan:
  1. **eerst claimen:** `insert into notification_log ... on conflict do nothing returning id`;
  2. alleen als er een rij terugkomt, de melding sturen naar elk abonnement ("Loondag! Vul in wat je opzijzette.", link naar `/storten`), met een time-out per verzoek.
  Zo vertrekt een melding nooit dubbel, en vangt de dag erna één mislukte cron op.
- Abonnementen die 404 of 410 terugsturen, worden gewist; andere fouten verhogen `failure_count`, na 5 fouten wordt het abonnement gewist.
- **Abonneren:** de server action wist eerst (met de admin-client) een bestaande rij met dezelfde endpoint, en voegt dan de nieuwe toe.
- **iOS:** werkt alleen als de app op het beginscherm staat (iOS 16.4+). Op het overzicht verschijnt een kaart "Meldingen aanzetten" als de app als geïnstalleerde app draait (`display-mode: standalone`), toestemming nog niet gevraagd is en dit toestel geen abonnement heeft. Toestemming wordt gevraagd binnen de tik op de knop.
- **Service worker:** `src/lib/service-worker.js`, geregistreerd met `new URL(..., import.meta.url)` en `scope: '/'`, zoals de Next.js 16.4 PWA-gids. Doet alleen push en het openen van `/storten`. Geen offline-cache in fase 1.

## 10. Design

### 10.1 Richting
Richting **A (zacht en warm)** als basis: ronde kaarten (radius 20-28 px), witte vlakken op een zachte achtergrond, Gabarito voor koppen en bedragen, Figtree voor tekst.
Bedragen zoals richting **B**: altijd tabelcijfers (`tabular-nums`), formaat `€ 1.240,00`, in lijsten rechts uitgelijnd in een vaste kolom met een totaalrij.
**Palet: de gebruiker kiest zelf** uit drie paletten (canvas "Spaarplanner stijlrichtingen", tweede rij): **Oceaan** (standaard; lichte blauwgrijze achtergrond, kobaltblauw), **Salie** (salie-grijze achtergrond, dennengroen) en **Grafiet** (neutraal grijs, zwarte knoppen, violet voor voortgang). De keuze staat in `prefs.palette` en wordt toegepast met `data-palette` op `<html>`, zonder flits bij het laden. Omdat Grafiet zwarte knoppen en een violette voortgang heeft, zijn de tokens gesplitst in `action` (knoppen) en `progress` (voortgang en actieve tab). Alle kleuren staan als tokens in `globals.css` en in `DESIGN.md`; een palet toevoegen is één blok tokens.
**Donker thema:** afgeleid van de grijstinten van B (achtergrond #0f0f10, vlakken tot #2e2e33, tekst #ededee en #b4b4b4, gedempte tekst #9a9a9a zodat ook die 4,5:1 haalt), met het accent van het gekozen palet.

### 10.2 Regels (uit de design-skills, samengevat)
- Eén hoofdcijfer per scherm (32 px), andere cijfers 20-24 px.
- Spatiëring op een raster van 4 px, zijmarge 16 px (20 px vanaf 400 px breed).
- Contrast minstens 4,5:1 voor alle tekst, ook kleine grijze labels; een unittest controleert de tokenparen. Betekenis nooit alleen met kleur.
- Eén accentkleur, alleen voor de hoofdactie, voortgang en de actieve tab. Statuskleuren (goed, waarschuwing, fout) staan los van het accent.
- Geen verlopen, glaseffect, gloed, emoji of gekleurde rand links op kaarten.
- Beweging: één easing `cubic-bezier(0.2, 0, 0, 1)`, duur 120 / 200 / 320 ms, alleen voor feedback en overgangen. Met `prefers-reduced-motion` alleen directe veranderingen.
- Formulieren: `inputmode="decimal"`, komma en punt allebei toegestaan, labels altijd zichtbaar, € als vast voorvoegsel.
- Tekst: Nederlands, "je", zinsbegin met hoofdletter, knoppen zeggen wat ze doen ("Pot opslaan").
- Toetsenbord en schermlezer: echte knoppen en links, zichtbare focusring, zoomen nooit blokkeren, de lettergrootte van het toestel volgen.
- Lettertypes via `next/font/google`: bij de build gedownload en zelf geserveerd, dus geen verzoeken naar Google bij gebruik.

### 10.3 Componenten die fase 1 nodig heeft
`Money`, `CertaintyMeter`, `ProgressBar`, `StackedBar`, `PaydayStrip`, `PushCard`, `GoalCard`, `GoalForm` (met effect-preview), `Simulator`, `PalettePicker`, `ChecklistItem`, `BottomNav`, `OnboardingStep`, `InstallGuide`, plus de shadcn-primitives.

## 11. Automatisering

| Wat | Hoe | Eenmalige stap door Zayd |
|---|---|---|
| Code | GitHub-repo `zaydmaadal/spaarplanner` (privé) | Repo aanmaken en de Claude GitHub App toegang geven (de koppeling in deze sessie kreeg `403 Resource not accessible by integration` bij `create_repository`) |
| Database | Supabase-project "spaarplanner" in Frankfurt, aangemaakt via de Supabase-koppeling | 3 instellingen in het Supabase-dashboard aanzetten (lijst volgt bij de eerste deploy): publieke registratie uit, minimale wachtwoordlengte 10, auth-auditlogs niet in de database |
| Hosting | Vercel-project gekoppeld aan de repo; env-variabelen via de Vercel-koppeling gezet, geheimen alleen voor Production | Misschien de Vercel GitHub App toegang geven tot de repo |
| Migraties | `scripts/vercel-build.sh`: alleen bij een productiebuild eerst `supabase db push`, dan `next build`. Mislukt de migratie, dan faalt de build en blijft de vorige versie live. Previews migreren nooit. Migraties zijn altijd uitbreidend (eerst toevoegen, later pas opruimen), zodat oude code en previews blijven werken. | Geen |
| Checks | `ci.yml` bij elke pull request, zonder geheimen: lint, typecheck, Vitest, lokale Supabase in Docker met RLS-tests, build (env uit `supabase status -o env`, wegwerp-VAPID en -CRON_SECRET), Playwright op gsm-formaat | Geen. Branch protection op `main` als je GitHub-plan het toelaat (voor privérepo's vraagt dat GitHub Pro) |
| Advisors | Na elke migratie draait de agent de Supabase security- en performance-advisors (via de Supabase-koppeling); alleen de waarschuwing over leaked-password-bescherming (vraagt Pro) mag openstaan | Geen |
| Backups | `backup.yml`: elke zondag rollen, schema en data dumpen (`supabase db dump --role-only`, standaard, `--data-only --use-copy`), rechtstreeks versleuteld met `gpg --symmetric` (AES256), 90 dagen bewaard als artefact. Eén keer per maand handmatig terugzetten in de lokale database ter controle. | Secrets `SUPABASE_DB_URL` en `BACKUP_PASSPHRASE` toevoegen, en de passphrase ook offline bewaren |
| Design-skills | Nagelezen kopieën in `.claude/skills/` (bijlage A) | Geen |
| Werkwijze agent | `CLAUDE.md` met regels om tokens te sparen: kort houden, documentatie opzoeken in plaats van plakken, een goedkoper model voor mechanische subtaken, plantaken van één sessie, grote bestanden niet opnieuw lezen | Geen |

Bekende risico's:
- Previews gebruiken dezelfde database als productie, want het gratis plan laat maar 2 actieve projecten toe (Easy2Move is het andere). Previews krijgen daarom geen geheimen: registreren en de cron werken er niet, inloggen en gewoon gebruik wel. E2e-tests draaien nooit tegen de echte database, alleen tegen een lokale Supabase in CI.
- Repository-secrets zijn leesbaar voor iedereen met schrijfrechten op de repo (nu alleen Zayd en de Claude GitHub App).

## 12. Beveiliging en privacy

- RLS op elke tabel, getest met pgTAP: gebruiker A kan van gebruiker B niets lezen, wijzigen of wissen, en kan niet boeken op het doel van B.
- De secret key bestaat alleen op de server (`import 'server-only'`) en alleen in Production.
- Server actions valideren elke invoer met Zod en halen de gebruiker uit de sessie, nooit uit de invoer. De database heeft daarnaast CHECK-constraints (§6), want gebruikers kunnen de API ook rechtstreeks aanspreken.
- Beveiligingsheaders via `proxy.ts`: Content-Security-Policy met een nonce en `frame-ancestors 'none'`, `connect-src` beperkt tot de eigen site en Supabase, HSTS, `Referrer-Policy: strict-origin-when-cross-origin`.
- Data: Supabase in Frankfurt en Vercel-functies in `fra1`. Wel Amerikaanse bedrijven als verwerker: Vercel (hosting), GitHub (code en versleutelde backups) en de pushdiensten van Google, Apple en Mozilla (alleen de melding, geen financiële gegevens).
- Geen analytics of tracking in fase 1.
- De app vraagt nooit naar geloof of gezondheid. Persoonlijke elementen zijn optioneel en worden alleen bewaard als je ze aanzet.
- **Privacypagina** (`/privacy`, publiek): wie verantwoordelijk is (Zayd), welke gegevens, welke verwerkers, bewaartermijn (backups 90 dagen), en hoe je je gegevens downloadt of wist.
- Wachtwoorden: minimaal 10 tekens. Leaked-password-bescherming vraagt Supabase Pro; aanzetten bij de overstap.

## 13. Testen

| Laag | Tool | Wat |
|---|---|---|
| Domein | Vitest, test-first | Alle voorbeelden uit §5.9, plus: verdeling met restcenten, effect-preview, status `krap`, extra bedrag per maand, periodes, wekelijks inkomen, zekerheid (zwakste schakel), checklist-regels per sleutel, één test per persona (seed) |
| Database | pgTAP via `supabase test db` | RLS per tabel, samengestelde foreign key op transacties, registratie-trigger, unieke sleutels, CHECK-constraints, cron-query als `service_role` |
| Server actions en routes | Vitest | Validatie en foutpaden; de cron-route met een vaste klok en een nagebootste `web-push`: dubbele run stuurt één melding, 410 wist het abonnement, gisteren-zonder-log wordt ingehaald |
| Tokens | Vitest | Contrast van alle tekst- en achtergrondparen in licht en donker ≥ 4,5:1 |
| End-to-end | Playwright op gsm-formaat (iPhone en Pixel), tegen lokale Supabase | Registreren (ook met `SIGNUP_MODE=closed`), onboarding, storting, doel toevoegen met preview, uitloggen, account wissen; het manifest en de cron-route zijn bereikbaar zonder sessie |
| Toegankelijkheid | axe in Playwright | Geen ernstige fouten op elke pagina |
| Productie | Rooktest na de eerste deploy | Een wegwerpaccount registreren, inloggen en wissen (controleert ook dat Supabase het interne e-mailadres aanvaardt; zo niet, een A- of MX-record op `u.zaydmaadal.site` zetten) |

Bij tests met bedragen: vergelijk met strings met een harde spatie (`'€ 1.240,00'`).

## 14. Wat later komt, en hoe fase 1 daar al klaar voor is

**Fase 2, AI-chat**
- Een route `/api/chat` met AI SDK 7 `streamText` en tools zoals `createGoal`, `updateGoal`, `addTransaction`, `addBudgetLine`, `addChecklistItem` en `simulate`.
- Elke tool die iets wijzigt, vraagt eerst bevestiging (`toolApproval: 'user-approval'`) en toont een voorstelkaart met het verschil. Bevestigen roept **dezelfde server actions** aan als de gewone UI. De AI rekent nooit zelf: `simulate` roept `src/domain` aan.
- Geen volzinnen nodig: voorstel-knoppen onder het invoerveld ("Nieuw doel", "Kost toevoegen", "Wat als ik minder spaar?") en korte fragmenten zijn genoeg.
- Een "widget" is een doelkaart (later ook een reiskaart). Op elke kaart komt "Aanpassen met AI", dat de chat opent met die kaart als context. Er komt geen apart dashboard-model.
- **Model:** `anthropic/claude-haiku-5.5` via de AI Gateway met `disallowPromptTraining` en EU-regio. Het valt binnen het gratis maandtegoed van $5 (± 7.000 berichten). De test met 20-30 vaste voorbeelden vergelijkt het met minstens één model dat gratis is.
- **Eigen AI koppelen (BYOK):** niet in fase 2. Een eigen sleutel via de Gateway vraagt gekocht tegoed, en daarmee vervalt het gratis tegoed. Een ChatGPT- of Claude-abonnement geeft geen API-toegang. Heroverwegen bij verkoop.
- **Limieten:** maximaal een aantal berichten per gebruiker per dag en een maandbudget; foutcodes 402, 403 en 429 netjes tonen. Captcha bij registratie aan.
- **Nieuwe tabellen:** `conversations`, `messages`, `ai_usage`, `user_context`.
- **Memory-import:** tekst plakken of een `.txt`/`.md`-bestand kiezen (in de browser gelezen), met uitleg per AI-dienst; bereikbaar vanuit Meer en een onboardingstap. De AI maakt er een korte samenvatting van die de gebruiker kan aanpassen. Alleen die samenvatting wordt bewaard (`user_context`, samen met `prefs.context_note`), de geplakte tekst niet.
- **Toon:** een instelling met 3 keuzes (eerlijk en kritisch als standaard, coach, kort en zakelijk), een stukje systeemprompt per keuze. Elke toon gaat mee in de vaste testset.
- **Spraak:** een microfoonknop met de Web Speech API, verborgen als de app als geïnstalleerde iOS-app draait (daar werkt spraakherkenning niet) of als het starten mislukt. Spraak via een server-transcriptiemodel is een latere optie, want die kost per gebruik.

**Fase 3, reisplanner**
Een reis is een doel van type `trip` met posten (vlucht, verblijf, activiteiten, eten, vervoer), elk met een bedrag en een vinkje "zeker" of "schatting". Het doelbedrag is de som. Tabel `trip_items`. De AI krijgt de tools `createTrip` en `addTripItem`; kies je "vakantie plannen", dan schakelt de chat naar een reismodus met velden per post. Ook de wekelijkse herinnering bij onregelmatig inkomen.

**Fase 4, bankdata**
Import van CSV (KBC, ING, Belfius, BNP Paribas Fortis) en XLSX (Revolut) naar een aparte tabel `bank_transactions`. Alleen herkende overschrijvingen naar de spaarrekening worden, na bevestiging, een transactie op een pot. Een PSD2-koppeling (Enable Banking) pas als dat nodig blijkt; GoCardless neemt geen nieuwe klanten meer aan.

**Product**
De laag `src/domain` is herbruikbaar in een gsm-app; meerdere talen kunnen later met een vertaalbibliotheek; betalingen via Stripe; Vercel Pro en Supabase Pro.

## 15. Kosten en limieten

| Dienst | Nu (familie, gratis) | Bij verkoop |
|---|---|---|
| Vercel | Hobby, gratis. Volgens de voorwaarden alleen niet-commercieel gebruik | Pro, $20 per maand |
| Supabase | Free: 500 MB database, 50.000 actieve gebruikers per maand, geen automatische backups (daarom `backup.yml`), pauze na 7 dagen zonder activiteit | Pro, $25 per maand, met dagelijkse backups |
| AI (fase 2) | $5 gratis tegoed per maand, betaalkaart nodig, ± 7.000 berichten | Per gebruik, ± $0,0007 per bericht |
| Domein | Optioneel; standaard de gratis `*.vercel.app` | Eigen domein |

## 16. Beslissingen

- Nieuwe privérepo, los van het portfolio.
- Fase 1 zonder AI.
- Richting A met bedragen zoals B; donker thema afgeleid van B; de gebruiker kiest zelf het palet (Oceaan, Salie, Grafiet), standaard Oceaan.
- Open registratie, met een schakelaar die ook Supabase dichtzet.
- Pushmelding op loondag in fase 1.
- Bedragen in centen, rekenregels als pure TypeScript.
- Design-skills als nagelezen tekstkopieën, niet via hun installers (voorgesteld in het gesprek en goedgekeurd met het ontwerp op 2026-10-21; zie bijlage A).
- Productiemigraties tijdens de Vercel-build, zodat alle geheimen in Vercel staan.

## 17. Open punten voor Zayd

1. Bij de eerste deploy: de 3 Supabase-instellingen uit §11 aanzetten, en de 2 backup-secrets in de GitHub-repo zetten (ik geef een stappenlijst).
2. Fase 2: een betaalkaart toevoegen in Vercel voor het AI-tegoed.

## 18. Wat de review veranderde

Vijf agents bekeken versie 1: dekking van je wensen, interne consistentie, beveiliging, technische juistheid, en een skepticus die de bevindingen toetste. Belangrijkste wijzigingen:
- Registratie loopt nu via de server met publieke registratie uit in Supabase; anders werkte de schakelaar niet.
- Beheer controleert onveranderlijke gebruikers-ID's in plaats van gebruikersnamen.
- De cron en de manifest staan op de publieke lijst van `proxy.ts`; anders liep de pushmelding nooit.
- `service_role` krijgt expliciet rechten (nieuwe Supabase-projecten geven die niet meer).
- Backups bevatten nu ook data en rollen, niet alleen het schema.
- De rekenregels zijn volledig vastgelegd (periode, restgeld, statussen, randgevallen) met uitgewerkte voorbeelden.
- Het spaarbedrag zit nu in de onboarding; het noodfonds ontstaat bij het afronden van de onboarding.
- Migraties lopen vóór de productiebuild, zodat nieuwe code nooit zonder haar schema live gaat.

## Bijlage A: tools en skills uit je lijst

| Tool | Oordeel | Reden |
|---|---|---|
| superpowers | gebruikt | brainstorm, spec, plan, test-first, review |
| ponytail | gebruikt | kleinste oplossing die werkt; regel in `CLAUDE.md` |
| frontend-design | gebruikt | bij de UI-taken |
| code-review, code-simplifier | gebruikt | bij elke pull request |
| addyosmani agent-skills | al bij jou geïnstalleerd | overlapt met superpowers; lokaal bruikbaar |
| motion-design (LottieFiles) | kopie in `.claude/skills` | zonder de regel over animaties die altijd op de achtergrond bewegen |
| web-design-guidelines (Vercel) | vaste kopie | het origineel haalt bij elk gebruik nieuwe regels van internet |
| impeccable | alleen de regels als tekst | de plugin draait na elke bestandswijziging een script, downloadt een programma en stuurt standaard gebruiksgegevens door |
| taste-skill | alleen de referentie voor app-schermen als tekst | de scripts schrijven buiten het project en contacteren beeldbanken |
| awesome-design-md | het formaat `DESIGN.md` overgenomen | geen bestand van een bestaand merk gekopieerd |
| Vercel-plugin en `npx skills` | Vercel-koppeling gebruikt; `npx skills` niet | het installatieprogramma stuurt standaard gebruiksgegevens door |
| Playwright (agent CLI) | Playwright gebruikt voor e2e | de agent-CLI is lokaal optioneel |
| context7, ui-ux-pro-max, claude-mem | niet in deze cloudsessie | lokaal bij jou bruikbaar; `CLAUDE.md` verwijst naar context7 voor documentatie |
| design-md-chrome | niet gebruikt | een Chrome-extensie; werkt niet in de cloud |
| img2threejs | niet nodig | 3D past niet bij een spaarapp |
| graphify | niet nodig | pas nuttig bij een grote codebase |
| OmniRoute | niet gebruikt | financiële gegevens zouden via extra partijen lopen, en het vraagt een eigen server |
