import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy" };

const h2 = "font-display text-lg font-semibold";
const list = "flex list-disc flex-col gap-1.5 pl-5";
const link = "inline-flex min-h-11 items-center font-medium underline underline-offset-4";

// Spec 12: who is responsible, which data, which processors, how long, and how to download or delete.
export default function PrivacyPage() {
  return (
    <>
      <h1 className="font-display text-2xl font-semibold">Privacy</h1>
      <p>Spaarplanner is een kleine app van één persoon. Hier staat wat de app van je bewaart, waarom en bij wie.</p>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Wie is verantwoordelijk</h2>
        <p>
          Zayd Maadal maakt en beheert Spaarplanner en is verantwoordelijk voor je gegevens. Heb je een vraag of een klacht? Mail naar{" "}
          <a href="mailto:zayd.maadal@hotmail.com" className="underline underline-offset-4">
            zayd.maadal@hotmail.com
          </a>
          . Je kan ook een
          klacht indienen bij de Gegevensbeschermingsautoriteit.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Welke gegevens we bewaren</h2>
        <ul className={list}>
          <li>Je gebruikersnaam en je wachtwoord. Het wachtwoord is voor niemand leesbaar.</li>
          <li>De naam waarmee de app je aanspreekt.</li>
          <li>Je inkomen, je vaste kosten en je budget voor eten, vervoer en vrije tijd.</li>
          <li>Je spaardoelen, je stortingen en je opnames.</li>
          <li>Je checklist en je voorkeuren, zoals je kleurpalet en de tekst bij &bdquo;Wat moet de app nog over jou weten?&rdquo;.</li>
          <li>Als je meldingen aanzet: de gegevens van je toestel waarmee de melding aankomt.</li>
        </ul>
        <p>
          De app vraagt nooit naar je geloof of je gezondheid. Persoonlijke elementen bewaren we alleen als je ze zelf aanzet. Er is geen analytics en er is geen
          tracking. De enige cookie houdt je ingelogd.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Wie je gegevens verwerkt</h2>
        <ul className={list}>
          <li>Supabase: de database en het inloggen, op servers in Frankfurt.</li>
          <li>Vercel: de hosting van de app, ook in Frankfurt.</li>
          <li>GitHub: de code en de versleutelde back-ups.</li>
          <li>De pushdiensten van Google, Apple en Mozilla: alleen als je meldingen aanzet, en dan enkel voor de melding zelf. Je financiële gegevens gaan er niet heen.</li>
        </ul>
        <p>Vercel, GitHub en de pushdiensten zijn Amerikaanse bedrijven.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Hoe lang we ze bewaren</h2>
        <p>Zolang je account bestaat. Wis je je account, dan verdwijnen je gegevens meteen uit de database. Back-ups blijven nog 90 dagen bestaan en verdwijnen daarna ook.</p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className={h2}>Downloaden of wissen</h2>
        <p>Je gegevens zijn van jou. Je kan ze elk moment zelf meenemen of laten wissen. Je gegevens aanpassen kan in de app, onder Meer.</p>
        <ul className="flex flex-col">
          <li>
            {/* Not a link to the export itself: a visitor without a session would save the login page instead of the data. */}
            <Link href="/meer" className={link}>
              Gegevens downloaden via Meer
            </Link>
            <span className="block text-sm text-ink-2">Kies daar Gegevens downloaden. Je krijgt één bestand met je gegevens, op de technische sleutels van je meldingen na.</span>
          </li>
          <li>
            <Link href="/meer/account" className={link}>
              Account wissen
            </Link>
            <span className="block text-sm text-ink-2">Je vult je wachtwoord in en je account en al je gegevens worden gewist.</span>
          </li>
        </ul>
      </section>

      <Link href="/" className={link}>
        Terug naar de app
      </Link>
    </>
  );
}
