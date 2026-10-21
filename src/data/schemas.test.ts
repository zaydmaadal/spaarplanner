import { describe, expect, it } from "vitest";
import { passwordSchema, usernameSchema } from "./schemas";

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

  it("rejects more than 72 characters, the limit Supabase Auth enforces", () => {
    expect(passwordSchema.safeParse("a".repeat(73)).success).toBe(false);
  });
});
