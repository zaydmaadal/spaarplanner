import { describe, expect, it } from "vitest";
import {
  budgetLineSchema,
  fieldErrorsFrom,
  goalSchema,
  incomeSchema,
  moneySchema,
  passwordSchema,
  profileSchema,
  transactionSchema,
  usernameSchema,
} from "./schemas";

describe("usernameSchema", () => {
  it.each(["haider", "zayd.m", "a_1", "a".repeat(20)])("accepts %s", (u) => {
    expect(usernameSchema.safeParse(u).success).toBe(true);
  });

  it.each(["ab", ".zayd", "zayd.", "za..yd", "Zé", "a".repeat(21), "zayd m"])("rejects %s", (u) => {
    expect(usernameSchema.safeParse(u).success).toBe(false);
  });

  it("lowercases and trims", () => {
    expect(usernameSchema.parse("  Haider ")).toBe("haider");
  });
});

describe("passwordSchema", () => {
  it("rejects 9 characters and accepts 10", () => {
    expect(passwordSchema.safeParse("a".repeat(9)).success).toBe(false);
    expect(passwordSchema.safeParse("a".repeat(10)).success).toBe(true);
  });

  it("rejects more than 72 bytes, the limit Supabase Auth enforces", () => {
    expect(passwordSchema.safeParse("a".repeat(72)).success).toBe(true);
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
    // 40 characters but 80 bytes in UTF-8.
    expect(passwordSchema.safeParse("é".repeat(40)).success).toBe(false);
  });
});

const uuid = "3f2b1c9e-7d4a-4e8b-9c1d-2a6f5e0b8d71";

describe("moneySchema", () => {
  it("parses Dutch notation into cents", () => {
    expect(moneySchema.parse("1.234,56")).toBe(123456);
    expect(moneySchema.parse("€ 50")).toBe(5000);
    expect(moneySchema.parse("0")).toBe(0);
  });

  it.each(["", "abc", "-5", "1,234", "12,5,5", "1000000000,01"])("rejects %j", (v) => {
    expect(moneySchema.safeParse(v).success).toBe(false);
  });

  it("accepts the database maximum (1e11 cents) and not one cent more", () => {
    expect(moneySchema.safeParse("1000000000").success).toBe(true);
    expect(moneySchema.safeParse("1000000000,01").success).toBe(false);
  });
});

describe("goalSchema", () => {
  const goal = { name: "Reis", target: "1.500", kind: "trip" as const, weight: 1 };

  it("accepts a valid goal and defaults what is left out", () => {
    expect(goalSchema.parse({ name: "Reis", target: "1500" })).toEqual({
      name: "Reis",
      kind: "other",
      target: 150000,
      targetIsEstimate: false,
      weight: 1,
    });
    expect(goalSchema.parse({ ...goal, deadline: "2027-07" }).deadline).toBe("2027-07");
  });

  it("rejects a target of 0, a name of 81 characters and a weight of 0", () => {
    expect(goalSchema.safeParse({ ...goal, target: "0" }).success).toBe(false);
    expect(goalSchema.safeParse({ ...goal, name: "a".repeat(81) }).success).toBe(false);
    expect(goalSchema.safeParse({ ...goal, name: "a".repeat(80) }).success).toBe(true);
    expect(goalSchema.safeParse({ ...goal, name: "  " }).success).toBe(false);
    expect(goalSchema.safeParse({ ...goal, weight: 0 }).success).toBe(false);
  });

  it("rejects the emergency kind (created by onboarding only) and a malformed deadline", () => {
    expect(goalSchema.safeParse({ ...goal, kind: "emergency" }).success).toBe(false);
    expect(goalSchema.safeParse({ ...goal, deadline: "2027-13" }).success).toBe(false);
    expect(goalSchema.safeParse({ ...goal, deadline: "juli 2027" }).success).toBe(false);
  });
});

