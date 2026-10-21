// The text of shared.ts for a full table ("Je hebt het maximum bereikt. Verwijder eerst iets."), which cannot be acted
// on for goals: archived goals count and there is no delete. helpers.test.ts keeps the two in step.
const CAP_REACHED = "Je hebt het maximum bereikt. Verwijder eerst iets.";

export const goalError = (error: string) => (error === CAP_REACHED ? "Je hebt het maximum van 50 doelen bereikt." : error);

// The order of `ids` after moving one place up (-1) or down (1); at the edge nothing changes.
export function moved(ids: string[], id: string, by: -1 | 1): string[] {
  const from = ids.indexOf(id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}
