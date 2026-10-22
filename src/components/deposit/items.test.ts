import { describe, expect, test } from "vitest";
import { depositItems, totalCents } from "./items";

const ref = (goalId: string) => `ref-${goalId}`;
const rows = (...pairs: [string, string][]) => pairs.map(([goalId, text]) => ({ goalId, text }));

describe("depositItems", () => {
  test("every filled row becomes one transaction with its own reference", () => {
    const { items, errors } = depositItems(rows(["a", "215"], ["b", "12,50"]), "in", "2026-10-20", ref);
    expect(errors).toEqual({});
    expect(items).toEqual([
      { goalId: "a", amount: "215", direction: "in", occurredOn: "2026-10-20", clientRef: "ref-a" },
      { goalId: "b", amount: "12,50", direction: "in", occurredOn: "2026-10-20", clientRef: "ref-b" },
    ]);
  });

  test("a withdrawal is the same row with direction out", () => {
    expect(depositItems(rows(["a", "5"]), "out", "2026-10-20", ref).items[0]).toMatchObject({ direction: "out", amount: "5" });
  });

  test("an empty row or a zero is left out, not booked", () => {
    const { items, errors } = depositItems(rows(["a", ""], ["b", "  "], ["c", "0"], ["d", "0,00"], ["e", "1"]), "in", "2026-10-20", ref);
    expect(errors).toEqual({});
    expect(items.map((i) => i.goalId)).toEqual(["e"]);
  });

  test("an amount that is not a number is an error on that row and nothing is sent for it", () => {
    const { items, errors } = depositItems(rows(["a", "abc"], ["b", "10"]), "in", "2026-10-20", ref);
    expect(errors).toEqual({ a: "Vul een bedrag in, bijvoorbeeld 12,50." });
    expect(items.map((i) => i.goalId)).toEqual(["b"]);
  });

  test("the reference is asked for only for the rows that are booked", () => {
    const asked: string[] = [];
    depositItems(rows(["a", ""], ["b", "5"]), "in", "2026-10-20", (id) => (asked.push(id), id));
    expect(asked).toEqual(["b"]);
  });
});

describe("totalCents", () => {
  test("adds the amounts that can be read and ignores the rest", () => {
    expect(totalCents(rows(["a", "215"], ["b", "12,5"], ["c", ""], ["d", "x"]))).toBe(22750);
  });
});
