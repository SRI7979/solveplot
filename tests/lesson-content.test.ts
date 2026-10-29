import assert from "node:assert/strict";
import { test } from "node:test";

import { LESSONS } from "../src/lib/learn-catalog";
import { LESSON_CONTENT, getLessonContent, getLessonPracticeContext } from "../src/lib/lesson-content";
import { generatePracticeProblem, gradePracticeAnswer } from "../src/lib/practice-generation";
import { isTechniqueId, techniqueName } from "../src/lib/technique-vocabulary";
import { graphBoundsSchema } from "../src/lib/solver-schema";

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return (minimum: number, maximum: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return minimum + Math.floor((state / 0x100000000) * (maximum - minimum + 1));
  };
}

test("every catalog route has exactly one authored lesson and unknown routes have no practice context", () => {
  assert.equal(LESSON_CONTENT.length, 24);
  assert.equal(new Set(LESSON_CONTENT.map((lesson) => lesson.slug)).size, LESSON_CONTENT.length);
  assert.deepEqual(LESSON_CONTENT.map((lesson) => lesson.slug).sort(), LESSONS.map((lesson) => lesson.slug).sort());
  for (const entry of LESSONS) assert.equal(getLessonContent(entry.slug)?.slug, entry.slug);
  for (const invalid of ["", "not-a-lesson", "__proto__", "regression/extra", "../regression"]) {
    assert.equal(getLessonContent(invalid), null);
    assert.equal(getLessonPracticeContext(invalid), null);
  }
});

