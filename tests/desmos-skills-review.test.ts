import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { LESSONS } from "../src/lib/learn-catalog";
import { DESMOS_JOURNEYS } from "../src/content/lessons/desmos-journeys";
import { gradeLessonCheck } from "../src/lib/lesson-check";
import type { LessonJourney } from "../src/lib/lesson-journey-types";
import { EMPTY_LESSON_ATTEMPT, lessonContentVersion, lessonRunStats, restoreLessonRun } from "../src/lib/lesson-run";
import type { LessonAttempt } from "../src/lib/learning-session";

const skills: Record<string, LessonJourney> = DESMOS_JOURNEYS;

test("all twelve Desmos skills teach, diagnose, explore, and independently transfer", () => {
  const slugs = LESSONS.filter(lesson => lesson.path === "desmos").map(lesson => lesson.slug);
  assert.equal(slugs.length, 12);
  assert.deepEqual(Object.keys(skills).sort(), [...slugs].sort());
  for (const slug of slugs) {
    const journey = skills[slug];
    assert.ok(journey.slides.length >= 9 && journey.slides.length <= 11, `${slug}: short coherent sequence`);
    const checks = journey.slides.filter(slide => slide.check);
    assert.ok(checks.length >= 4 && checks.length <= 5, `${slug}: active checks, not a passive slideshow`);
    assert.ok(checks.filter(slide => slide.check?.kind === "number").length >= 2, `${slug}: two independently entered readouts`);
    assert.ok(checks.some(slide => slide.check?.kind === "choice"), `${slug}: diagnose understanding as well as calculation`);
    assert.ok(journey.slides.some(slide => slide.phase === "Explore"), `${slug}: hands-on exploration`);
    assert.ok(journey.slides.some(slide => slide.visual), `${slug}: a visual representation`);
    assert.ok(journey.slides.some(slide => slide.entries?.length), `${slug}: worked calculator entries`);
    assert.equal(journey.slides.at(-1)?.phase, "Understand", `${slug}: finish with a useful recap`);
    assert.ok(journey.summary.length >= 2, `${slug}: takeaway`);
  }
});

test("every entered-answer check agrees with an independent calculation of its own givens", () => {
  const expected: Record<string, number> = {
    "introduction-to-desmos/evaluate-a-new-input": 3 * 7 + 2,
    "introduction-to-desmos/use-a-new-function": 4 * 6 - 3,
    "graphing-equations/try-it": (25 + 3) / 4,
    "graphing-equations/solve-for-y": (16 + 4) / 5,
    "tables/try-it": 3 * 5 + 1,
    "tables/read-a-new-table": -2 * 3 + 8,
    "intersections-and-intercepts/try-it": 3 * ((10 + 2) / (3 + 1)) - 2,
    "intersections-and-intercepts/choose-the-right-zero": 1 + Math.sqrt(9),
    "sliders/try-it": (8 + 2) / 4,
    "sliders/fit-a-different-parameter": 11 - 2 * 3,
    "lists/try-it": Math.max(...[-2, 1, 3].map(x => x * x - 2 * x)),
    "lists/filter-and-count": [-3, 0, 2, 5].filter(x => x > 1).length,
    "regression/try-it": (5 + 1) ** 2,
    "regression/fit-and-transfer": 4 ** 2 + 2 * 4 + 3,
    "functions-and-transformations/try-it": ((4 - 2) - 1) ** 2 + 2 + 3,
    "functions-and-transformations/transfer-a-vertical-shift": (-1 + 1) ** 2 - 3 + 4,
    "restrictions/try-it": (3 - 4) ** 2 + 1,
    "restrictions/find-an-allowed-vertex": -((2 - 2) ** 2) + 9,
    "answer-choice-testing/try-it": [-2, 1, 4, 7].find(x => 3 * x - 2 === 10)!,
    "answer-choice-testing/keep-every-condition": [-3, -1, 2, 3].find(x => x * x === 9 && x < 0)!,
    "bracket-regression/try-it": 5 + 3,
    "bracket-regression/use-zero-output-conditions": -2 * (1 + -3) + 2 * 1 * -3,
    "advanced-desmos-shortcuts/try-it": Math.hypot(2 - -1, 6 - 2),
    "advanced-desmos-shortcuts/use-a-new-midpoint": (1 + 7) / 2,
  };
  const actual = Object.entries(skills).flatMap(([slug, journey]) => journey.slides.flatMap(slide => slide.check?.kind === "number" ? [{ key: `${slug}/${slide.id}`, check: slide.check }] : []));
  assert.equal(actual.length, 24);
  assert.equal(Object.keys(expected).length, actual.length);
  for (const { key, check } of actual) {
    assert.equal(check.answer, expected[key], key);
    assert.equal(gradeLessonCheck(check, String(expected[key]))?.correct, true, key);
  }
});

