// The text of shared.ts for a full table ("Je hebt het maximum bereikt. Verwijder eerst iets."), which cannot be acted
// on for goals: archived goals count and there is no delete. helpers.test.ts keeps the two in step.
const CAP_REACHED = "Je hebt het maximum bereikt. Verwijder eerst iets.";

export const goalError = (error: string) => (error === CAP_REACHED ? "Je hebt het maximum van 50 doelen bereikt." : error);
