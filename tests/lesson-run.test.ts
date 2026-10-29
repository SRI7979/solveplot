import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_LESSON_ATTEMPT as empty, lessonContentVersion, lessonRunStats, restoreLessonRun } from "../src/lib/lesson-run";
import type { LessonJourney } from "../src/lib/lesson-journey-types";
import type { LessonAttempt, LessonDraft } from "../src/lib/learning-session";

const calculator = { caption: "", expressions: [], bounds: null };
const journey: LessonJourney = { prerequisite: "", summary: ["Read the output"], slides: [
  { id: "watch", title: "Watch", phase: "Watch", body: ["Define the function."], calculator },
  { id: "try", title: "Try", phase: "Try it", body: ["Read f(2)."], calculator, check: { kind: "number", answer: 8, hint: "Evaluate the function", explanation: "The output is 8.", wrongFeedback: "Read the output.", solution: ["Type f(2)."] } },
  { id: "transfer", title: "Transfer", phase: "Check", body: ["Read g(3)."], calculator, check: { kind: "number", answer: 12, hint: "Use g", explanation: "The output is 12.", wrongFeedback: "Read the new rule.", solution: ["Type g(3)."] } },
] };
const correct = (input: string): LessonAttempt => ({ ...empty, input, tries: 1, correct: true, submitted: true, firstTryCorrect: true });
const draft = (step: number, attempts: Record<string, LessonAttempt>): LessonDraft => ({ version: 1, contentVersion: lessonContentVersion(journey), step, attempts, updatedAt: "2026-10-26T12:00:00Z" });

test("resume retains valid answers and cannot skip unresolved checks", () => {
  assert.equal(restoreLessonRun(journey, draft(3, {}))?.step, 1);
  const restored = restoreLessonRun(journey, draft(3, { try: correct("8") }));
  assert.equal(restored?.step, 2);
  assert.equal(restored?.attempts.try.input, "8");
  assert.equal(restoreLessonRun(journey, { ...draft(2, {}), contentVersion: "old-v1" }), null);
});
test("an incorrect stored answer cannot keep a stale correct flag", () => {
  const restored = restoreLessonRun(journey, draft(3, { try: correct("9"), transfer: correct("12") }));
  assert.equal(restored?.step, 1);
  assert.equal(restored?.attempts.try.correct, false);
});
test("completion includes worked-through exercises but reports first-try and hints separately", () => {
  const attempts = { try: correct("8"), transfer: { ...empty, tries: 2, assisted: true, usedHint: true } };
  assert.equal(restoreLessonRun(journey, draft(3, attempts))?.step, 3);
  assert.deepEqual(lessonRunStats(journey, attempts), { total: 2, answered: 1, assisted: 1, firstTryCorrect: 1, hintsUsed: 1, attempts: 3, complete: true });
  assert.equal(lessonRunStats(journey, { try: correct("8") }).complete, false);
});
test("retries and hints cannot be counted as first-try successes", () => {
  const attempts = { try: { ...correct("8"), tries: 2 }, transfer: { ...correct("12"), usedHint: true, hint: false } };
  assert.equal(lessonRunStats(journey, attempts).firstTryCorrect, 0);
  assert.equal(lessonRunStats(journey, attempts).complete, true);
});
