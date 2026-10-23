import { describe, expect, it } from "vitest";
import { parsePrefs, parseStep8Prefs } from "./prefs";

describe("parsePrefs", () => {
  it("defaults to oceaan and system when prefs are empty, missing or not an object", () => {
    for (const raw of [{}, null, undefined, "x", 3, []]) {
      expect(parsePrefs(raw)).toEqual({ palette: "oceaan", theme: "system" });
    }
  });

  it("keeps valid values", () => {
    expect(parsePrefs({ palette: "grafiet", theme: "dark" })).toEqual({ palette: "grafiet", theme: "dark" });
  });

  it("falls back per field and ignores other keys", () => {
    expect(parsePrefs({ palette: "salie", theme: "blue", other: 1 })).toEqual({ palette: "salie", theme: "system" });
    expect(parsePrefs({ palette: "neon", theme: "light" })).toEqual({ palette: "oceaan", theme: "light" });
  });
});

describe("parseStep8Prefs", () => {
  it("reads the two answers of step 8 from their stored keys", () => {
    expect(parseStep8Prefs({ no_interest_savings: true, context_note: "Ik heb 20 vakantiedagen." })).toEqual({
      noInterestSavings: true,
      contextNote: "Ik heb 20 vakantiedagen.",
    });
  });

  it("is off and empty when the keys are missing, of the wrong type, or the prefs are not an object", () => {
    const none = { noInterestSavings: false, contextNote: "" };
    for (const raw of [{}, null, undefined, "x", 3, [], { no_interest_savings: "true", context_note: 5 }]) {
      expect(parseStep8Prefs(raw)).toEqual(none);
    }
  });
});
