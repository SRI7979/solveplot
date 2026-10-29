import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkConditionCompleteness,
  findIntegerParameterViolations,
  findRegressionDeterminacyViolations,
  findUnsupportedDesmosOperations,
} from "../src/lib/solver-rules";

test("real Desmos syntax: coordinates cannot be fitted and point multiplication is not a dot product", () => {
  assert.equal(findUnsupportedDesmosOperations([{latex:"x"},{latex:String.raw`[40/x]\sim[45/18]`}])[0]?.row, 2);
  assert.deepEqual(findUnsupportedDesmosOperations([{latex:String.raw`40/m\sim45/18`},{latex:"m"}]), []);
  assert.deepEqual(findUnsupportedDesmosOperations([{latex:"f(x)=3x+2"},{latex:"x_{1}=[1,2]"},{latex:String.raw`f(x_{1})\sim ax_{1}+b`}]), []);
  const points=[{latex:"K=(-60,0)"},{latex:"J=(-45,0)"},{latex:"P=(0,0)"}];
  assert.equal(findUnsupportedDesmosOperations([...points,{latex:String.raw`\theta=\operatorname{acos}((K-J)(P-J)/675)`}])[0]?.row,4);
  assert.deepEqual(findUnsupportedDesmosOperations([...points,{latex:"2(K-J)"},{latex:"(K.x-J.x)*(P.x-J.x)+(K.y-J.y)*(P.y-J.y)"}]),[]);
});

// ================================================================================
// RULE 1 — integer conditions must be encoded as integers
// ================================================================================

test("Rule 1 / regression test 1: {a>1} on a declared-integer parameter is a violation", () => {
  const violations = findIntegerParameterViolations(
    [{ latex: String.raw`y_{1}\sim a x_{1}^2+b x_{1}+c\left\{a>1\right\}` }],
    [{ name: "a", integer: true, min: 2, max: 10 }],
  );
  assert.deepEqual(violations, [{ row: 1, param: "a" }]);
});

test("Rule 1 / regression test 2: a valid integer-step slider passes unchanged", () => {
  const violations = findIntegerParameterViolations(
    [{ latex: "k=3", slider: { min: 2, max: 10, step: 1 } }],
    [{ name: "k", integer: true, min: 2, max: 10 }],
  );
  assert.deepEqual(violations, []);
});

test("Rule 1: an integer list also satisfies the constraint", () => {
  const violations = findIntegerParameterViolations(
    [{ latex: "k=[2,3,4,5]" }],
    [{ name: "k", integer: true, min: 2, max: 10 }],
  );
  assert.deepEqual(violations, []);
});

test("Rule 1: a non-integer-step slider on a declared-integer parameter is a violation", () => {
  const violations = findIntegerParameterViolations(
    [{ latex: "k=3", slider: { min: 2, max: 10, step: 0.5 } }],
    [{ name: "k", integer: true, min: 2, max: 10 }],
  );
  assert.deepEqual(violations, [{ row: 1, param: "k" }]);
});

test("Rule 1: a parameter not declared integer is never flagged", () => {
  const violations = findIntegerParameterViolations(
    [{ latex: String.raw`y_{1}\sim a x_{1}+b\left\{a>1\right\}` }],
    [{ name: "a", integer: false, min: 2, max: 10 }],
  );
  assert.deepEqual(violations, []);
});

// ================================================================================
// RULE 2 — regressions must be determined
// ================================================================================

test("Rule 2 / regression test 3a: y_1~ax_1^2+bx_1+c with length-2 lists (3 params, 2 constraints) is rejected", () => {
  const violations = findRegressionDeterminacyViolations([
    { latex: "x_{1}=[-2,8]" },
    { latex: "y_{1}=[0,0]" },
    { latex: String.raw`y_{1}\sim a x_{1}^2+b x_{1}+c` },
  ]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, "underdetermined");
  if (violations[0].kind === "underdetermined") {
    assert.equal(violations[0].freeParams, 3);
    assert.equal(violations[0].constraints, 2);
  }
});

