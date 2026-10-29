import type { LessonCheck } from "./lesson-journey-types";

// Deliberately accepts numbers and simple fractions, never executable expressions.
function readNumber(input: string): number | null {
  const text = input.trim().replaceAll("−", "-");
  if (text.length > 80) return null;
  const decimal = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const fraction = new RegExp(`^(${decimal})\\s*/\\s*(${decimal})$`).exec(text);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  return new RegExp(`^${decimal}$`).test(text) && Number.isFinite(Number(text)) ? Number(text) : null;
}

export function gradeLessonCheck(check: LessonCheck, input: string): { correct: boolean; feedback: string } | null {
  if (check.kind === "choice") {
    const choice = check.choices.find((item) => item.id === input);
    if (!choice) return null;
    const correct = choice.id === check.correctId;
    return { correct, feedback: correct ? check.explanation : choice.feedback };
  }
  const value = readNumber(input);
  if (value === null || !Number.isFinite(value)) return null;
  const correct = Math.abs(value - check.answer) <= (check.tolerance ?? 1e-9);
  const misconception = check.commonMistakes?.find((item) => Math.abs(value - item.answer) <= 1e-9);
  return { correct, feedback: correct ? check.explanation : misconception?.feedback ?? check.wrongFeedback };
}
