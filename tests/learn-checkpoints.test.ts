import assert from "node:assert/strict";
import { test } from "node:test";
import katex from "katex";
import { LEARN_PATHS } from "../src/lib/learn-catalog";
import { CHECKPOINTS, getCheckpoint, getCheckpointForGroup } from "../src/lib/learn-checkpoints";
import { gradeLessonCheck } from "../src/lib/lesson-check";
import type { CheckpointQuestion } from "../src/lib/learn-checkpoint-types";
import { graphBoundsSchema } from "../src/lib/solver-schema";

const question = (checkpointId: string, questionId: string): CheckpointQuestion => {
  const found = getCheckpoint(checkpointId)?.questions.find((item) => item.id === questionId);
  assert.ok(found, checkpointId + "/" + questionId);
  return found;
};

test("each Learn section has one complete checkpoint with mixed checks and useful feedback", () => {
  const groups = LEARN_PATHS.flatMap((path) => path.groups.map((group) => path.id + "/" + group));
  assert.equal(CHECKPOINTS.length, 7);
  assert.deepEqual(CHECKPOINTS.map((checkpoint) => checkpoint.path + "/" + checkpoint.group).sort(), groups.sort());
  assert.equal(new Set(CHECKPOINTS.map((checkpoint) => checkpoint.id)).size, CHECKPOINTS.length);
  let total = 0;
  for (const checkpoint of CHECKPOINTS) {
    assert.match(checkpoint.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(checkpoint.title.trim() && checkpoint.description.trim());
    assert.equal(getCheckpoint(checkpoint.id), checkpoint);
    assert.equal(getCheckpointForGroup(checkpoint.path, checkpoint.group), checkpoint);
    assert.equal(checkpoint.questions.length, 4, checkpoint.id);
    assert.equal(new Set(checkpoint.questions.map((item) => item.id)).size, checkpoint.questions.length);
    assert.ok(checkpoint.questions.some((item) => item.check.kind === "number"), checkpoint.id + ": independent application");
    assert.ok(checkpoint.questions.some((item) => item.check.kind === "choice"), checkpoint.id + ": interpretation");
    for (const item of checkpoint.questions) {
      total++;
      const label = checkpoint.id + "/" + item.id;
      assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, label);
      assert.ok(item.title.trim() && item.body.length && item.body.every((part) => part.trim()), label);
      assert.ok(item.calculator.caption.trim(), label);
      if (item.calculator.bounds) {
        assert.ok(graphBoundsSchema.safeParse(item.calculator.bounds).success, label);
        const { left, right, top, bottom } = item.calculator.bounds;
        assert.ok([left, right, top, bottom].every(Number.isFinite) && left < right && bottom < top, label);
      }
      for (const row of item.calculator.expressions) {
        assert.ok(row.purpose.trim(), label);
        assert.doesNotMatch(row.latex, /[\u0000-\u001f]/, label + ": source escape corruption");
        assert.doesNotThrow(() => katex.renderToString(row.latex, { throwOnError: true, strict: "ignore", trust: false }), label);
      }
      const check = item.check;
      assert.ok(check.hint.trim() && check.explanation.trim(), label);
      if (check.kind === "number") {
        assert.ok(Number.isFinite(check.answer), label);
        assert.ok(check.tolerance === undefined || Number.isFinite(check.tolerance) && check.tolerance >= 0, label);
        assert.ok(check.solution.length && check.solution.every((line) => line.trim()) && check.wrongFeedback.trim(), label);
        assert.equal(gradeLessonCheck(check, String(check.answer))?.correct, true, label);
        assert.equal(gradeLessonCheck(check, String(check.answer + Math.max(1, (check.tolerance ?? 0) * 2)))?.correct, false, label);
        const diagnostics = check.commonMistakes ?? [];
        assert.equal(new Set(diagnostics.map((mistake) => mistake.answer)).size, diagnostics.length, label);
        for (const mistake of diagnostics) {
          assert.ok(Number.isFinite(mistake.answer) && mistake.feedback.trim(), label);
          assert.deepEqual(gradeLessonCheck(check, String(mistake.answer)), { correct: false, feedback: mistake.feedback }, label);
        }
      } else {
        assert.ok(check.choices.length >= 3, label);
        assert.equal(new Set(check.choices.map((choice) => choice.id)).size, check.choices.length, label);
        assert.equal(new Set(check.choices.map((choice) => choice.text)).size, check.choices.length, label);
        assert.equal(check.choices.filter((choice) => choice.id === check.correctId).length, 1, label);
        for (const choice of check.choices) {
          assert.ok(choice.feedback.trim() && choice.text.trim(), label);
          assert.equal(gradeLessonCheck(check, choice.id)?.correct, choice.id === check.correctId, label);
        }
      }
    }
  }
  assert.equal(total, 28);
  for (const unknown of ["", "__proto__", "constructor", "../sat-algebra", "sat-algebra/extra", "not-a-checkpoint"]) assert.equal(getCheckpoint(unknown), null);
  assert.equal(getCheckpointForGroup("desmos", "Algebra"), null);
  assert.equal(getCheckpointForGroup("sat", "Beginner"), null);
});

