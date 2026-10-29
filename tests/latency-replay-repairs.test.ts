import assert from "node:assert/strict";
import { test } from "node:test";

import { validateCandidatesResponse } from "../src/lib/solve-output";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { candidatesResponse, graphCandidate, providerBody, zeroCost } from "./method-fixtures";

test("a fractional tangency value uses the exact clicked vertex instead of an unreachable slider stop", () => {
  const question = "In the xy-plane, the line y = 6x - k and the parabola y = 3x^2 + 13x + 2 intersect at exactly one point, where k is a constant. What is k?";
  const candidate = graphCandidate({
    techniqueId: "vertex-of-difference",
    rows: [
      { latex: "k=0", slider: { min: -5, max: 5, step: 0.001 }, copiesRow: null },
      { latex: "y=(3x^2+13x+2)-6x+k", slider: null, copiesRow: null },
    ],
    answer: "25/12",
    result: { type: "vertex", row: 2, relatedRows: [1], value: null, listIndex: null, answerFrom: "reasoning", choiceLabel: null, detail: "drag k until the vertex touches the x-axis" },
    answerState: { param: "k", value: 25 / 12 },
    cost: { ...zeroCost, manualIterations: 1 },
  });
  const input = candidatesResponseSchema.parse(candidatesResponse([candidate], { question }));
  const selection = selectMethods(input);
  assert.equal(selection.winnerId, "vertex-of-difference");
  const method = selection.methods[0];
  assert.equal(method.rejected, null);
  assert.equal(method.answerState, null);
  assert.deepEqual(method.rows.map(({ latex }) => latex), ["y=(3x^2+13x+2)-6x"]);
  assert.equal(method.result.row, 1);
  assert.match(method.repairs.join(" "), /exact vertex readout/);

  const wrongAnswer = candidatesResponseSchema.parse(candidatesResponse([{ ...candidate, answer: "2" }], { question }));
  assert.throws(() => selectMethods(wrongAnswer), /answer-state/,
    "the exact repair requires the claimed answer to match the printed equations");
});

test("an increasing budget list uses the printed budget as a proven-safe cap", () => {
  const question = "A moving company charges a flat fee of $95 plus $1.85 for each mile. Dana can spend at most $300. What is the greatest whole number of miles?";
  const candidate = graphCandidate({
    techniqueId: "integer-list-filter",
    rows: [
      { latex: "M=[0...200]", slider: null, copiesRow: null },
      { latex: "C=95+1.85M", slider: null, copiesRow: null },
      { latex: "Valid=M[C\\le300]", slider: null, copiesRow: null },
      { latex: "\\operatorname{max}(Valid)", slider: null, copiesRow: null },
    ],
    answer: "110",
    result: { type: "numeric", row: 4, relatedRows: [1, 2, 3], value: 110, listIndex: null, answerFrom: "value", choiceLabel: null, detail: "largest affordable whole mileage" },
  });
  const selection = selectMethods(candidatesResponseSchema.parse(candidatesResponse([candidate], { question })));
  assert.equal(selection.winnerId, "integer-list-filter");
  assert.equal(selection.methods[0].rows[0].latex, "M=[0...300]");
  assert.match(selection.methods[0].repairs.join(" "), /printed budget 300/);

  const unsafeQuestion = question.replace("$1.85", "$0.50");
  const unsafe = { ...candidate, rows: candidate.rows.map((row) => ({ ...row, latex: row.latex.replace("1.85", "0.50") })) };
  assert.throws(() => selectMethods(candidatesResponseSchema.parse(candidatesResponse([unsafe], { question: unsafeQuestion }))), /hidden-derivation/,
    "a budget smaller than the maximum feasible mileage cannot be used as the list cap");
});

test("a missing slider-condition row is assigned to its slider before graph-row inference", () => {
  const question = "4x - ky = 9\n6x + 15y = 2\nIf the system has no solution, what is k?";
  const candidate = graphCandidate({
    techniqueId: "slider-condition",
    rows: [
      { latex: "k=1", slider: { min: -20, max: 20, step: 1 }, copiesRow: null },
      { latex: "4x-ky=9", slider: null, copiesRow: null },
      { latex: "6x+15y=2", slider: null, copiesRow: null },
    ],
    answer: "-10",
    result: { type: "slider_condition", row: null, relatedRows: [2, 3], value: null, listIndex: null, answerFrom: "reasoning", choiceLabel: null, detail: "parallel but distinct lines" },
    answerState: { param: "k", value: -10 },
    conditionType: "no-solution",
    distinguishes: "visual-parallel-vs-overlap",
    cost: { ...zeroCost, manualIterations: 1 },
  });
  const { parsed } = validateCandidatesResponse(providerBody(candidatesResponse([candidate], { question })));
  assert.equal(parsed.candidates[0].result.row, 1);
  assert.deepEqual(parsed.candidates[0].result.relatedRows, [2, 3]);
  assert.equal(selectMethods(parsed).winnerId, "slider-condition");
});

test("the printed line coefficients correct a wrong slider value only when both original lines are graphed", () => {
  const question = "4x - ky = 9\n6x + 15y = 2\nIf the system has no solution, what is k?";
  const wrong = graphCandidate({
    techniqueId: "slider-condition",
    rows: [
      { latex: "k=1", slider: { min: -20, max: 20, step: 1 }, copiesRow: null },
      { latex: "4x-ky=9", slider: null, copiesRow: null },
      { latex: "6x+15y=2", slider: null, copiesRow: null },
    ],
    answer: "10",
    result: { type: "slider_condition", row: 1, relatedRows: [2, 3], value: null, listIndex: null, answerFrom: "reasoning", choiceLabel: null, detail: "slider shows k=10" },
    answerState: { param: "k", value: 10 },
    conditionType: "no-solution",
    distinguishes: "visual-parallel-vs-overlap",
  });
  const { parsed } = validateCandidatesResponse(providerBody(candidatesResponse([wrong], { question })));
  const corrected = selectMethods(parsed).methods[0];
  assert.equal(corrected.answer, "-10");
  assert.equal(corrected.answerState?.value, -10);
  assert.match(corrected.result.detail, /k = -10/);
  assert.deepEqual(corrected.rows.map(({ latex }) => latex), wrong.rows.map(({ latex }) => latex));
  assert.match(corrected.repairs.join(" "), /printed line coefficients/);

  const wrongGraph = { ...wrong, rows: wrong.rows.map((row, index) => index === 2 ? { ...row, latex: "6x-15y=2" } : row) };
  assert.throws(() => selectMethods(candidatesResponseSchema.parse(candidatesResponse([wrongGraph], { question }))), /linear-system-answer-mismatch/,
    "a different graph cannot be silently repaired using the printed system");
  const coincidentQuestion = question.replace("= 9", "= 6").replace("= 2", "= 9");
  assert.throws(() => selectMethods(candidatesResponseSchema.parse(candidatesResponse([{ ...wrong, rows: wrong.rows.map((row, index) => index === 1 ? { ...row, latex: "4x-ky=6" } : index === 2 ? { ...row, latex: "6x+15y=9" } : row) }], { question: coincidentQuestion }))), /linear-system-condition-impossible/,
    "coincident lines can never satisfy the stated no-solution condition");
});
