import { describe, expect, test } from "vitest";
import { byFill, checklistGroups } from "./helpers";

const fill = (name: string, f: Parameters<typeof byFill>[0][number]["fill"]) => ({ name, fill: f });
const names = (goals: { name: string }[]) => goals.map((g) => g.name);

describe("byFill (the timeline order)", () => {
  test("puts the soonest month first, also across years", () => {
    const goals = [fill("laptop", { year: 2027, month: 2 }), fill("auto", { year: 2026, month: 12 }), fill("reis", { year: 2027, month: 1 })];
    expect(names(byFill(goals))).toEqual(["auto", "reis", "laptop"]);
  });

  test("a full pot comes first and a pot that never fills comes last", () => {
    const goals = [fill("nooit", null), fill("reis", { year: 2027, month: 1 }), fill("vol", "full")];
    expect(names(byFill(goals))).toEqual(["vol", "reis", "nooit"]);
  });

  test("pots that fill in the same month keep their priority order, and the input is not changed", () => {
    const goals = [fill("b", { year: 2027, month: 1 }), fill("a", { year: 2027, month: 1 }), fill("x", null), fill("y", null), fill("v", "full"), fill("w", "full")];
    expect(names(byFill(goals))).toEqual(["v", "w", "b", "a", "x", "y"]);
    expect(names(goals)).toEqual(["b", "a", "x", "y", "v", "w"]);
  });
});

describe("checklistGroups", () => {
  const rule = (key: string, urgency: "week" | "month" | "later") => ({ key, title: `regel ${key}`, urgency });
  const own = (id: string, urgency: "week" | "month" | "later") => ({ id, title: `eigen ${id}`, urgency });

  test("groups by urgency from this week to later, and leaves out groups without steps", () => {
    const groups = checklistGroups([rule("a", "later"), rule("b", "week")], [own("c", "later")]);
    expect(groups.map((g) => g.urgency)).toEqual(["week", "later"]);
  });

  test("within a group the rule steps come before the steps the user wrote, each in the order they came", () => {
    const groups = checklistGroups([rule("r1", "month"), rule("r2", "month")], [own("u1", "month"), own("u2", "month")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].steps.map((s) => [s.source, s.key])).toEqual([
      ["rule", "r1"],
      ["rule", "r2"],
      ["user", "u1"],
      ["user", "u2"],
    ]);
  });

  test("carries what the buttons need: the rule key for a rule step, the row id for an own step", () => {
    const [group] = checklistGroups([rule("deposit:2026-10-29", "week")], [own("00000000-0000-4000-8000-000000000009", "week")]);
    expect(group.steps).toEqual([
      { key: "deposit:2026-10-29", title: "regel deposit:2026-10-29", urgency: "week", source: "rule" },
      { key: "00000000-0000-4000-8000-000000000009", title: "eigen 00000000-0000-4000-8000-000000000009", urgency: "week", source: "user" },
    ]);
  });

  test("nothing to do gives no groups", () => {
    expect(checklistGroups([], [])).toEqual([]);
  });
});