test("real-engine audit fixture covers all seeded setups and every numeric exercise without prefilled student answers", () => {
  const fixture = JSON.parse(readFileSync("tests/fixtures/desmos-skills-review-audit.json", "utf8")) as { fullResults: { id: string; slides?: string[]; result: { solution: { expressions: { latex: string; slider?: unknown }[] } } }[]; readoutChecks: { id: string; lesson: string; slide: string; studentAnswer: number; expected: { kind: string } }[] };
  const seeded = fixture.fullResults.filter(item => item.id.startsWith("seed/"));
  const covered = new Set(seeded.flatMap(item => item.slides ?? []));
  const setupKey = (rows: { latex: string; slider?: unknown }[]) => JSON.stringify(rows.map(({ latex, slider }) => ({ latex, ...(slider ? { slider } : {}) })));
  for (const [slug, journey] of Object.entries(skills)) for (const slide of journey.slides) {
    const path = `${slug}/${slide.id}`;
    assert.ok(covered.has(path));
    const captured = seeded.find(item => item.slides?.includes(path));
    assert.equal(setupKey(captured!.result.solution.expressions), setupKey(slide.calculator.expressions), `${path}: audit the current setup, not a stale earlier slide`);
  }
  assert.equal(fixture.readoutChecks.length, 24);
  for (const item of fixture.readoutChecks) {
    const slide = skills[item.lesson].slides.find(slide => slide.id === item.slide)!;
    assert.equal(slide.check?.kind, "number");
    if (slide.check?.kind === "number") assert.equal(item.studentAnswer, slide.check.answer);
    const completed = fixture.fullResults.find(plan => plan.id === item.id);
    assert.ok(completed && completed.result.solution.expressions.length, item.id);
    if (["number", "list-entry"].includes(item.expected.kind)) {
      assert.notDeepEqual(slide.calculator.expressions.map(row => row.latex), completed.result.solution.expressions.map(row => row.latex), `${item.id}: numeric readout is not prefilled`);
    }
  }
});

test("all twelve authored journeys integrate with completion, honest hint statistics, and safe resume", () => {
  for (const [slug, journey] of Object.entries(skills)) {
    const attempts: Record<string, LessonAttempt> = {};
    const checks = journey.slides.filter(slide => slide.check);
    for (const slide of checks) {
      const check = slide.check!;
      attempts[slide.id] = { ...EMPTY_LESSON_ATTEMPT, input: check.kind === "choice" ? check.correctId : String(check.answer), tries: 1, correct: true, submitted: true, firstTryCorrect: true };
    }
    const stats = lessonRunStats(journey, attempts);
    assert.equal(stats.complete, true, slug);
    assert.equal(stats.total, checks.length, slug);
    assert.equal(stats.firstTryCorrect, checks.length, slug);
    const draft = { version: 1 as const, contentVersion: lessonContentVersion(journey), step: journey.slides.length, attempts, completed: true, updatedAt: "2026-10-26T15:00:00.000Z" };
    assert.equal(restoreLessonRun(journey, draft)?.step, journey.slides.length, slug);
    const first = checks[0];
    const withHint = { ...attempts, [first.id]: { ...attempts[first.id], usedHint: true } };
    assert.equal(lessonRunStats(journey, withHint).firstTryCorrect, checks.length - 1, `${slug}: hints do not become unassisted first tries`);
    const assisted = { ...attempts, [first.id]: { ...attempts[first.id], correct: false, assisted: true, firstTryCorrect: false } };
    assert.equal(lessonRunStats(journey, assisted).complete, true, `${slug}: worked explanations can finish an exercise`);
    assert.equal(lessonRunStats(journey, assisted).assisted, 1, slug);
    const corrupted = { ...attempts, [first.id]: { ...attempts[first.id], input: "invalid" } };
    assert.equal(restoreLessonRun(journey, { ...draft, attempts: corrupted })?.step, journey.slides.indexOf(first), `${slug}: stale correct flags cannot skip an unresolved exercise`);
  }
});
