"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

// Spec 8.8: a card with what went wrong and a retry. The error itself (message, digest) is only in the server logs, never on screen.
// retry() fetches the page again and shows it; reset() would only show the same failed render again.
export default function AppError({ retry }: { retry: () => void }) {
  return (
    <section className="flex flex-col gap-4 rounded-card bg-surface p-5">
      <h1 className="font-display text-2xl font-semibold">Dit lukt nu even niet</h1>
      <p className="text-ink-2">We konden dit scherm niet laden. Probeer het opnieuw.</p>
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={retry}>
          Opnieuw proberen
        </Button>
        <Button asChild variant="outline">
          <Link href="/overzicht">Naar je overzicht</Link>
        </Button>
      </div>
    </section>
  );
}
