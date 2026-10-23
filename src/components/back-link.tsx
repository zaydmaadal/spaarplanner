import { ChevronLeft } from "lucide-react";
import Link from "next/link";

// The same back link at the top left of every sub page: chevron and the parent's name, 44 px high.
export function BackLink({ href, parent }: { href: string; parent: string }) {
  return (
    <Link href={href} className="-ml-1 inline-flex h-11 min-w-11 items-center gap-1 self-start rounded-md px-1 pr-2 text-sm font-semibold underline-offset-4 hover:underline">
      <ChevronLeft aria-hidden className="size-5" />
      Terug naar {parent}
    </Link>
  );
}
