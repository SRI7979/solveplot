import assert from "node:assert/strict";
import { test } from "node:test";
import katex from "katex";
import { LESSONS } from "../src/lib/learn-catalog";
import { getLessonJourney } from "../src/lib/lesson-journeys";
import { gradeLessonCheck } from "../src/lib/lesson-check";
import type { LessonCheck } from "../src/lib/lesson-journey-types";
import { graphBoundsSchema } from "../src/lib/solver-schema";

test("all 24 catalog lessons have a complete slide journey with independent checks", () => {
  assert.equal(LESSONS.length, 24);
  for (const lesson of LESSONS) {
    const journey = getLessonJourney(lesson.slug);
    assert.ok(journey, lesson.slug);
    assert.ok(journey.prerequisite.trim(), `${lesson.slug}: prerequisites`);
    assert.ok(journey.summary.length >= 2 && journey.summary.every((item) => item.trim()), `${lesson.slug}: useful recap`);
    assert.ok(journey.slides.length >= 5, `${lesson.slug}: teaching sequence`);
    assert.equal(new Set(journey.slides.map((slide) => slide.id)).size, journey.slides.length, `${lesson.slug}: distinct slide IDs`);
    assert.ok(journey.slides.findIndex((slide) => slide.check) > 0, `${lesson.slug}: instruction before assessment`);
    const checks = journey.slides.flatMap((slide) => slide.check ? [slide.check] : []);
    assert.ok(checks.length >= 2, `${lesson.slug}: at least two checks`);
    assert.ok(checks.some((check) => check.kind === "number"), `${lesson.slug}: student supplies a calculated answer`);
    for (const slide of journey.slides) {
      const label = `${lesson.slug}/${slide.id}`;
      assert.match(slide.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, label);
      assert.ok(slide.title.trim() && slide.body.length && slide.body.every((part) => part.trim()), label);
      assert.ok(slide.calculator.caption.trim(), `${label}: calculator context`);
      if (slide.calculator.bounds !== null) {
        assert.ok(graphBoundsSchema.safeParse(slide.calculator.bounds).success, `${label}: graph bounds`);
        const { left, right, bottom, top } = slide.calculator.bounds;
        assert.ok([left, right, bottom, top].every(Number.isFinite) && left < right && bottom < top, `${label}: visible graph window`);
      }
      for (const expression of slide.calculator.expressions) {
        assert.ok(expression.latex.trim() && expression.purpose.trim(), `${label}: usable expression`);
        if (expression.slider) {
          const { min, max, step } = expression.slider;
          assert.ok([min, max, step].every(Number.isFinite) && min < max && step > 0 && step <= max - min, `${label}: valid slider`);
          const assignment = /^[a-zA-Z]=(-?\d+(?:\.\d+)?)$/.exec(expression.latex);
          assert.ok(assignment, `${label}: slider has a numeric starting value`);
          const initial = Number(assignment[1]);
          assert.ok(initial >= min && initial <= max && Math.abs((initial - min) / step - Math.round((initial - min) / step)) < 1e-8, `${label}: slider starts on its allowed grid`);
        }
      }
      if (slide.visual?.kind === "table") {
        assert.ok(slide.visual.columns.length >= 2 && slide.visual.rows.length > 0, `${label}: populated table`);
        for (const row of slide.visual.rows) assert.equal(row.length, slide.visual.columns.length, `${label}: aligned table data`);
      }
      for (const entry of slide.entries ?? []) assert.ok(entry.latex.trim() && entry.label.trim(), `${label}: copyable entry`);
      const math = [
        ...slide.calculator.expressions.map((expression) => expression.latex),
        ...(slide.entries ?? []).map((entry) => entry.latex),
        ...(slide.visual && slide.visual.kind !== "table" ? slide.visual.items.flatMap((item) => item.math ? [item.math] : []) : []),
      ];
      for (const latex of math) {
        assert.doesNotMatch(latex, /[\u0000-\u001f]/, `${label}: no accidental control characters from source escapes`);
        assert.doesNotThrow(() => katex.renderToString(latex, { throwOnError: true, strict: "ignore", trust: false }), `${label}: renderable math ${latex}`);
      }
      const check = slide.check;
      if (!check) continue;
      assert.ok(check.hint.trim() && check.explanation.trim(), `${label}: feedback`);
      if (check.kind === "choice") {
        assert.ok(check.choices.length >= 2, label);
        assert.equal(new Set(check.choices.map((choice) => choice.id)).size, check.choices.length, `${label}: distinct choice IDs`);
        assert.equal(new Set(check.choices.map((choice) => choice.text)).size, check.choices.length, `${label}: distinct options`);
        assert.equal(check.choices.filter((choice) => choice.id === check.correctId).length, 1, `${label}: one correct option`);
        for (const choice of check.choices) {
          assert.ok(choice.text.trim() && choice.feedback.trim(), label);
          assert.equal(gradeLessonCheck(check, choice.id)?.correct, choice.id === check.correctId, `${label}: grade every option`);
        }
      } else {
        assert.ok(Number.isFinite(check.answer), `${label}: finite answer`);
        assert.ok(check.tolerance === undefined || Number.isFinite(check.tolerance) && check.tolerance >= 0, `${label}: finite tolerance`);
        assert.ok(check.wrongFeedback.trim() && check.solution.length && check.solution.every((line) => line.trim()), `${label}: meaningful correction`);
        assert.equal(gradeLessonCheck(check, String(check.answer))?.correct, true, `${label}: accept correct input`);
        assert.equal(gradeLessonCheck(check, String(check.answer + Math.max(1, 2 * (check.tolerance ?? 0))))?.correct, false, `${label}: reject wrong input`);
        for (const mistake of check.commonMistakes ?? []) {
          assert.ok(Number.isFinite(mistake.answer) && mistake.feedback.trim(), `${label}: valid diagnostic`);
          assert.ok(Math.abs(mistake.answer - check.answer) > (check.tolerance ?? 1e-9), `${label}: mistaken answer is not correct`);
          assert.deepEqual(gradeLessonCheck(check, String(mistake.answer)), { correct: false, feedback: mistake.feedback }, `${label}: targeted feedback`);
        }
      }
    }
  }
  for (const unknown of ["", "unknown", "__proto__", "constructor", "../regression", "regression/extra"]) assert.equal(getLessonJourney(unknown), null);
});

