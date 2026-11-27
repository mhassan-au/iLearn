// Translate stored difficulty values into learner-facing labels.
export function difficultyLabel(difficulty: string) {
  if (difficulty === "advanced") return "Advanced";
  if (difficulty === "intermediate") return "Applied";
  return "Foundational";
}
