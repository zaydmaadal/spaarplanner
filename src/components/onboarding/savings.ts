// What to save for "Dit wil ik sparen": only an amount the user typed, never the proposal the field shows while nothing is
// typed (`typed` is then null). An emptied field means "follows my room" (null). Null as the result: nothing to save.
export function savingsChange(typed: string | null, stored: string | null): { monthlySavings: string | null } | null {
  if (typed === null || typed === stored) return null;
  return { monthlySavings: typed.trim() ? typed : null };
}
