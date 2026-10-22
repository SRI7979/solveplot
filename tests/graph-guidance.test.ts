import assert from "node:assert/strict";
import { test } from "node:test";
import { repairGraphGuidance } from "../src/lib/graph-guidance";
import { solutionSchema } from "../src/lib/solver-schema";
const solution = solutionSchema.parse({
  status: "solved",
  question: "What is the positive x-coordinate?",
  answer: "7",
  method: "desmos",
  why: "Graph the difference.",
  steps: [],
  expressions: [{ latex: "y=x^2-6x-7", purpose: "Graph the difference." }],
  result: {
    type: "x_intercept",
    row: 1,
    relatedRows: [],
    value: null,
    listIndex: null,
    answerFrom: "reasoning",
    choiceLabel: null,
    detail: "Click the positive x-intercept.",
  },
  readAnswer:
    "Look at line 1 and then type x_intercept to show its x-intercepts.",
  graphBounds: null,
  clarification: null,
});
test("obsolete intercept commands become actual graph interactions without changing the answer or rows", () => {
  const repaired = repairGraphGuidance(solution);
  assert.match(repaired.readAnswer!, /Click the curve on line 1/);
  assert.match(repaired.readAnswer!, /Read the x-coordinate/);
  assert.doesNotMatch(repaired.readAnswer!, /type x_intercept/);
  assert.equal(repaired.answer, solution.answer);
  assert.strictEqual(repaired.expressions, solution.expressions);
  assert.strictEqual(repaired.result, solution.result);
});
test("normal click instructions and deliberately defined readout variables remain intact", () => {
  const correct = {
    ...solution,
    readAnswer: "Click the positive x-intercept and read 7.",
  };
  assert.strictEqual(repairGraphGuidance(correct), correct);
  const defined = {
    ...solution,
    expressions: [
      ...solution.expressions,
      { latex: "x_{intercept}=7", purpose: "Stored coordinate." },
    ],
  };
  assert.strictEqual(repairGraphGuidance(defined), defined);
});
