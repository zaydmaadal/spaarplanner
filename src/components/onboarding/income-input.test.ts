import { describe, expect, it } from "vitest";
import { incomeSchema } from "@/data/schemas";
import { toEuroInput } from "@/domain/money";
import { income } from "@/domain/test-helpers";
import { keptIncomeFields } from "./income-input";

// What a form that edits name, kind, frequency and amount sends: the fields it has no input for come from keptIncomeFields.
const PARTNER = "00000000-0000-4000-8000-000000000001";
const sent = (stored: ReturnType<typeof income> | undefined, edit: { name: string; kind: "salary" | "side"; frequency: "monthly" | "weekly" | "yearly"; amount: string; month?: number }) =>
  incomeSchema.parse({ ...keptIncomeFields(stored, edit.frequency), id: stored?.id, ...edit });

describe("keptIncomeFields (saveIncomeAction replaces the whole income)", () => {
  const partner = income({
    id: PARTNER,
    name: "Loon partner",
    amountCents: 190000,
    amountLowCents: 120000,
    variability: "variable",
    isEstimate: true,
    active: false,
    paydayRule: { type: "last_working_day" },
  });

  it("sends back what the form cannot edit, so saving an income untouched changes nothing", () => {
    const saved = sent(partner, { name: partner.name, kind: "salary", frequency: "monthly", amount: toEuroInput(partner.amountCents) });
    expect(saved).toMatchObject({
      id: PARTNER,
      amount: 190000,
      amountLow: 120000,
      variability: "variable",
      isEstimate: true,
      active: false,
      paydayRule: { type: "last_working_day" },
    });
  });

  it("changes only what was edited", () => {
    const saved = sent(partner, { name: "Loon van mijn partner", kind: "salary", frequency: "monthly", amount: "2000" });
    expect(saved).toMatchObject({ name: "Loon van mijn partner", amount: 200000, amountLow: 120000, isEstimate: true, active: false, paydayRule: { type: "last_working_day" } });
  });

  it("gives a new income the defaults: fixed, not an estimate, active, no fixed payday", () => {
    const saved = sent(undefined, { name: "Studentenjob", kind: "side", frequency: "monthly", amount: "300" });
    expect(saved).toMatchObject({ variability: "fixed", isEstimate: false, active: true, paydayRule: { type: "irregular" } });
    expect(saved.amountLow ?? null).toBeNull();
  });

  it("drops the stored payday rule when the income is paid at another rhythm now", () => {
    const saved = sent(partner, { name: partner.name, kind: "salary", frequency: "weekly", amount: "400" });
    expect(saved.paydayRule).toEqual({ type: "irregular" });
    expect(saved).toMatchObject({ isEstimate: true, active: false });
  });

  it("keeps a yearly income as stored", () => {
    const vakantiegeld = income({ id: "00000000-0000-4000-8000-000000000002", name: "Vakantiegeld", frequency: "yearly", month: 5, isEstimate: false, paydayRule: { type: "irregular" } });
    const saved = sent(vakantiegeld, { name: "Vakantiegeld", kind: "salary", frequency: "yearly", amount: "1500", month: 5 });
    expect(saved).toMatchObject({ month: 5, isEstimate: false, active: true });
  });
});
