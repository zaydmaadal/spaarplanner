import type { TransactionInput } from "@/data/schemas";
import { parseEuroInput } from "@/domain/money";
import type { Cents, ISODate } from "@/domain/types";

export type DepositRow = { goalId: string; text: string };

// One transaction per filled row. Blank and zero rows are not booked; a row that is not an amount is an error on that
// row and is not sent. `refOf` is asked only for booked rows, so a reference exists per row that is really sent.
export function depositItems(rows: DepositRow[], direction: "in" | "out", occurredOn: ISODate, refOf: (goalId: string) => string) {
  const items: TransactionInput[] = [];
  const errors: Record<string, string> = {};
  for (const { goalId, text } of rows) {
    if (!text.trim()) continue;
    const cents = parseEuroInput(text);
    if (cents === null) errors[goalId] = "Vul een bedrag in, bijvoorbeeld 12,50.";
    else if (cents > 0) items.push({ goalId, amount: text, direction, occurredOn, clientRef: refOf(goalId) });
  }
  return { items, errors };
}

export const totalCents = (rows: DepositRow[]): Cents => rows.reduce((sum, { text }) => sum + (parseEuroInput(text) ?? 0), 0);
