# Fase 1: open punten na livegang (22 oktober 2026)

Fase 1 staat live op https://spaarplanner.vercel.app (Vercel fra1, Supabase eu-central-1). Hieronder wat bewust is blijven liggen, en de belangrijkste beslissingen die tijdens de bouw zijn genomen.

## Nog te controleren

- Eerste run van de loondag-cron (dagelijks 06:00 UTC): runtime logs van `/api/cron/loondag` bekijken; een echte loondag-melding op je toestel ontvangen.
- Back-up terugzetten één keer proberen met de eerste echte back-up (README, "Restore").
- Productie-smoketest (`playwright.smoke.config.ts`) is nog niet gedraaid: de sandbox kon `vercel.app` niet bereiken. Draai hem lokaal met `SMOKE_BASE_URL=https://spaarplanner.vercel.app npx playwright test -c playwright.smoke.config.ts`.

## Beveiliging

- Wie een sessie steelt, kan via GoTrue (`PUT /auth/v1/user`) het wachtwoord wijzigen zonder het huidige. `secure_password_change` vraagt een e-mailcode, en de accounts hebben geen echt e-mailadres. Optie: die instelling aan, en wachtwoord wijzigen via de admin-API na controle van het huidige wachtwoord.
- Preview-deployments gebruiken de productiedatabase (registreren staat er dicht, er zijn geen servergeheimen). Voor echte previews is een aparte Supabase-branch nodig.

## Product

- Geen scherm met gearchiveerde doelen: terugzetten kan alleen via "Ongedaan maken" (8 seconden). Gearchiveerde doelen tellen mee voor het maximum van 50.
- Na een loondag-melding met een verlopen sessie kom je na inloggen op `/overzicht`, niet op `/storten`.
- De cron verstuurt meldingen na elkaar; bij honderden gebruikers op één dag parallel maken.
- Manifestkleuren zijn die van Oceaan, ook als je een ander palet kiest.

## Afwerking (klein)

- Focusring zonder offset op de knoppen in Grafiet (actiekleur is gelijk aan de inkt).
- PalettePicker heeft geen unit-test; `contrast.test.ts` dupliceert de paletlijst.
- Simulator: `aria-live` op de vulmaanden is wat spraakzaam.
- Doelformulier: geen test op het volledige formulier dat naar `saveGoalAction` gaat; het nieuw-doelformulier knippert even leeg na opslaan; twee snelle herschikkingen kunnen een verouderde volgorde sturen; geen hint bij archiveren van een pot met saldo.
- Stap 2: de optie "Loon" verdwijnt tot een herlaad als je een extra loon van soort wisselt.
- Uiterlijk: twee snel na elkaar mislukte opslagen kunnen het oude palet tonen terwijl het nieuwe is bewaard.
- "Vol" staat op drie plaatsen anders verwoord ("vol", "al vol").
- Tijdlijn in stap 7 houdt geen rekening met startgeld dat naar het hoofddoel gaat.
- Laadscherm toont de onderste navigatie niet; `(account)` en `/beheer` hebben geen eigen foutkaart.

## Belangrijkste beslissingen

- Een voorgesteld spaarbedrag wordt nooit opgeslagen; alleen een bedrag dat je zelf typt of met de schuif kiest.
- Stortingen hebben een `client_ref` en worden met "ignore duplicates" geschreven: dubbel tikken of opnieuw proberen boekt één keer.
- Startgeld boven het noodfonds gaat naar het hoofddoel uit stap 7 (tot het doelbedrag); de rest blijft ongeboekt.
- Op de instellingenpagina's wist een leeg bedrag een bestaande regel niet; verwijderen gaat met een eigen knop.
- Per gebruiker een maximum aantal rijen per tabel (10 toestellen, 50 doelen, 20.000 transacties, ...), zodat niemand de gratis database vult.
- Een admin-wachtwoordreset beëindigt alle bestaande sessies van die gebruiker (zo werkt GoTrue).
- De export bevat de pushsleutels van je toestellen niet.
- Maandnamen overal kort ("mrt 2027"), met `formatMonthNl`.
- Productie-deploys migreren de database in de build (`scripts/vercel-build.sh`); previews migreren nooit.
