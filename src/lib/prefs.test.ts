import { describe, expect, it } from "vitest";
import { parsePrefs } from "./prefs";

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
