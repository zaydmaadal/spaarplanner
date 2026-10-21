import { describe, expect, it } from "vitest";
import { previewTimeline } from "./timeline";

// Spec 5.9 examples 1 and 2: saving € 500 a month from nov 2026, noodfonds 0/1.500 and Reis 0/1.000.
const base = {
  fund: { targetCents: 150000, balanceCents: 0 },
  goals: [{ id: "reis", name: "Reis", targetCents: 100000, deadline: null }],
  savingsCents: 50000,
  startMonth: { year: 2026, month: 11 },
};
const fills = (input: Parameters<typeof previewTimeline>[0]) => Object.fromEntries(previewTimeline(input).lines.map((l) => [l.name, l.fill]));

describe("previewTimeline", () => {
  it("fills the emergency fund first when it gets the whole share (example 1)", () => {
    expect(fills({ ...base, sharePct: 100 })).toEqual({ Noodfonds: { year: 2027, month: 1 }, Reis: { year: 2027, month: 3 } });
  });

  it("shares the savings with the goals at 50 % (example 2)", () => {
    expect(fills({ ...base, sharePct: 50 })).toEqual({ Noodfonds: { year: 2027, month: 3 }, Reis: { year: 2027, month: 2 } });
  });

  it("lists the fund first and keeps the order of the goals", () => {
    const goals = [
      { id: "a", name: "Laptop", targetCents: 100000, deadline: null },
      { id: "b", name: "Auto", targetCents: 800000, deadline: null },
    ];
    expect(previewTimeline({ ...base, goals, sharePct: 100 }).lines.map((l) => l.name)).toEqual(["Noodfonds", "Laptop", "Auto"]);
  });

  it("calls a fund that the start balance already fills full, and a plan without savings never", () => {
    expect(fills({ ...base, fund: { targetCents: 100000, balanceCents: 100000 }, sharePct: 100 }).Noodfonds).toBe("full");
    expect(fills({ ...base, savingsCents: 0, sharePct: 100 })).toEqual({ Noodfonds: null, Reis: null });
  });

  it("reports the horizon in whole years, for the 'niet binnen N jaar' text", () => {
    expect(previewTimeline({ ...base, sharePct: 100 }).horizonYears).toBe(10);
    // nov 2026 to jan 2041 is 171 months, so 14 whole years.
    const late = [{ id: "x", name: "Hajj", targetCents: 700000, deadline: { year: 2041, month: 1 } }];
    expect(previewTimeline({ ...base, goals: late, sharePct: 100 }).horizonYears).toBe(14);
  });
});