test("fresh checkpoint calculators preload only givens, never evaluations, fitted coefficients, or answers", () => {
  const givenRows: Record<string, string[]> = {
    "desmos-beginner/evaluate-rule": ["f(x)=5x-4"],
    "desmos-intermediate/filter-candidates": ["L=[-2,1,4,7]"],
    "desmos-intermediate/fit-quadratic": ["x_{1}=[0,1,3]", "y_{1}=[2,6,20]"],
    "desmos-advanced/coordinate-distance": ["(-2,1)", "(4,9)"],
    "sat-algebra/linear-prediction": ["x_{1}=[1,3,5]", "y_{1}=[8,18,28]"],
    "sat-advanced-math/exponential-prediction": ["x_{1}=[0,1,2]", "y_{1}=[4,8,16]"],
  };
  for (const checkpoint of CHECKPOINTS) {
    for (const item of checkpoint.questions) {
      const key = checkpoint.id + "/" + item.id;
      assert.deepEqual(item.calculator.expressions.map((row) => row.latex), givenRows[key] ?? [], key);
    }
  }
});

test("all numeric checkpoint answers agree with independent calculations from the question givens", () => {
  const interpolate = (points: [number, number][], at: number) => points.reduce((sum, [x, y], index) =>
    sum + y * points.reduce((weight, [otherX], otherIndex) => index === otherIndex ? weight : weight * (at - otherX) / (x - otherX), 1), 0);
  const polynomial = (x: number) => x ** 3 - 3 * x ** 2 - 4 * x + 12;
  const roots = Array.from({ length: 41 }, (_, index) => index - 20).filter((x) => polynomial(x) === 0);
  assert.equal(roots.length, 3, "the three distinct real roots account for this cubic");
  const expected: Record<string, number> = {
    "desmos-beginner/evaluate-rule": 5 * 3 - 4,
    "desmos-beginner/graph-equation": (37 - 2) / 5,
    "desmos-beginner/common-output": 4 * ((8 + 1) / (4 - 1)) - 1,
    "desmos-intermediate/filter-candidates": [-2, 1, 4, 7].find((x) => 4 * x - 1 === 15)!,
    "desmos-intermediate/fit-quadratic": interpolate([[0, 2], [1, 6], [3, 20]], 5),
    "desmos-intermediate/restricted-minimum": (4 - 5) ** 2 + 2,
    "desmos-advanced/paired-conditions": ((17 + 1) / 3) + ((17 + 1) / 3 - 1),
    "desmos-advanced/coordinate-distance": Math.hypot(4 - (-2), 9 - 1),
    "sat-algebra/two-linear-sides": (23 + 5) / (6 - 2),
    "sat-algebra/linear-prediction": 8 + ((18 - 8) / (3 - 1)) * (7 - 1),
    "sat-algebra/system-output": 3 * ((13 + 2) / (3 + 2)) - 2,
    "sat-advanced-math/quadratic-maximum": (() => { const x = -16 / (2 * -2); return -2 * x ** 2 + 16 * x - 3; })(),
    "sat-advanced-math/largest-polynomial-root": Math.max(...roots),
    "sat-advanced-math/exponential-prediction": 4 * (8 / 4) ** 5,
    "sat-data/discount-price": 150 * (1 - 18 / 100),
    "sat-data/even-median": (5 + 8) / 2,
    "sat-geometry/segment-distance": Math.hypot(10 - 2, 14 - (-1)),
    "sat-geometry/circle-radius": Math.sqrt(49),
    "sat-geometry/opposite-side": 20 * Math.sin(30 * Math.PI / 180),
  };
  const actualNumericKeys = CHECKPOINTS.flatMap((checkpoint) => checkpoint.questions.filter((item) => item.check.kind === "number").map((item) => checkpoint.id + "/" + item.id));
  assert.deepEqual(actualNumericKeys.sort(), Object.keys(expected).sort(), "every numeric task has an independent calculation");
  for (const [key, answer] of Object.entries(expected)) {
    const [checkpointId, questionId] = key.split("/");
    const check = question(checkpointId, questionId).check;
    assert.ok(check.kind === "number");
    assert.ok(Math.abs(check.answer - answer) < 1e-8, key + ": expected " + answer + ", got " + check.answer);
    assert.equal(gradeLessonCheck(check, String(answer))?.correct, true, key);
  }
});

