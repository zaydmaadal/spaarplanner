import { describe, expect, it } from "vitest";
import { savingsChange } from "./savings";

describe("savingsChange (what Opslaan sends for 'Dit wil ik sparen')", () => {
  it("sends nothing while the user has typed nothing: the field then only shows the proposal", () => {
    expect(savingsChange(null, null)).toBeNull();
    expect(savingsChange(null, "250")).toBeNull();
  });

  it("sends nothing when the typed amount is the stored one", () => {
    expect(savingsChange("250", "250")).toBeNull();
    expect(savingsChange("", "")).toBeNull();
  });

  it("sends the amount the user typed, as typed", () => {
    expect(savingsChange("300", null)).toEqual({ monthlySavings: "300" });
    expect(savingsChange("300,50", "250")).toEqual({ monthlySavings: "300,50" });
  });

  it("sends null for an emptied field, which means 'follows my room'", () => {
    expect(savingsChange("", "250")).toEqual({ monthlySavings: null });
    expect(savingsChange("  ", "250")).toEqual({ monthlySavings: null });
  });
});
