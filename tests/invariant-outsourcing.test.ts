import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { affineInvariantPlan } from "../src/lib/affine-invariant-plan";
import { constrainedRewriteBurden, proveConstrainedPolynomial } from "../src/lib/constrained-polynomial";
import { repairDesmosNativePlans } from "../src/lib/desmos-native-plans";
import { findRegressionDeterminacyViolations } from "../src/lib/solver-rules";
import { typingBurden } from "../src/lib/method-scoring";
import { buildRetrievalIndex, retrieveStrategies } from "../src/lib/strategy-retrieval";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { candidatesResponse, graphCandidate } from "./method-fixtures";
import { invariantCases, rejectedInvariantCases } from "./invariant-outsourcing-fixtures";

const original = invariantCases[0].question;
const substitution = graphCandidate({
  techniqueId: "function-evaluation", rung: 1, answer: "980", graphBounds: null,
  rows: ["g(x)=8x^2+18x+8x(20-2x)+9(20-2x)+2(20-2x)^2", "g(0)"].map(latex => ({ latex, slider: null, copiesRow: null })),
  result: { type: "numeric", row: 2, relatedRows: [1], value: 980, listIndex: null, answerFrom: "value", choiceLabel: null, detail: "Read g(0)" },
});

test("all supported source forms prove the target exactly and survive selection repeatedly", () => {
  for (const item of invariantCases) {
    const plan = affineInvariantPlan(item.question);
    assert.ok(plan, item.id);
    assert.ok(proveConstrainedPolynomial(item.question)?.space);
    assert.equal(plan.candidate.answer, item.answer, item.id);
    for (let repeat = 0; repeat < 20; repeat++) {
      const input = candidatesResponseSchema.parse(candidatesResponse([graphCandidate({ answer: item.answer })], { question: item.question }));
      const selection = selectMethods(repairDesmosNativePlans(input));
      const winner = selection.methods.find(method => method.id === selection.winnerId)!;
      assert.equal(winner.answer, item.answer, item.id);
      assert.deepEqual(winner.rows, plan.candidate.rows.map(({ latex, slider }) => ({ latex, slider })), item.id);
      assert.equal(winner.cost.derivationSteps, 0);
      assert.equal(winner.rows.length, 2);
    }
  }
});

test("noninvariants, incompatible conditions and unconsumed assumptions never get a native invariant plan", () => {
  for (const input of rejectedInvariantCases) assert.equal(affineInvariantPlan(input), null, input);
});

test("construction effort defeats low-rung substituted algebra even with equal row counts and zero reported effort", () => {
  const plan = affineInvariantPlan(original)!;
  assert.equal(constrainedRewriteBurden(original, substitution.rows), 4);
  assert.equal(constrainedRewriteBurden(original, plan.candidate.rows), 0);
  for (const candidates of [[substitution, plan.candidate], [plan.candidate, substitution]]) {
    const selected = selectMethods(candidatesResponseSchema.parse(candidatesResponse(candidates, { question: original })));
    const rewritten = selected.methods.find(method => method.techniqueId === "function-evaluation")!;
    assert.equal(rewritten.rejected, null);
    assert.equal(rewritten.cost.derivationSteps, 4);
    assert.match(rewritten.repairs.join(" "), /construction steps/);
    assert.equal(selected.methods.find(method => method.id === selected.winnerId)?.techniqueId, "parameter-regression");
  }
  assert.ok(typingBurden(substitution.rows) > typingBurden(plan.candidate.rows));
  assert.equal(typingBurden([{ latex: String.raw`\left(x+1\right)^{2}` }]), typingBurden([{ latex: "(x+1)^2" }]));
});

test("typing and construction guards do not penalize original functions or simpler graphing", () => {
  assert.equal(constrainedRewriteBurden("Given g(x)=3(x+2)^2, find g(0).", [{ latex: "g(x)=3(x+2)^2" }]), 0);
  assert.equal(constrainedRewriteBurden(original, [{ latex: "g(x)=8x^2+18x+8xy+9y+2y^2" }]), 0);
  const q = "What is the positive solution to x^2=9?";
  const response = candidatesResponseSchema.parse(candidatesResponse([graphCandidate()], { question: q }));
  assert.strictEqual(repairDesmosNativePlans(response), response);
  assert.equal(selectMethods(response).winnerId, "intercept-read");
});

test("constraint retrieval is a hypothesis for both invariant and non-invariant targets", () => {
  const index = buildRetrievalIndex(readFileSync("src/content/desmos-tricks.md", "utf8"));
  for (const q of [original, rejectedInvariantCases[0], invariantCases[6].question]) {
    const retrieval = retrieveStrategies(index, q);
    assert.ok(retrieval.structures.includes("constrained-target"));
    assert.ok(retrieval.strategyIds.includes(79));
    assert.match(retrieval.focusHint, /original equations directly/);
    assert.match(retrieval.focusHint, /RMSE=0/);
  }
});


test("a fitted pair cannot certify the non-invariant target x+y", () => {
  const rows = [{ latex: "2p+q\\sim20" }, { latex: "p+q" }];
  assert.ok(findRegressionDeterminacyViolations(rows, { readoutRow: 2 }).some(item => item.kind === "underdetermined"));
});
