/** A resumable learner session. This is user progress, not a certified exam result. */
export type LessonAttempt = {
  input: string;
  tries: number;
  correct: boolean;
  submitted: boolean;
  assisted: boolean;
  hint: boolean;
  usedHint: boolean;
  why: boolean;
  feedback: string;
  invalid: boolean;
  firstTryCorrect: boolean;
};

export type LessonDraft = {
  version: 1;
  contentVersion: string;
  step: number;
  attempts: Record<string, LessonAttempt>;
  updatedAt: string;
  /** Explicit completion distinguishes a fresh repeat from an older finished run. */
  completed?: boolean;
};

const flags = ["correct", "submitted", "assisted", "hint", "usedHint", "why", "invalid", "firstTryCorrect"] as const;
function object(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }

/** Bound local and remote payloads; the player separately checks its authored content version. */
export function parseLessonDraft(value: unknown): LessonDraft | null {
  if (!object(value) || value.version !== 1 || typeof value.contentVersion !== "string" || !/^[a-zA-Z0-9:._-]{1,100}$/.test(value.contentVersion) ||
      !Number.isInteger(value.step) || (value.step as number) < 0 || (value.step as number) > 80 ||
      typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)) || (value.completed !== undefined && typeof value.completed !== "boolean") || !object(value.attempts) || Object.keys(value.attempts).length > 40) return null;
  const attempts: Record<string, LessonAttempt> = {};
  for (const [id, attempt] of Object.entries(value.attempts)) {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(id) || ["constructor", "prototype"].includes(id) || !object(attempt) ||
        typeof attempt.input !== "string" || attempt.input.length > 80 || typeof attempt.feedback !== "string" || attempt.feedback.length > 1500 ||
        !Number.isInteger(attempt.tries) || (attempt.tries as number) < 0 || (attempt.tries as number) > 200 || flags.some(flag => typeof attempt[flag] !== "boolean")) return null;
    attempts[id] = { input: attempt.input, tries: attempt.tries as number, correct: attempt.correct as boolean,
      submitted: attempt.submitted as boolean, assisted: attempt.assisted as boolean, hint: attempt.hint as boolean,
      usedHint: attempt.usedHint as boolean, why: attempt.why as boolean, feedback: attempt.feedback,
      invalid: attempt.invalid as boolean, firstTryCorrect: attempt.firstTryCorrect as boolean };
  }
  return { version: 1, contentVersion: value.contentVersion, step: value.step as number, attempts, updatedAt: value.updatedAt, ...(typeof value.completed === "boolean" ? { completed: value.completed } : {}) };
}
