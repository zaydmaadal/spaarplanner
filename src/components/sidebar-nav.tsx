"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/components/bottom-nav";
import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

// From 1024 px the navigation moves from the floating bottom bar to a fixed sidebar. The active tab comes from the URL.
export function SidebarNav() {
  const path = usePathname();
  const is = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-6 border-r bg-surface p-4 lg:flex">
      <Link href="/overzicht" className="flex items-center gap-2.5 rounded-strip p-1">
        <LogoMark />
        <span className="font-display text-xl font-bold">Spaarplanner</span>
      </Link>
      <nav aria-label="Hoofdmenu" className="flex flex-col gap-1">
        <Link
          href="/storten"
          aria-current={is("/storten") ? "page" : undefined}
          className="press mb-2 flex min-h-11 items-center justify-center gap-2 rounded-full bg-action px-4 text-sm font-semibold text-on-action hover:opacity-90"
        >
          <Plus aria-hidden className="size-5" />
          Storten
        </Link>
        {Object.values(TABS).map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={is(href) ? "page" : undefined}
            className={cn(
              "press flex min-h-11 items-center gap-3 rounded-strip px-3 text-sm font-semibold transition-colors",
              is(href) ? "bg-active-bg text-active-ink" : "text-ink-2 hover:bg-tint",
            )}
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