test("Rule 2 / regression test 3b: the same regression with length-3 lists (3 params, 3 constraints) is accepted", () => {
  const violations = findRegressionDeterminacyViolations([
    { latex: "x_{1}=[-2,3,8]" },
    { latex: "y_{1}=[0,5,0]" },
    { latex: String.raw`y_{1}\sim a x_{1}^2+b x_{1}+c` },
  ]);
  assert.deepEqual(violations, []);
});

test("Rule 2 / regression test 3c: [p+q,pq]~[7/2,3/2] (2 params, 2 constraints) is accepted", () => {
  const violations = findRegressionDeterminacyViolations([{ latex: String.raw`[p+q,pq]\sim[7/2,3/2]` }]);
  assert.deepEqual(violations, []);
});

test("Rule 2 / regression test 3d: c_1~a_1q-19w with length-2 lists (2 params, 2 constraints) is accepted", () => {
  const violations = findRegressionDeterminacyViolations([
    { latex: "a_{1}=[7,3]" },
    { latex: "c_{1}=[3,5]" },
    { latex: String.raw`c_{1}\sim a_{1}q-19w` },
  ]);
  assert.deepEqual(violations, []);
});

test("Rule 2 / regression test 4: a valid three-point quadratic regression is not over-rejected", () => {
  const violations = findRegressionDeterminacyViolations([
    { latex: "x_{1}=[1,2,4]" },
    { latex: "y_{1}=[7,15,43]" },
    { latex: String.raw`y_{1}\sim a x_{1}^2+b x_{1}+c` },
  ]);
  assert.deepEqual(violations, []);
});

test("Rule 2: mismatched list lengths across a ~ are flagged even with enough free parameters", () => {
  const violations = findRegressionDeterminacyViolations([
    { latex: "x_{1}=[1,2,4]" },
    { latex: "y_{1}=[7,15]" },
    { latex: String.raw`y_{1}\sim a x_{1}^2+b x_{1}+c` },
  ]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, "mismatched_lists");
});

test("Rule 2: an inequality restriction never counts as a constraint", () => {
  // Same shape as test 3a, plus a restriction on a — still 3 params, 2 constraints.
  const violations = findRegressionDeterminacyViolations([
    { latex: "x_{1}=[-2,8]" },
    { latex: "y_{1}=[0,0]" },
    { latex: String.raw`y_{1}\sim a x_{1}^2+b x_{1}+c\left\{a>1\right\}` },
  ]);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].kind, "underdetermined");
});

// Two equations in x, y, z: each unknown is free, but x+y+z is fixed at 8.
const SYSTEM_FIT = { latex: String.raw`[7x_{1}+4y_{1}+8z,4x_{1}+y_{1}+5z]\sim[61,37]` };

test("Rule 2: an underdetermined fit passes when the line the plan reads is a combination the equations fix", () => {
  assert.deepEqual(findRegressionDeterminacyViolations([SYSTEM_FIT, { latex: "x_{1}+y_{1}+z" }], { readoutRow: 2 }), []);
  assert.deepEqual(findRegressionDeterminacyViolations([SYSTEM_FIT, { latex: "2x_1+2y_1+2z" }], { readoutRow: 2 }), []);
  // A supplied value defined on an earlier line is a known number, not a fitted one.
  assert.deepEqual(
    findRegressionDeterminacyViolations([{ latex: "w=1" }, { latex: String.raw`[7x_{1}+4y_{1}+8zw,4x_{1}+y_{1}+5zw]\sim[61,37]` }, { latex: "x_{1}+y_{1}+z" }], { readoutRow: 3 }),
    [],
  );
});

