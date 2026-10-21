export type Level = 1 | 2 | 3 | 4 | 5;
export type Certainty = { level: Level; reason: string };

export const CERTAINTY_LABEL: Record<Level, string> = { 5: "zeker", 4: "vrij zeker", 3: "laten nakijken", 2: "schatting", 1: "gok" };

// Spec 5.7: a calculation is as sure as its weakest input, and never above 4.
export function derived(inputs: Level[], reason: string): Certainty {
  return { level: Math.min(4, ...inputs) as Level, reason };
}
