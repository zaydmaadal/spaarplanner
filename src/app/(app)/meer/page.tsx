import { ChevronRight, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { InstallGuide } from "@/components/install-guide";
import { LogoutForm } from "@/components/logout-form";
import { PushSettings } from "@/components/push-card";
import { Appearance } from "@/components/settings/appearance";
import { Button } from "@/components/ui/button";
import { readPrefs } from "@/data/supabase/server";

export const metadata: Metadata = { title: "Meer" };

const row = "press flex min-h-12 items-center justify-between gap-3 rounded-strip px-2 py-1.5 font-semibold hover:bg-tint";
const chevron = <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-2" />;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rise flex flex-col gap-1 rounded-card bg-surface p-4 shadow-card">
      <h2 className="font-display text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const List = ({ children }: { children: ReactNode }) => <ul className="flex flex-col">{children}</ul>;
const Item = ({ href, children }: { href: string; children: ReactNode }) => (
  <li>
    <Link href={href} className={row}>
      {children}
      {chevron}
    </Link>
  </li>
);

// Spec 8.7. The settings of the onboarding live on their own pages here.
export default async function MorePage() {
  const { palette, theme } = await readPrefs();
  return (
    <>
      <div className="flex flex-col gap-3 lg:gap-6">
        <h1 className="font-display text-3xl font-bold">Meer</h1>
        <div className="grid items-start gap-3 lg:grid-cols-2 lg:gap-4">
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
          <Appearance key={`${palette}/${theme}`} palette={palette} theme={theme} />
        </Card>
        <PushSettings />
        <div className="rise rounded-card bg-surface p-4 shadow-card">
          <InstallGuide />
        </div>
        <Card title="Privacy en account">
          <List>
            <Item href="/privacy">Privacy</Item>
            <li>
              {/* A plain link, not next/link (Link would prefetch the download). The download attribute is for WebKit; this page always has a session. */}
              <a href="/api/export" download className={row}>
                Gegevens downloaden
                <Download aria-hidden className="size-5 shrink-0 text-ink-2" />
              </a>
            </li>
            <Item href="/wachtwoord-wijzigen">Wachtwoord wijzigen</Item>
            <Item href="/meer/account">Account wissen</Item>
          </List>
        </Card>
        </div>
        <LogoutForm>
          <Button type="submit" variant="outline" size="lg" className="w-full">
            Uitloggen
          </Button>
        </LogoutForm>
      </div>
      <BottomNav active="meer" />
    </>
  );
}