test("each short lesson has complete teaching, feedback, references, and valid related routes", () => {
  const catalogSlugs = new Set(LESSONS.map((lesson) => lesson.slug));
  for (const lesson of LESSON_CONTENT) {
    const label = lesson.slug;
    assert.ok(Number.isInteger(lesson.minutes) && lesson.minutes >= 5 && lesson.minutes <= 8, label);
    assert.ok(lesson.intro.trim() && lesson.objectives.length >= 2, label);
    assert.ok(lesson.sections.length >= 2 && lesson.sections.length <= 3, label);
    assert.ok(lesson.sections.every((section) => section.title.trim() && section.paragraphs.length && section.paragraphs.every((paragraph) => paragraph.trim())), label);
    assert.ok(lesson.example.steps.length >= 3 && lesson.example.steps.length <= 5, label);
    assert.ok(lesson.example.steps.every((step) => step.title.trim() && step.explanation.trim()), label);
    assert.ok(lesson.example.steps.some((step) => step.latex), `${label} has copyable worked entries`);
    assert.ok(lesson.example.answer.trim() && lesson.example.why.trim(), label);
    assert.ok(lesson.exploration.prompt.trim() && lesson.exploration.observations.length >= 2, label);
    assert.ok(lesson.pitfalls.length >= 2 && lesson.pitfalls.every((pitfall) => pitfall.trim()), label);
    assert.equal(lesson.checks.length, 2, label);
    assert.equal(new Set(lesson.checks.map((check) => check.id)).size, lesson.checks.length, `${label} check IDs`);
    for (const check of lesson.checks) {
      assert.match(check.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${label}/${check.id}`);
      assert.ok(check.question.trim() && check.explanation.trim(), `${label}/${check.id}`);
      assert.ok(check.choices.length >= 2, `${label}/${check.id}`);
      assert.equal(new Set(check.choices.map((choice) => choice.label)).size, check.choices.length, `${label}/${check.id} choice labels`);
      assert.equal(new Set(check.choices.map((choice) => choice.text)).size, check.choices.length, `${label}/${check.id} distinct choices`);
      assert.equal(check.choices.filter((choice) => choice.label === check.correctLabel).length, 1, `${label}/${check.id} has one valid answer`);
    }
    assert.ok(lesson.related.length >= 2, label);
    assert.equal(new Set(lesson.related).size, lesson.related.length, `${label} related links`);
    for (const related of lesson.related) {
      assert.ok(catalogSlugs.has(related), `${label} links to ${related}`);
      assert.notEqual(related, lesson.slug, `${label} does not link to itself`);
    }
    assert.ok(lesson.sources.length > 0, label);
    for (const source of lesson.sources) {
      const url = new URL(source.href);
      assert.equal(url.protocol, "https:", label);
      assert.ok(["help.desmos.com", "satsuite.collegeboard.org"].includes(url.hostname), `${label} primary reference`);
      assert.ok(source.title.trim(), label);
    }
  }
});

test("calculator setups have usable bounds and finite slider ranges", () => {
  let interactiveSliders = 0;
  for (const lesson of LESSON_CONTENT) {
    assert.ok(isTechniqueId(lesson.example.techniqueId), lesson.slug);
    for (const setup of [lesson.example, lesson.exploration]) {
      assert.ok(setup.expressions.length >= 1, lesson.slug);
      if (setup.graphBounds !== null) {
        assert.ok(graphBoundsSchema.safeParse(setup.graphBounds).success, lesson.slug);
        const { left, right, bottom, top } = setup.graphBounds;
        assert.ok([left, right, bottom, top].every(Number.isFinite), lesson.slug);
        assert.ok(left < right && bottom < top, lesson.slug);
      }
      for (const entry of setup.expressions) {
        assert.ok(entry.latex.trim() && entry.purpose.trim(), lesson.slug);
        if (!entry.slider) continue;
        const { min, max, step } = entry.slider;
        assert.ok([min, max, step].every(Number.isFinite), lesson.slug);
        assert.ok(min < max && step > 0 && step <= max - min, lesson.slug);
        const assignment = /^[a-zA-Z]=(-?\d+(?:\.\d+)?)$/.exec(entry.latex);
        assert.ok(assignment, `${lesson.slug} slider is a numeric assignment`);
        const initial = Number(assignment[1]);
        assert.ok(initial >= min && initial <= max, `${lesson.slug} slider starts inside its bounds`);
        assert.ok(Math.abs((initial - min) / step - Math.round((initial - min) / step)) < 1e-8, `${lesson.slug} slider starts on its step grid`);
        interactiveSliders++;
      }
    }
  }
  assert.ok(interactiveSliders >= 18, "lessons include actual editable sliders, not static illustrations");
});

test("every lesson builds trusted practice context and fresh same-technique exercises", () => {
  for (const [index, lesson] of LESSON_CONTENT.entries()) {
    const context = getLessonPracticeContext(lesson.slug);
    assert.ok(context, lesson.slug);
    assert.equal(context.techniqueId, lesson.example.techniqueId, lesson.slug);
    assert.equal(context.techniqueName, techniqueName(lesson.example.techniqueId), lesson.slug);
    assert.equal(context.question, lesson.example.question, lesson.slug);
    assert.equal(context.answer, lesson.example.answer, lesson.slug);
    assert.deepEqual(context.rows.map((row) => row.latex), lesson.example.expressions.map((row) => row.latex), lesson.slug);
    assert.equal(context.problemId, null, lesson.slug);
    assert.equal(context.cacheKey, null, lesson.slug);
    let previousQuestion: string | undefined;
    const random = seededRandom(43 + index);
    for (let attempt = 0; attempt < 3; attempt++) {
      const generated = generatePracticeProblem(context, { random, previousQuestion });
      assert.equal(generated.exercise.techniqueId, lesson.example.techniqueId, lesson.slug);
      assert.equal(generated.exercise.techniqueName, context.techniqueName, lesson.slug);
      assert.notEqual(generated.exercise.question, lesson.example.question, lesson.slug);
      assert.notEqual(generated.exercise.question, previousQuestion, lesson.slug);
      assert.ok(Number.isFinite(generated.answer), lesson.slug);
      assert.equal(gradePracticeAnswer(generated, String(generated.answer))?.correct, true, lesson.slug);
      assert.equal(gradePracticeAnswer(generated, String(generated.answer + 1))?.correct, false, lesson.slug);
      for (const privateKey of ["answer", "correctChoice", "solution", "hint"]) {
        assert.equal(Object.hasOwn(generated.exercise, privateKey), false, `${lesson.slug} public exercise hides ${privateKey}`);
      }
      previousQuestion = generated.exercise.question;
    }
  }
});

test("authored numeric answers agree with independent calculations", () => {
  // These calculations check the original examples, not the generation code.
  const quadraticAt = (x: number) => {
    const points = [[1, 8], [2, 15], [4, 35]];
    return points.reduce((total, [xi, yi], i) => total + yi * points.reduce((factor, [xj], j) => i === j ? factor : factor * (x - xj) / (xi - xj), 1), 0);
  };
  const expected: Record<string, number> = {
    "introduction-to-desmos": 3 * 4 + 2,
    "graphing-equations": (20 - 5) / 3,
    tables: 2 * 4 + 1,
    "intersections-and-intercepts": (7 - 1) / (2 + 1),
    sliders: (7 - 1) / 2,
    lists: Math.max(...[1, 2, 3, 4].map((x) => x ** 2 + 2 * x)),
    regression: quadraticAt(10),
    "functions-and-transformations": 3 ** 2 - 4 * 3 + 7,
    restrictions: Math.min((0 - 3) ** 2 + 2, (2 - 3) ** 2 + 2),
    "answer-choice-testing": (11 - 2) / 3,
    "bracket-regression": (7 - 1) / (2 + 1) + (2 * ((7 - 1) / (2 + 1)) + 1),
    "advanced-desmos-shortcuts": Math.hypot(7 - 1, 10 - 2),
    "linear-equations": (19 - 7) / (3 - 2),
    "linear-functions": (15 - 7) / (3 - 1),
    "systems-of-equations": (10 - 1) / (2 + 1),
    quadratics: -(4 ** 2) + 8 * 4 + 9,
    polynomials: Math.max(...[-2, 1, 3].filter((x) => x ** 3 - 2 * x ** 2 - 5 * x + 6 === 0)),
    "exponents-and-radicals": 16 ** (3 / 2) / 8,
    "nonlinear-functions": 3 * (6 / 3) ** 4,
    "ratios-and-percentages": 80 * (1 - 25 / 100),
    "statistics-and-data-analysis": [4, 7, 8, 9, 22].sort((a, b) => a - b)[2],
    geometry: Math.hypot(7 - 1, 10 - 2),
    circles: Math.sqrt((-8 / 2) ** 2 + (6 / 2) ** 2 + 11),
    trigonometry: 12 * Math.sin(30 * Math.PI / 180),
  };
  assert.equal(Object.keys(expected).length, LESSON_CONTENT.length);
  for (const lesson of LESSON_CONTENT) {
    assert.ok(Math.abs(Number(lesson.example.answer) - expected[lesson.slug]) < 1e-8, lesson.slug);
  }
  assert.equal(quadraticAt(10) + (2 / 3) * (10 - 1) * (10 - 2), 191, "regression exploration's edited output");
});
