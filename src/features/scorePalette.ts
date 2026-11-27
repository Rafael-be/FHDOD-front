export const scorePalette: Readonly<Record<number, string>> = {
  1: "#DC2626",
  2: "#F97316",
  3: "#EAB308",
  4: "#84CC16",
  5: "#16A34A",
};

export function scoreColor(score: number): string {
  return scorePalette[score] ?? "#64748B";
}
