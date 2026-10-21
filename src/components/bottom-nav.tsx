import { CalendarDays, Ellipsis, House, Plus, Target } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Tab = "overzicht" | "doelen" | "plan" | "meer";

const TABS = {
  overzicht: { href: "/overzicht", label: "Overzicht", Icon: House },
  doelen: { href: "/doelen", label: "Doelen", Icon: Target },
  plan: { href: "/plan", label: "Plan", Icon: CalendarDays },
  meer: { href: "/meer", label: "Meer", Icon: Ellipsis },
} as const;

const item = "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-strip text-xs font-semibold";

// Every screen renders its own tab as active. The fixed bar needs bottom padding on the page content, see (app)/layout.tsx.
export function BottomNav({ active }: { active: Tab }) {
  const tab = (key: Tab) => {
    const { href, label, Icon } = TABS[key];
    return (
      <Link
        key={key}
        href={href}
        aria-current={active === key ? "page" : undefined}
        className={cn(item, active === key ? "bg-active-bg text-active-ink" : "text-ink-2")}
      >
        <Icon aria-hidden className="size-6" />
        {label}
      </Link>
    );
  };
  return (
    <nav aria-label="Hoofdmenu" className="fixed inset-x-0 bottom-0 z-40 border-t bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center gap-1 px-2 py-2">
        {tab("overzicht")}
        {tab("doelen")}
        <Link href="/storten" className={cn(item, "bg-action text-on-action")}>
          <Plus aria-hidden className="size-6" />
          Storten
        </Link>
        {tab("plan")}
        {tab("meer")}
      </div>
    </nav>
  );
}
