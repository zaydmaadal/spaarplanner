import { Money } from "@/components/money";
import type { Cents, ISODate } from "@/domain/types";
import { stagger } from "@/lib/utils";

export type Booking = { id: string; amountCents: Cents; occurredOn: ISODate; note: string | null };

const day = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// Spec 8.4: the deposits and withdrawals of one pot, newest first. The words say which is which, not only the sign.
// shortcut: the page passes the last 100 bookings; the balance below is of all of them. Add paging when someone gets there.
export function History({ bookings, balanceCents }: { bookings: Booking[]; balanceCents: Cents }) {
  return (
    <section aria-label="Geschiedenis" className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card">
      <h2 className="font-display text-xl font-semibold">Geschiedenis</h2>
      {bookings.length === 0 ? (
        <p className="text-ink-2">Nog geen stortingen of opnames.</p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {bookings.map((b, i) => (
              <li key={b.id} className="rise flex items-center justify-between gap-3 rounded-strip bg-tint px-3 py-2" style={stagger(Math.min(i, 8) + 1)}>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold">{day.format(new Date(`${b.occurredOn}T00:00:00Z`))}</p>
                  <p className="text-xs text-ink-2">{[b.amountCents < 0 ? "Opname" : "Storting", b.note].filter(Boolean).join(" · ")}</p>
                </div>
                <Money cents={b.amountCents} className="text-right" />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t pt-3 font-semibold">
            <span>Saldo</span>
            <Money cents={balanceCents} />
          </div>
        </>
      )}
    </section>
  );
}