describe("incomeSchema", () => {
  const income = {
    name: "Salaris",
    kind: "salary" as const,
    frequency: "monthly" as const,
    amount: "2.150",
    paydayRule: { type: "day_of_month" as const, day: 29, weekend: "before" as const },
  };

  it("accepts a monthly salary with a payday rule", () => {
    expect(incomeSchema.parse(income)).toMatchObject({ amount: 215000, variability: "fixed", isEstimate: false, active: true });
  });

  it("needs a month for yearly income and a date for one-off income", () => {
    expect(incomeSchema.safeParse({ ...income, frequency: "yearly" }).success).toBe(false);
    expect(incomeSchema.safeParse({ ...income, frequency: "yearly", month: 12 }).success).toBe(true);
    expect(incomeSchema.safeParse({ ...income, frequency: "once" }).success).toBe(false);
    expect(incomeSchema.safeParse({ ...income, frequency: "once", date: "2027-02-30" }).success).toBe(false);
    expect(incomeSchema.safeParse({ ...income, frequency: "once", date: "2027-02-28" }).success).toBe(true);
  });

  it("only takes payday rules the database accepts", () => {
    const rule = (paydayRule: unknown) => incomeSchema.safeParse({ ...income, paydayRule }).success;
    expect(rule({ type: "day_of_month", day: 32, weekend: "before" })).toBe(false);
    expect(rule({ type: "day_of_month", day: 5 })).toBe(false);
    expect(rule({ type: "weekday", weekday: 8 })).toBe(false);
    expect(rule({ type: "weekday", weekday: 5 })).toBe(true);
    expect(rule({ type: "last_working_day" })).toBe(true);
    expect(rule({ type: "irregular" })).toBe(true);
    expect(rule({ type: "monthly" })).toBe(false);
  });
});

describe("budgetLineSchema", () => {
  it("parses a line and rejects an empty name", () => {
    const line = { kind: "fixed" as const, category: "Wonen", name: "Huur", amount: "500" };
    expect(budgetLineSchema.parse(line)).toMatchObject({ amount: 50000, isEstimate: false });
    expect(budgetLineSchema.safeParse({ ...line, name: "" }).success).toBe(false);
  });
});

describe("transactionSchema", () => {
  const tx = { goalId: uuid, amount: "60", direction: "out" as const, occurredOn: "2026-10-21", clientRef: uuid };

  it("parses an amount as positive cents next to a direction", () => {
    expect(transactionSchema.parse(tx)).toMatchObject({ amount: 6000, direction: "out" });
  });

  it("rejects a zero amount, a bad direction, a bad date, a long note and a non-uuid", () => {
    expect(transactionSchema.safeParse({ ...tx, amount: "0" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...tx, direction: "sideways" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...tx, occurredOn: "2026-02-31" }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...tx, note: "a".repeat(201) }).success).toBe(false);
    expect(transactionSchema.safeParse({ ...tx, clientRef: "abc" }).success).toBe(false);
  });
});

describe("profileSchema", () => {
  it("keeps only the whitelisted prefs and drops other keys", () => {
    const parsed = profileSchema.parse({ prefs: { palette: "salie", theme: "dark", is_admin: true }, role: "admin" });
    expect(parsed).toEqual({ prefs: { palette: "salie", theme: "dark" } });
  });

  it("rejects an unknown palette or theme and a context note of 2001 characters", () => {
    expect(profileSchema.safeParse({ prefs: { palette: "neon" } }).success).toBe(false);
    expect(profileSchema.safeParse({ prefs: { theme: "blue" } }).success).toBe(false);
    expect(profileSchema.safeParse({ prefs: { contextNote: "a".repeat(2000) } }).success).toBe(true);
    expect(profileSchema.safeParse({ prefs: { contextNote: "a".repeat(2001) } }).success).toBe(false);
  });
});

describe("fieldErrorsFrom", () => {
  it("keys a nested error by the field itself", () => {
    const r = profileSchema.safeParse({ prefs: { contextNote: "a".repeat(2001) } });
    expect(!r.success && Object.keys(fieldErrorsFrom(r.error))).toEqual(["contextNote"]);
  });
});