test("lesson answer grading accepts equivalent numeric entries and rejects invalid calculations", () => {
  const numeric: LessonCheck = { kind: "number", answer: -2.5, hint: "Read the requested coordinate.", explanation: "That is the requested coordinate.", wrongFeedback: "Check whether you read x or y.", solution: ["Read the labeled x-coordinate."], commonMistakes: [{ answer: 2.5, feedback: "Keep the minus sign from the coordinate." }] };
  for (const answer of ["-2.5", " -2.50 ", "-5/2", "5/-2", "−2.5"]) assert.equal(gradeLessonCheck(numeric, answer)?.correct, true, answer);
  assert.deepEqual(gradeLessonCheck(numeric, "2.5"), { correct: false, feedback: "Keep the minus sign from the coordinate." });
  assert.deepEqual(gradeLessonCheck(numeric, "8"), { correct: false, feedback: numeric.wrongFeedback });
  for (const answer of ["", " ", "NaN", "Infinity", "1/0", "0/0", "2+3", "Math.sqrt(4)", "<script>", "2.5 units", "1/2/3"]) assert.equal(gradeLessonCheck(numeric, answer), null, answer);
  const rounded: LessonCheck = { ...numeric, answer: 36.9, tolerance: 0.05, commonMistakes: [] };
  assert.equal(gradeLessonCheck(rounded, "36.87")?.correct, true);
  assert.equal(gradeLessonCheck(rounded, "36.8")?.correct, false);
  const choice: LessonCheck = { kind: "choice", choices: [{ id: "x", text: "The x-coordinate", feedback: "Correct coordinate." }, { id: "y", text: "The y-coordinate", feedback: "This question asks for x." }], correctId: "x", hint: "Read the target.", explanation: "The target is x." };
  assert.equal(gradeLessonCheck(choice, "x")?.correct, true);
  assert.equal(gradeLessonCheck(choice, "y")?.correct, false);
  for (const answer of ["", "z", "The x-coordinate", "__proto__"]) assert.equal(gradeLessonCheck(choice, answer), null, answer);
});

