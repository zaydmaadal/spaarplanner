import { monthIndex, monthsInclusive } from "./dates";
import { ceilTo100 } from "./money";
import type { Cents, Goal, YearMonth } from "./types";

const cmp = <T>(a: T, b: T) => (a < b ? -1 : a > b ? 1 : 0);
const due = (g: Goal) => (g.deadline ? monthIndex(g.deadline) : Infinity);
const order = (a: Goal, b: Goal) => cmp(due(a), due(b)) || cmp(a.priority, b.priority) || cmp(a.createdAt, b.createdAt) || cmp(a.id, b.id);

// Spec 5.3, steps 1 to 5. A goal that is full has no room, so no step needs a separate "full" check.
export function allocate(availableCents: Cents, goals: Goal[], emergencySharePct: number, periodMonth: YearMonth): Record<string, Cents> {
  const live = goals.filter((g) => !g.archived).sort(order);
  const got: Record<string, Cents> = Object.fromEntries(live.map((g) => [g.id, 0]));
  const fund = live.find((g) => g.kind === "emergency");
  const others = live.filter((g) => g !== fund);
  let pool = Math.max(0, availableCents);
  const room = (g: Goal) => Math.max(0, g.targetCents - g.balanceCents - got[g.id]);
  const give = (g: Goal, want: Cents) => {
    const n = Math.min(want, pool);
    got[g.id] += n;
    pool -= n;
  };

  // 1. emergency fund first
  if (fund) give(fund, Math.min(Math.floor((pool * emergencySharePct) / 100), room(fund)));

  // 2. deadline goals: what they need per remaining month, rounded up to whole euros
  for (const g of others) {
    if (!g.deadline) continue;
    const left = room(g);
    give(g, Math.min(left, ceilTo100(left / monthsInclusive(periodMonth, g.deadline))));
  }

  // 3. goals without deadline by weight; a goal that hits its cap drops out and the rest re-split
  let open = others.filter((g) => !g.deadline && room(g) > 0);
  while (pool > 0 && open.length > 0) {
    const total = pool;
    const weight = open.reduce((sum, g) => sum + g.weight, 0);
    const share = (g: Goal) => Math.floor((total * g.weight) / weight);
    const capped = open.filter((g) => share(g) >= room(g));
    if (capped.length > 0) {
      capped.forEach((g) => give(g, room(g)));
    } else {
      open.forEach((g) => give(g, share(g)));
      open.forEach((g) => give(g, room(g))); // remainder cents: first goal in sort order with room
    }
    open = open.filter((g) => room(g) > 0);
  }

  // 4. deadline goals ahead of schedule, 5. buffer in the emergency fund (may exceed its target)
  for (const g of others) if (g.deadline) give(g, room(g));
  if (fund) give(fund, pool);

  return got;
}