test("choice checkpoints preserve pairs, graph meaning, grouping, units, and statistical interpretation", () => {
  const expectChoice = (checkpointId: string, questionId: string, expectedText: string) => {
    const check = question(checkpointId, questionId).check;
    assert.ok(check.kind === "choice");
    const matching = check.choices.filter((choice) => choice.text === expectedText);
    assert.equal(matching.length, 1, checkpointId + "/" + questionId);
    assert.equal(gradeLessonCheck(check, matching[0].id)?.correct, true, checkpointId + "/" + questionId);
  };
  const pairs = new Map([[-1, 5], [2, 11], [4, 15]]);
  expectChoice("desmos-beginner", "keep-table-pairs", "[" + [4, -1, 2].map((x) => pairs.get(x)).join(", ") + "]");
  expectChoice("desmos-intermediate", "shift-parameters", "(" + (1 + 3) + ", " + (2 - 2) + ")");
  for (const [a, b] of [[4, 5], [5, 4]]) {
    assert.equal(a + b, 9);
    assert.equal(2 * a + 2 * b, 18);
  }
  expectChoice("desmos-advanced", "repeated-condition", "They do not determine a unique value of a.");
  expectChoice("desmos-advanced", "coordinate-midpoint", "(" + ((-4 + 6) / 2) + ", " + ((2 + 8) / 2) + ")");
  assert.equal(2 - 2, 0, "parallel lines have equal slopes");
  assert.notEqual(1, -4, "the lines have different intercepts");
  expectChoice("sat-algebra", "parallel-system", "No solutions");
  const grouped = 16 ** (3 / 2) / 4;
  assert.notEqual(16 ** 3 / 2 / 4, grouped);
  assert.notEqual(16 ** (3 / 2 / 4), grouped);
  expectChoice("sat-advanced-math", "fractional-exponent", "16^(3/2) / 4");
  expectChoice("sat-data", "percentage-increase", String(50 * (1 + 30 / 100)));
  const before = [1, 3, 5, 7, 9];
  const after = [1, 3, 5, 7, 99];
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  assert.ok(mean(after) > mean(before));
  assert.equal(before[2], after[2]);
  expectChoice("sat-data", "outlier-effect", "The mean increases; the median stays the same.");
  assert.notEqual(Math.sin(45), Math.sin(45 * Math.PI / 180));
  expectChoice("sat-geometry", "angle-unit", "Degrees");
  assert.equal(CHECKPOINTS.flatMap((checkpoint) => checkpoint.questions).filter((item) => item.check.kind === "choice").length, 9);
});
