import { ChevronRight, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { InstallGuide } from "@/components/install-guide";
import { Appearance } from "@/components/settings/appearance";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/data/actions/auth";
import { readPrefs } from "@/data/supabase/server";

export const metadata: Metadata = { title: "Meer" };

const row = "flex min-h-14 items-center justify-between gap-3 py-2 font-semibold";
const chevron = <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-2" />;

function Card({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2 rounded-card bg-surface p-5">
      <h2 id={titleId} className="font-display text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const List = ({ children }: { children: ReactNode }) => <ul className="flex flex-col divide-y divide-hairline">{children}</ul>;
const Item = ({ href, children }: { href: string; children: ReactNode }) => (
  <li>
    <Link href={href} className={row}>
      {children}
      {chevron}
    </Link>
  </li>
);

// Spec 8.7. "Meldingen" comes with the push milestone. The settings of the onboarding live on their own pages here.
export default async function MorePage() {
  const { palette, theme } = await readPrefs();
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Meer</h1>
        <Card title="Je gegevens">
          <List>
            <Item href="/meer/profiel">Profiel</Item>
            <Item href="/meer/inkomen">Inkomen</Item>
            <Item href="/meer/uitgaven">Uitgaven</Item>
            <Item href="/meer/plan">Spaarplan</Item>
            <Item href="/meer/context">Wat de app over je weet</Item>
          </List>
        </Card>
        <Card title="Uiterlijk">
          <Appearance palette={palette} theme={theme} />
        </Card>
        <div className="rounded-card bg-surface p-5">
          <InstallGuide />
        </div>
        <Card title="Privacy en account">
          <List>
            <Item href="/privacy">Privacy</Item>
            <li>
              {/* A plain link, not next/link (Link would prefetch the download), and no download attribute: the response forces the download itself. */}
              <a href="/api/export" className={row}>
                Gegevens downloaden
                <Download aria-hidden className="size-5 shrink-0 text-ink-2" />
              </a>
            </li>
            <Item href="/wachtwoord-wijzigen">Wachtwoord wijzigen</Item>
            <Item href="/meer/account">Account wissen</Item>
          </List>
        </Card>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Uitloggen
          </Button>
        </form>
      </div>
      <BottomNav active="meer" />
    </>
  );
}
