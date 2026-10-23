import type { Metadata } from "next";
import Link from "next/link";
import { createAdminSupabase } from "@/data/supabase/admin";
import { requireAdmin } from "@/data/supabase/server";
import { cn } from "@/lib/utils";
import { HandledButton } from "./handled-button";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Beheer" };

const FILTERS = [
  { href: "/beheer", label: "Alles", kind: null },
  { href: "/beheer?soort=feedback", label: "Feedback", kind: "feedback" },
  { href: "/beheer?soort=bug", label: "Bugs", kind: "bug" },
] as const;

const when = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });

export default async function BeheerPage({ searchParams }: PageProps<"/beheer">) {
  await requireAdmin();
  const { soort } = await searchParams;
  const kind = soort === "bug" || soort === "feedback" ? soort : null;

  // The service role reads every user's rows; RLS only shows a user their own. The newest 200 are plenty (the table is capped per user).
  const query = createAdminSupabase()
    .from("feedback")
    .select("id, kind, message, page, handled_at, created_at, profiles(username, display_name)")
    .order("created_at", { ascending: false })
    .limit(200);
  const { data, error } = await (kind ? query.eq("kind", kind) : query);
  if (error) throw error;
  const open = data.filter((f) => !f.handled_at).length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-10 px-4 py-8">
      <section aria-labelledby="feedback-title" className="flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <h1 id="feedback-title" className="font-display text-3xl font-bold">
            Feedback
          </h1>
          <p className="text-ink-2">{data.length === 0 ? "Nog niets binnengekomen." : `${open} open, ${data.length - open} afgehandeld`}</p>
        </header>
        <nav aria-label="Soort bericht" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.label}
              href={f.href}
              aria-current={f.kind === kind ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-semibold",
                f.kind === kind ? "border-ink bg-tint" : "border-hairline bg-surface",
              )}
            >
              {f.label}
            </Link>
          ))}
        </nav>
        <ul className="flex flex-col gap-3">
          {data.map((f) => (
            <li key={f.id} className={cn("flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card", f.handled_at && "bg-ground shadow-none ring-1 ring-hairline")}>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", f.kind === "bug" ? "bg-error text-ground" : "bg-tint text-ink")}>{f.kind === "bug" ? "Bug" : "Feedback"}</span>
                <span className="font-semibold">
                  {f.profiles?.display_name ? `${f.profiles.display_name} (${f.profiles.username})` : (f.profiles?.username ?? "Onbekend")}
                </span>
                <time dateTime={f.created_at} className="text-ink-2">
                  {when.format(new Date(f.created_at))}
                </time>
                {f.page && <span className="text-ink-2">Pagina: {f.page}</span>}
              </div>
              <p className="whitespace-pre-wrap break-words">{f.message}</p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink-2">{f.handled_at ? `Afgehandeld op ${when.format(new Date(f.handled_at))}` : "Open"}</span>
                <HandledButton id={f.id} handled={!!f.handled_at} />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="reset-title" className="flex max-w-sm flex-col gap-4">
        <h2 id="reset-title" className="font-display text-2xl font-bold">
          Wachtwoord resetten
        </h2>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
