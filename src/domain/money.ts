import type { Cents, Frequency } from "./types";

const eur = new Intl.NumberFormat("nl-BE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

export function formatEUR(cents: Cents): string {
  // ICU versions differ in which space they put after the euro sign; always use U+00A0.
  const text = eur.format(Math.abs(cents) / 100).replace(/\s/g, " ");
  return cents < 0 ? `− ${text}` : text;
}

// Dutch notation: "." groups thousands, "," is the decimal. A lone "." with 1 to 2 digits after it is a decimal.
export function parseEuroInput(text: string): Cents | null {
  const s = text.replace(/[€\s]/g, "");
  const m = /^(\d+|\d{1,3}(?:\.\d{3})+)(?:,(\d{1,2}))?$/.exec(s) ?? /^(\d+)\.(\d{1,2})$/.exec(s);
  if (!m) return null;
  return Number(m[1].replace(/\./g, "")) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}

// yearly and once are not a monthly amount (0); shortcut: floors to whole cents, revisit if rounding drift matters.
export function toMonthlyCents(amountCents: Cents, frequency: Frequency): Cents {
  switch (frequency) {
    case "monthly":
      return amountCents;
    case "weekly":
      return Math.floor((amountCents * 52) / 12);
    case "biweekly":
      return Math.floor((amountCents * 26) / 12);
    default:
      return 0;
  }
}

export function ceilTo100(cents: Cents): Cents {
  return Math.ceil(cents / 100) * 100;
}
