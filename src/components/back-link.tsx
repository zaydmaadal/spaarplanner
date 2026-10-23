import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// The same back link at the top left of every sub page: a quiet pill with the chevron and the parent's name, 44 px high.
export function BackLink({ href, parent }: { href: string; parent: string }) {
  return (
    <Link href={href} className="press inline-flex h-11 items-center gap-1 self-start rounded-full bg-tint pr-4 pl-2 text-sm font-semibold hover:bg-tint-accent">
      <ChevronLeft aria-hidden className="size-5" />
      Terug naar {parent}
    </Link>
  );
}
