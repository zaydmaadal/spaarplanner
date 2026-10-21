import { describe, expect, test } from "vitest";
import { ceilTo100, formatEUR, parseEuroInput, toMonthlyCents } from "./money";

describe("formatEUR", () => {
  test("formats with nl-BE grouping and U+00A0 after the euro sign", () => {
    expect(formatEUR(124000)).toBe("€\u00a01.240,00");
    expect(formatEUR(0)).toBe("€\u00a00,00");
  });
  test("negatives use U+2212", () => {
    expect(formatEUR(-5000)).toBe("\u2212\u00a0€\u00a050,00");
  });
});

describe("parseEuroInput", () => {
  test("parses valid input", () => {
    expect(parseEuroInput("12,50")).toBe(1250);
    expect(parseEuroInput("1.240,50")).toBe(124050);
    expect(parseEuroInput("1240")).toBe(124000);
    expect(parseEuroInput("12.5")).toBe(1250);
    expect(parseEuroInput("12.50")).toBe(1250);
    expect(parseEuroInput("1.240")).toBe(124000); // one dot + exactly 3 digits = thousands
    expect(parseEuroInput("1.240.000")).toBe(124000000);
    expect(parseEuroInput(" € 50 ")).toBe(5000);
    expect(parseEuroInput("0")).toBe(0);
    expect(parseEuroInput("0,5")).toBe(50);
    expect(parseEuroInput("0.5")).toBe(50);
    expect(parseEuroInput("0.50")).toBe(50);
  });
  test("rejects invalid input", () => {
    for (const bad of ["", "abc", "1,2,3", "-5", "0,005", "12,", "1.24.0", "0.500", "0.125", "99999999999999999"]) {
      expect(parseEuroInput(bad)).toBeNull();
    }
  });
});

test("toMonthlyCents", () => {
  expect(toMonthlyCents(10000, "monthly")).toBe(10000);
  expect(toMonthlyCents(10000, "weekly")).toBe(43333);
  expect(toMonthlyCents(10000, "biweekly")).toBe(21666);
  expect(toMonthlyCents(10000, "yearly")).toBe(0);
  expect(toMonthlyCents(10000, "once")).toBe(0);
});

test("ceilTo100", () => {
  expect(ceilTo100(8571)).toBe(8600);
  expect(ceilTo100(8600)).toBe(8600);
});