test("Rule 2: an underdetermined fit stays rejected when its readout is not fixed or cannot be verified", () => {
  const kind = (rows: { latex: string }[], readoutRow: number | null) => findRegressionDeterminacyViolations(rows, { readoutRow }).map((violation) => violation.kind);
  assert.deepEqual(kind([SYSTEM_FIT, { latex: "x_{1}" }], 2), ["underdetermined"], "x alone is not fixed");
  assert.deepEqual(kind([SYSTEM_FIT, { latex: "x_{1}+y_{1}+z" }], null), ["underdetermined"], "no readout line to check");
  assert.deepEqual(kind([SYSTEM_FIT, { latex: "x_{1}+y_{1}+z" }], 1), ["underdetermined"], "a parameter read off the fit itself is arbitrary");
  assert.deepEqual(kind([{ latex: String.raw`[a^{2}+b+c,a+b+c]\sim[3,2]` }, { latex: "b+c" }], 2), ["underdetermined"], "a nonlinear fit is not verified");
  assert.deepEqual(kind([{ latex: String.raw`[7x_{1}+4y_{1}+8z,4x_{1}+y_{1}+5z]\sim[61,37]\left\{z>0\right\}` }, { latex: "x_{1}+y_{1}+z" }], 2), ["underdetermined"], "a restricted fit is not verified");
  assert.deepEqual(kind([{ latex: String.raw`[a+b+c,2a+2b+2c]\sim[3,7]` }, { latex: "a+b+c" }], 2), ["inconsistent"], "contradictory equations fix nothing");
  // The data-list fit of test 3a stays rejected whatever it reads.
  assert.deepEqual(kind([{ latex: "x_{1}=[-2,8]" }, { latex: "y_{1}=[0,0]" }, { latex: String.raw`y_{1}\sim a x_{1}^2+b x_{1}+c` }, { latex: "a+b+c" }], 4), ["underdetermined"]);
  for (const fit of [String.raw`0\sim ax_{1}^2+bx_{1}+c`, String.raw`0\sim a x_{1}^2+b x_{1}+c`]) {
    const rows = [{ latex: "x_{1}=[-2,8]" }, { latex: fit }, { latex: "a+b" }];
    assert.deepEqual(kind(rows, 3), ["underdetermined"], "implicit multiplication must not hide the two constraints");
    assert.deepEqual(findIntegerParameterViolations(rows, [{name:"a",integer:true,min:2,max:100}]), [{row:2,param:"a"}], "the unfixed integer coefficient cannot be fitted continuously");
  }
});

test("Rule 2: scalar regression counts one condition and needs an exact fixed readout", () => {
  const check = (fit: string, target: string) => findRegressionDeterminacyViolations([{ latex: fit }, { latex: target }], { readoutRow: 2 });
  assert.deepEqual(check("2u+v\\sim20", "8u^3+12u^2v+6uv^2+v^3"), []);
  assert.deepEqual(check("3u-2v\\sim7", "81u^4-216u^3v+216u^2v^2-96uv^3+16v^4"), []);
  assert.equal(check("2u+v\\sim20", "u+v")[0]?.kind, "underdetermined");
  assert.equal(check("u^2+v\\sim20", "u+v")[0]?.kind, "underdetermined", "nonlinear scalar sides still have one residual");
  assert.equal(check("u^2+v\\sim20", "u^2+v")[0]?.kind, "underdetermined", "nonlinear constraints are outside the affine proof");
  assert.equal(check("[u^2+v]\\sim[20]", "u^2+v")[0]?.kind, "underdetermined");
  assert.deepEqual(check("uv\\sim3", "uv"), [], "the existing inseparable-product rule is preserved");
  assert.equal(check("uv\\sim3", "u+v")[0]?.kind, "underdetermined");
});

test("Rule 2: dependent affine conditions count by rank and contradictions fail explicitly", () => {
  const fit = { latex: "[u+v,2u+2v]\\sim[3,6]" };
  assert.equal(findRegressionDeterminacyViolations([fit, { latex: "u" }], { readoutRow: 2 })[0]?.kind, "underdetermined");
  assert.deepEqual(findRegressionDeterminacyViolations([fit, { latex: "(u+v)^2" }], { readoutRow: 2 }), []);
  assert.deepEqual(findRegressionDeterminacyViolations([{ latex: "[u+v,u+v]\\sim[1,2]" }, { latex: "0" }], { readoutRow: 2 }), [{ row: 1, kind: "inconsistent" }]);
});

// ================================================================================
// RULE 3 — condition completeness for conditional-system questions
// ================================================================================

