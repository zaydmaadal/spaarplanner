// The pot colour tokens of DESIGN.md. A goal gets the next one on creation, by the number of goals the user has.
export const potToken = (count: number) => `pot-${(count % 4) + 1}`;
