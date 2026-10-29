import assert from "node:assert/strict";
import { test } from "node:test";
import { scalarAffineXIntercept } from "../src/lib/affine-intercept";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { candidatesResponse, graphCandidate } from "./method-fixtures";

test("numeric affine graph roots retain both sides and exact fractional coefficients", () => {
  assert.equal(scalarAffineXIntercept("y=\\frac{2}{3}(x-4)+5"), -3.5);
  assert.equal(scalarAffineXIntercept("y=\\frac{2}{3}(x-4)+5-\\frac{x+9}{2}"), 13);
  assert.equal(scalarAffineXIntercept("3x-2"), 2 / 3);
  assert.equal(scalarAffineXIntercept("y=−2(x+3)"), -3);
  assert.equal(scalarAffineXIntercept(" y = \\frac{x}{2}+\\frac{3}{4} "), -1.5);
});

test("affine root checks decline unsupported or excessive rows without inventing a root", () => {
  for (const row of [
    "y=x^2-4", "y=x^02-4", "y=x^(1)-4", "y=ax+3", "y=f(x)",
    "y=1/x", "y=2x+3\\{x>0\\}", "x=3", "2x+y=4", "y=x_{1}+2",
    "y=0x+3", "y=x-x", "y=3", "y=x+", "y=x/0", "y=x/2(x+1)",
    `y=x+${"9".repeat(33)}`, `y=${"(".repeat(25)}x${")".repeat(25)}`,
    `y=x${"+0".repeat(256)}`,
  ]) assert.equal(scalarAffineXIntercept(row), null, row);
});

function interceptCandidate(latex: string, value: number) {
  const base = graphCandidate();
  return graphCandidate({
    rows: [{ latex, slider: null, copiesRow: null }],
    answer: String(value),
    result: { ...base.result, value },
  });
}

test("selection rejects a dropped equation side and keeps the correct intersection without regeneration", () => {
  const bad = interceptCandidate("y=\\frac{2}{3}(x-4)+5", 13);
  const intersection = graphCandidate({
    techniqueId: "graph-both-sides",
    rows: [
      { latex: "y=\\frac{2}{3}(x-4)+5", slider: null, copiesRow: null },
      { latex: "y=\\frac{x+9}{2}", slider: null, copiesRow: null },
    ],
    answer: "13",
    result: { ...bad.result, type: "intersection", relatedRows: [2] },
  });
  const selection = selectMethods(candidatesResponseSchema.parse(candidatesResponse([bad, intersection], {
    question: "What value of x satisfies (2/3)(x-4)+5=(x+9)/2?",
  })));
  assert.equal(selection.winnerId, "graph-both-sides");
  assert.equal(selection.methods.find(method => method.techniqueId === "intercept-read")?.rejected?.rule, "affine-intercept-mismatch");
});

test("graph-root verification allows display rounding and leaves estimates and nonlinear graphs alone", () => {
  for (const [latex, value, question] of [
    ["y=3x-2", 0.667, "What is the root of y=3x-2?"],
    ["y=2x-27", 14, "What is the root of y=2x-27 to the nearest whole number?"],
    ["y=x-123", 120, "What is the root of y=x-123 rounded to the nearest ten?"],
    ["y=x^2-4", 2, "What is the positive root of y=x^2-4?"],
  ] as const) {
    const selection = selectMethods(candidatesResponseSchema.parse(candidatesResponse([interceptCandidate(latex, value)], { question })));
    assert.equal(selection.winnerId, "intercept-read", question);
  }
});
