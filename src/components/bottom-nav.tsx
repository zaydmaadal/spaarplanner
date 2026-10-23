import { CalendarDays, House, Plus, Target, UserRound } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type Tab = "overzicht" | "doelen" | "plan" | "meer";

export const TABS = {
  overzicht: { href: "/overzicht", label: "Overzicht", Icon: House },
  doelen: { href: "/doelen", label: "Doelen", Icon: Target },
  plan: { href: "/plan", label: "Plan", Icon: CalendarDays },
  meer: { href: "/meer", label: "Profiel", Icon: UserRound },
} as const;

const item = "press relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-xs font-semibold";

// Every screen renders its own tab as active. Each copy has the same named pill, so the browser slides it to the new tab
// during a route change (view transition). From 1024 px the sidebar in (app)/layout.tsx replaces this bar.
export function BottomNav({ active }: { active: Tab | "storten" }) {
  const tab = (key: Tab) => {
    const { href, label, Icon } = TABS[key];
    const on = active === key;
    return (
      <Link key={key} href={href} aria-current={on ? "page" : undefined} className={cn(item, on ? "text-active-ink" : "text-ink-2")}>
        {on && <span aria-hidden className="absolute inset-0.5 rounded-full bg-active-bg" style={{ viewTransitionName: "nav-pill" }} />}
        <Icon aria-hidden className="relative size-5.5" />
        <span className="relative">{label}</span>
      </Link>
    );
  };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] lg:hidden">
      <nav
        aria-label="Hoofdmenu"
        style={{ viewTransitionName: "bottom-nav" }}
        className="pointer-events-auto flex w-full max-w-md items-center gap-0.5 rounded-full border bg-surface p-1.5 shadow-nav"
      >
        {tab("overzicht")}
        {tab("doelen")}
        <Link href="/storten" aria-current={active === "storten" ? "page" : undefined} className={cn(item, "text-ink")}>
          <span className="-mt-5 grid size-11 place-items-center rounded-full bg-action text-on-action shadow-card ring-4 ring-surface">
            <Plus aria-hidden className="size-6" />
          </span>
          <span>Storten</span>
        </Link>
        {tab("plan")}
        {tab("meer")}
      </nav>
    </div>
  );
}