const graphOverlapResult = (row: number, relatedRows: number[]) =>
  ({
    type: "graph_overlap" as const,
    row,
    value: null,
    listIndex: null,
    answerFrom: "reasoning" as const,
    choiceLabel: null,
    detail: "the two lines",
    relatedRows,
  }) as const;

test("Rule 3 / regression test 5: a slope-matching-only method (distinguishes null) is rejected", () => {
  const check = checkConditionCompleteness({
    conditionType: "no-solution",
    distinguishes: null,
    result: {
      type: "numeric",
      row: 1,
      value: 10,
      listIndex: null,
      answerFrom: "value",
      choiceLabel: null,
      detail: "p",
      relatedRows: [],
    },
    answerState: null,
    expressions: [{ latex: "6+7r=pw" }, { latex: "7r-5w=5w+11" }],
  });
  assert.ok(check && "error" in check, "a slope-only method with no distinguishing evidence must be rejected");
  if (check && "error" in check) {
    assert.match(check.error, /no solution/i);
    assert.match(check.error, /coincident|opposite/i);
  }
});

test("Rule 3 / regression test 6: a method that already graphs both equations at the answer value passes and sets distinguishes", () => {
  const check = checkConditionCompleteness({
    conditionType: "no-solution",
    distinguishes: null,
    result: graphOverlapResult(2, [3]),
    answerState: { param: "p", value: 10 },
    expressions: [{ latex: "p=1" }, { latex: "y=(6+7x)/p" }, { latex: "y=(7x-11)/12" }],
  });
  assert.deepEqual(check, { distinguishes: "visual-parallel-vs-overlap" });
});

test("Rule 3: a method that already declares distinguishes passes unchanged without re-checking rows", () => {
  const check = checkConditionCompleteness({
    conditionType: "infinitely-many",
    distinguishes: "constant-ratio-checked",
    result: { type: "written", row: null, value: null, listIndex: null, answerFrom: "reasoning", choiceLabel: null, detail: "p", relatedRows: [] },
    answerState: null,
    expressions: [],
  });
  assert.deepEqual(check, { distinguishes: "constant-ratio-checked" });
});

test("Rule 3 / regression test 7: conditionType null means the rule never fires", () => {
  const check = checkConditionCompleteness({
    conditionType: null,
    distinguishes: null,
    result: null,
    answerState: null,
    expressions: [{ latex: "6+7r=pw" }],
  });
  assert.equal(check, null);
});

// ================================================================================
// General
// ================================================================================

test("regression test 8: a solution with no regressions, no integer parameters, and conditionType null is unaffected by all three rules", () => {
  const expressions = [{ latex: "y=x^2-9" }];
  assert.deepEqual(findIntegerParameterViolations(expressions, []), []);
  assert.deepEqual(findRegressionDeterminacyViolations(expressions), []);
  assert.equal(
    checkConditionCompleteness({
      conditionType: null,
      distinguishes: null,
      result: null,
      answerState: null,
      expressions,
    }),
    null,
  );
});

test("Rule 2: parameters that only ever appear as one product count as one unknown, unless a row reads one alone", () => {
  // The prompt's own small-system example: s and y_1 are not individually
  // determined, but only their product enters, so r is identifiable.
  const plan = [{ latex: "x_{1}=2" }, { latex: "[7rx_{1}+12sy_{1},3rx_{1}+4sy_{1}]\\sim[3,5]" }, { latex: "r" }];
  assert.deepEqual(findRegressionDeterminacyViolations(plan), []);
  // Reading s alone would show an arbitrary split of the product.
  assert.equal(findRegressionDeterminacyViolations([...plan.slice(0, 2), { latex: "s" }])[0]?.kind, "underdetermined");
  // A product that is also raised to a power is not a plain product.
  assert.equal(findRegressionDeterminacyViolations([{ latex: "x_{1}=2" }, { latex: "[7rx_{1}+12s^{2}y_{1},3rx_{1}+4sy_{1}]\\sim[3,5]" }])[0]?.kind, "underdetermined");
});
