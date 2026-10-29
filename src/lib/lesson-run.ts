import type { LessonJourney } from "./lesson-journey-types";
import type { LessonAttempt, LessonDraft } from "./learning-session";
import { gradeLessonCheck } from "./lesson-check";

export const EMPTY_LESSON_ATTEMPT: LessonAttempt = { input: "", tries: 0, correct: false, submitted: false, assisted: false, hint: false, usedHint: false, why: false, feedback: "", invalid: false, firstTryCorrect: false };

/** Changed teaching content cannot silently reuse answers to older questions. */
export function lessonContentVersion(value: unknown) {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return `learn-v2:${(hash >>> 0).toString(16)}`;
}
export function lessonRunStats(journey: LessonJourney, attempts: Record<string, LessonAttempt>) {
  const checks = journey.slides.filter(slide => slide.check).map(slide => attempts[slide.id] ?? EMPTY_LESSON_ATTEMPT);
  return { total: checks.length, answered: checks.filter(a => a.correct && !a.assisted).length,
    assisted: checks.filter(a => a.assisted).length,
    firstTryCorrect: checks.filter(a => a.firstTryCorrect && a.correct && a.tries === 1 && !a.usedHint && !a.assisted).length,
    hintsUsed: checks.filter(a => a.usedHint).length, attempts: checks.reduce((n,a) => n + a.tries, 0),
    complete: checks.length > 0 && checks.every(a => a.correct || a.assisted) };
}
export function restoreLessonRun(journey: LessonJourney, draft: LessonDraft | null | undefined) {
  if (!draft || draft.contentVersion !== lessonContentVersion(journey)) return null;
  const attempts = Object.fromEntries(journey.slides.filter(slide => draft.attempts[slide.id]).map(slide => {
    const attempt = draft.attempts[slide.id];
    // Recheck persisted correctness against the current exercise, rather than
    // trusting a stale/malformed flag to unlock a completion screen.
    if (slide.check && attempt.correct && !attempt.assisted && !gradeLessonCheck(slide.check, attempt.input)?.correct) {
      return [slide.id, { ...attempt, correct: false, firstTryCorrect: false, submitted: false, feedback: "" }];
    }
    return [slide.id, attempt];
  }));
  const unresolved = journey.slides.findIndex(slide => slide.check && !(attempts[slide.id]?.correct || attempts[slide.id]?.assisted));
  const requested = Math.max(0, Math.min(journey.slides.length, draft.step));
  return { attempts, step: unresolved >= 0 ? Math.min(requested, unresolved) : requested };
}