test("every fresh numeric check agrees with mathematics calculated independently of the lesson answers", () => {
  const quadraticThrough = (points: [number, number][], at: number) => points.reduce((total, [x, y], index) =>
    total + y * points.reduce((weight, [otherX], otherIndex) => index === otherIndex ? weight : weight * (at - otherX) / (x - otherX), 1), 0);
  const output = (a: number, b: number, c: number, x: number) => a * x ** 2 + b * x + c;
  const minimumOn = (a: number, b: number, c: number, lower: number, upper: number) => {
    const vertex = -b / (2 * a);
    const candidates = [lower, upper, ...(vertex >= lower && vertex <= upper ? [vertex] : [])];
    return Math.min(...candidates.map((x) => output(a, b, c, x)));
  };
  const polynomial = (x: number) => x ** 3 - 4 * x ** 2 - 7 * x + 10;
  const integerRoots = Array.from({ length: 41 }, (_, i) => i - 20).filter((x) => polynomial(x) === 0);
  assert.equal(integerRoots.length, 3, "three distinct roots account for the entire cubic");
  const data = [3, 7, 7, 10, 13, 20].sort((a, b) => a - b);
  const f = (x: number) => (x - 1) ** 2 + 2;
  // Use the authored question's givens, never its answer or solution rows.
  const independentlyCalculated: Record<string, number[]> = {
    "introduction-to-desmos": [3 * 7 + 2, 4 * 6 - 3],
    "graphing-equations": [(25 + 3) / 4, (16 + 4) / 5],
    tables: [3 * 5 + 1, -2 * 3 + 8],
    "intersections-and-intercepts": [3 * ((10 + 2) / (3 + 1)) - 2, 1 + Math.sqrt(9)],
    sliders: [(8 + 2) / 4, 11 - 2 * 3],
    lists: [Math.max(...[-2, 1, 3].map((x) => x ** 2 - 2 * x)), [-3, 0, 2, 5].filter(x => x > 1).length],
    regression: [quadraticThrough([[0, 1], [2, 9], [3, 16]], 5), quadraticThrough([[0, 3], [1, 6], [2, 11]], 4)],
    "functions-and-transformations": [f(4 - 2) + 3, (-1 + 1) ** 2 - 3 + 4],
    restrictions: [minimumOn(1, -8, 17, 1, 3), output(-1, 4, 5, 2)],
    "answer-choice-testing": [[-2, 1, 4, 7].find((x) => 3 * x - 2 === 10)!, [-3, -1, 2, 3].find(x => x * x === 9 && x < 0)!],
    "bracket-regression": [((13 + 2) / 3) + ((13 + 2) / 3 - 2), -2 * (1 + -3) + 2 * 1 * -3],
    "advanced-desmos-shortcuts": [Math.hypot(2 - (-1), 6 - 2), (1 + 7) / 2],
    "linear-equations": [(9 + 3) / (4 - 1)],
    "linear-functions": [11 + (17 - 11) / (4 - 2) * (8 - 2)],
    "systems-of-equations": [(13 + 2) / (2 + 1) - 2],
    quadratics: [output(-2, 12, 1, -12 / (2 * -2))],
    polynomials: [Math.max(...integerRoots)],
    "exponents-and-radicals": [81 ** (3 / 2) / 9],
    "nonlinear-functions": [2 * (6 / 2) ** 3],
    "ratios-and-percentages": [120 * (1 - 15 / 100)],
    "statistics-and-data-analysis": [(data[data.length / 2 - 1] + data[data.length / 2]) / 2],
    geometry: [Math.hypot(8 - (-1), 14 - 2)],
    circles: [Math.sqrt(25)],
    trigonometry: [18 * Math.sin(30 * Math.PI / 180)],
  };
  assert.deepEqual(Object.keys(independentlyCalculated).sort(), LESSONS.map((lesson) => lesson.slug).sort());
  for (const lesson of LESSONS) {
    const fresh = getLessonJourney(lesson.slug)!.slides.filter((slide) => slide.check?.kind === "number");
    const expectedAnswers = independentlyCalculated[lesson.slug];
    assert.equal(fresh.length, expectedAnswers.length, `${lesson.slug}: each numeric check must have an independent calculation in this audit`);
    for (const [index, slide] of fresh.entries()) {
      const check = slide.check;
      assert.ok(check?.kind === "number");
      const expected = expectedAnswers[index];
      assert.ok(Math.abs(check.answer - expected) < 1e-8, `${lesson.slug}/${slide.id}: answer ${check.answer} should be ${expected}`);
      assert.equal(gradeLessonCheck(check, String(expected))?.correct, true, `${lesson.slug}/${slide.id}: independently computed answer accepted`);
    }
  }
});
