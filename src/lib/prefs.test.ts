import { describe, expect, it } from "vitest";
import { LOOK_COOKIE, lookCookieValue, parseLookCookie, parsePrefs, parseStep8Prefs } from "./prefs";

describe("parsePrefs", () => {
  it("defaults to nachtblauw and system when prefs are empty, missing or not an object", () => {
    for (const raw of [{}, null, undefined, "x", 3, []]) {
      expect(parsePrefs(raw)).toEqual({ palette: "nachtblauw", theme: "system" });
    }
  });

  it("keeps valid values", () => {
    expect(parsePrefs({ palette: "lagune", theme: "dark" })).toEqual({ palette: "lagune", theme: "dark" });
  });

  it("maps the palettes of phase 1 to their successors", () => {
    expect(["oceaan", "salie", "grafiet"].map((palette) => parsePrefs({ palette }).palette)).toEqual(["lagune", "smaragd", "zonsopgang"]);
  });

  it("falls back per field and ignores other keys", () => {
    expect(parsePrefs({ palette: "smaragd", theme: "blue", other: 1 })).toEqual({ palette: "smaragd", theme: "system" });
    expect(parsePrefs({ palette: "neon", theme: "light" })).toEqual({ palette: "nachtblauw", theme: "light" });
  });
});

describe("look cookie", () => {
  it("round-trips palette and theme", () => {
    expect(LOOK_COOKIE).toBe("sp-look");
    expect(parseLookCookie(lookCookieValue({ palette: "zand", theme: "dark" }))).toEqual({ palette: "zand", theme: "dark" });
  });

  it("falls back to the defaults for a missing or tampered value", () => {
    for (const raw of [undefined, "", "neon.blue", "zand", ".dark"]) {
      const { palette, theme } = parseLookCookie(raw);
      expect(palette).toBe(raw === "zand" ? "zand" : "nachtblauw");
      expect(theme).toBe(raw === ".dark" ? "dark" : "system");
    }
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
