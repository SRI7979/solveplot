import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { desmosNativePlan, repairDesmosNativePlans, repairSavedNativeSolution } from "../src/lib/desmos-native-plans";
import { candidatesResponse, graphCandidate, paperCandidate, providerBody } from "./method-fixtures";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { validateExplanationQuality } from "../src/lib/method-presentation";
import { createMemorySolveCache, type CacheEntry } from "../src/lib/solve-cache";
import { explainMethod, resolveEntry, solveProblem, type PipelineDeps } from "../src/lib/solve-pipeline";

// Publicly reusable structures, with coefficients distinct from the private audit captures.
export const nativeCases = [
  { question: "h(x)=-sqrt(x^2+bx+c), where b and c are constants. Its graph contains (2,0) and (0,-sqrt(30)). If h(m)=0, what is the greatest possible value of m?", answer: "15", technique: "bracket-regression" },
  { question: "18x^4+45x^2+18 has factors (k)(ax^2+b)(cx^2+d). If a, b, c, d, and k are positive integers, what is the smallest possible value of ab?", answer: "2", technique: "shared-zero" },
  { question: "y=4x-k and y=2x^2+10x+1 have exactly one real solution. What is the value of k?", answer: "3.5", technique: "vertex-of-difference" },
  { question: "4x^2+2(ax^2-b)=16x^2-8. If this has no real solution for every value of b other than 4, what is the value of a?", answer: "6", technique: "bracket-regression" },
  { question: "A parabola has vertex (2,-10) and intersects the x-axis at two points. It is written as y=ax^2+bx+c. What is the smallest possible integer value of a+b+c?", answer: "-9", technique: "strategic-value-test" },
  { question: "A square right pyramid has a surface area of 700 square inches and a slant height of 15 inches. What is the height of the pyramid?", answer: String(Number(Math.sqrt(15**2-((Math.sqrt(925)-15)/2)**2).toPrecision(12))), technique: "story-system" },
  { question: "The graph of 2x^2-12px+2y^2-16py=120p^2 is a circle. Its radius is np, where n and p are positive constants. What is the value of n?", answer: String(Number(Math.sqrt(85).toPrecision(12))), technique: "expanded-circle" },
  { question: "5x + 4y + 6z = 47 and 2x + y + 3z = 26. If (x, y, z) is a solution to the given system of equations, what is the value of x + y + z?", answer: "7", technique: "bracket-regression" },
];

function alternative(answer: string, question: string) {
  return paperCandidate({ answer, ...(question.includes("no real solution") ? { techniqueId: "substitution", conditionType: "no-solution", distinguishes: "constant-ratio-checked" } : {}) });
}

test("hard structures select a real Desmos method with complete, authored explanations", () => {
  for (const { question, answer, technique } of nativeCases) {
    const plan = desmosNativePlan(question);
    assert.ok(plan, question);
    const selected = selectMethods(repairDesmosNativePlans(candidatesResponseSchema.parse(candidatesResponse([alternative(answer, question)], { question }))));
    const winner = selected.methods.find(method => method.id === selected.winnerId)!;
    assert.equal(winner.techniqueId, technique, JSON.stringify(selected.methods));
    assert.equal(winner.answer, answer);
    assert.equal(winner.approach, "desmos");
    assert.equal(plan.explanation.purposes.length, winner.rows.length);
    assert.doesNotThrow(() => validateExplanationQuality(winner, plan.explanation));
    assert.ok(selected.methods.some(method => !method.rejected && method.rows.length === 0));
  }
});

test("recognizers follow changed coefficients and decline incomplete or different conditions", () => {
  assert.equal(desmosNativePlan(nativeCases[0].question.replace("30", "40"))?.candidate.answer, "20");
  assert.equal(desmosNativePlan(nativeCases[0].question.replace("greatest", "smallest")), null);
  assert.equal(desmosNativePlan(nativeCases[1].question.replace("positive integers", "positive constants")), null);
  assert.equal(desmosNativePlan(nativeCases[1].question.replace("45", "44")), null);
  assert.equal(desmosNativePlan(nativeCases[2].question.replace("exactly one", "two")), null);
  assert.equal(desmosNativePlan(nativeCases[3].question.replace("other than 4", "other than 3")), null);
  assert.equal(desmosNativePlan(nativeCases[3].question.replace("every value", "one value")), null);
  assert.equal(desmosNativePlan(nativeCases[4].question.replace("(2,-10)", "(1,-10)")), null);
  assert.equal(desmosNativePlan(nativeCases[4].question.replace("(2,-10)", "(2,10)")), null);
  assert.equal(desmosNativePlan(nativeCases[5].question.replace("700", "2000")), null);
  assert.equal(desmosNativePlan(nativeCases[5].question.replace("square right", "square")), null);
});

const INTERSECTION_QUESTION = "In the xy-plane, the line y = 6x - k and the parabola y = 3x^2 + 13x + 2 intersect at exactly one point, where k is a constant. What is the value of k?";

test("line-parabola intersection wording recognizes a general tangent family and both shift signs", () => {
  for (const [question, answer, row] of [
    [INTERSECTION_QUESTION, "25/12", "y=(3x^2+13x+2)-(6)x"],
    [INTERSECTION_QUESTION.replace("6x - k", "4x - k").replace("3x^2 + 13x + 2", "2x^2 + 10x + 1"), "3.5", "y=(2x^2+10x+1)-(4)x"],
    [INTERSECTION_QUESTION.replace("6x - k", "4x + k").replace("3x^2 + 13x + 2", "2x^2 + 10x + 1"), "-3.5", "y=(2x^2+10x+1)-(4)x"],
    ["The line y=-3x+k and the parabola y=2x^2-7x-4 intersect at exactly one point. Find k?", "-6", "y=(2x^2-7x-4)-(-3)x"],
    ["The line y=x-k and the parabola y=x^2+x intersect at exactly one point. What is the value of k?", "0", "y=(1x^2+1x+0)-(1)x"],
  ]) {
    const plan = desmosNativePlan(question);
    assert.ok(plan, question);
    assert.equal(plan.candidate.answer, answer);
    assert.equal(plan.candidate.techniqueId, "vertex-of-difference");
    assert.deepEqual(plan.candidate.rows.map(item => item.latex), [row]);
    const selected = selectMethods(repairDesmosNativePlans(candidatesResponseSchema.parse(candidatesResponse([alternative(answer, question)], { question }))));
    assert.equal(selected.methods.find(method => method.id === selected.winnerId)?.techniqueId, "vertex-of-difference");
  }
  assert.equal(desmosNativePlan(INTERSECTION_QUESTION.replace("3x^2", "3x²"))?.candidate.answer, "25/12");
  assert.equal(desmosNativePlan(INTERSECTION_QUESTION.replace("6x - k", "6x + k"))?.explanation.handMath, null);
  assert.match(desmosNativePlan(INTERSECTION_QUESTION)!.explanation.handMath!, /change the sign/);
});

test("intersection tangency declines negation, extra conditions, nonnumeric curves and unsupported coefficient bounds", () => {
  for (const question of [
    INTERSECTION_QUESTION.replace("intersect at", "do not intersect at"),
    INTERSECTION_QUESTION.replace("exactly one", "at most one"),
    INTERSECTION_QUESTION.replace("exactly one", "exactly two"),
    INTERSECTION_QUESTION.replace("one point,", "one point for x>0,"),
    INTERSECTION_QUESTION.replace("a constant", "a positive constant"),
    INTERSECTION_QUESTION.replace("a constant", "an integer"),
    INTERSECTION_QUESTION.replace("3x^2", "ax^2"),
    INTERSECTION_QUESTION.replace("3x^2", "0x^2"),
    INTERSECTION_QUESTION.replace("3x^2", "-3x^2"),
    INTERSECTION_QUESTION.replace("3x^2", "1001x^2"),
    INTERSECTION_QUESTION.replace("3x^2", "3.5x^2"),
    INTERSECTION_QUESTION.replace("6x - k", "6X - k"),
    INTERSECTION_QUESTION.replace("value of k?", "value of k+1?"),
    `If x is nonnegative, ${INTERSECTION_QUESTION}`,
    `${INTERSECTION_QUESTION} Also x is nonnegative.`,
    `${INTERSECTION_QUESTION} The system has exactly one real solution on a restricted interval.`,
  ]) assert.equal(desmosNativePlan(question), null, question);
});

test("intersection tangency gets its complete native method after one candidate call without rescue or explanation inference", async () => {
  let fetches = 0;
  const cache = createMemorySolveCache();
  const response = candidatesResponse([alternative("25/12", INTERSECTION_QUESTION)], { question: INTERSECTION_QUESTION });
  const deps: PipelineDeps = {
    cache, context: { model: "test-model", candidateInstructions: "", version: "test" },
    diagnosticId: "tangent-family", tier: { priorityUnavailable: false },
    client: new OpenAI({ apiKey: "unit-test-key", maxRetries: 0, fetch: async () => {
      fetches++;
      assert.equal(fetches, 1, "native selection must not request a rescue or explanation");
      return Response.json(providerBody(response));
    } }),
  };
  const solved = await solveProblem(deps, { kind: "text", problem: INTERSECTION_QUESTION, choices: null });
  assert.equal(solved.kind, "solved");
  if (solved.kind !== "solved") return;
  assert.equal(solved.method.techniqueId, "vertex-of-difference");
  assert.equal(solved.solution.answer, "25/12");
  assert.equal(solved.solution.expressions.length, 1);
  assert.equal(solved.explanation, "cache");
  assert.equal(solved.rescue, null);
  assert.deepEqual(solved.calls, { candidates: 1, explanation: 0 });
  assert.equal(fetches, 1);
});

test("positive-integer factor minimum proves the extremum for either declaration order and scale notation", () => {
  const question = "For positive integers k, a, b, c, and d, suppose 24x^4+60x^2+24=k(ax^2+b)(cx^2+d). What is the minimum possible value of ab?";
  const bad = graphCandidate({ techniqueId: "identity-regression", rows: [
    { latex: "D=[1,2,3,4,6,8,12,24]", slider: null, copiesRow: null },
    { latex: "P=[ab\\operatorname{for}a=D,b=D]", slider: null, copiesRow: null },
    { latex: "T=[24(a/b+b/a)\\operatorname{for}a=D,b=D]", slider: null, copiesRow: null },
    { latex: "P[T=60]", slider: null, copiesRow: null },
  ], answer: "2", result: { type: "list_entry", row: 4, relatedRows: [], value: 2, listIndex: 1, answerFrom: "value", choiceLabel: null, detail: "first feasible ab" } });
  const plan = desmosNativePlan(question);
  assert.equal(plan?.candidate.answer, "2");
  assert.equal(plan?.candidate.techniqueId, "shared-zero");
  assert.match(plan?.candidate.rows.at(-1)?.latex ?? "", /\\min\(/);
  const selection = selectMethods(repairDesmosNativePlans(candidatesResponseSchema.parse(candidatesResponse([bad], { question }))));
  assert.equal(selection.methods.find((method) => method.id === selection.winnerId)?.techniqueId, "shared-zero");
  assert.equal(selection.methods.find((method) => method.id === selection.winnerId)?.answer, "2");
  assert.equal(desmosNativePlan(question.replace("=k(", "=(k)("))?.candidate.answer, "2");
  assert.equal(desmosNativePlan(nativeCases[1].question)?.candidate.answer, "2", "older has-factors wording remains supported");
});

test("factor-minimum repair declines missing coefficients, ambiguous domains, and mismatched powers", () => {
  const question = "For positive integers k, a, b, c, and d, suppose 24x^4+60x^2+24=k(ax^2+b)(cx^2+d). What is the minimum possible value of ab?";
  for (const changed of [
    question.replace("positive integers", "integers"),
    question.replace("positive integers", "positive constants"),
    question.replace("k, a, b, c, and d", "k, a, b, and c"),
    question.replace("24x^4+60x^2+24", "the expression above"),
    question.replace("60x^2", "59x^2"),
    question.replace("cx^2+d", "cx^3+d"),
    question.replace("minimum", "maximum"),
  ]) assert.equal(desmosNativePlan(changed), null, changed);
});

test("no-solution fit matches curvature instead of incorrectly cancelling the left parabola", () => {
  const plan = desmosNativePlan(nativeCases[3].question)!;
  assert.deepEqual(plan.candidate.rows.slice(0, 2).map(row => row.latex), ["[4+2a,-2t]\\sim[16,-8]", "a"]);
  for (const b of [-100, 0, 4, 8, 100]) {
    for (const x of [-10, 0, 5]) assert.equal(4*x*x+2*(6*x*x-b)-(16*x*x-8), 8-2*b);
  }
  assert.match(plan.explanation.readAnswer!, /every real b/);
  assert.doesNotMatch(plan.explanation.why, /coefficient.*disappear/);
});

const SYSTEM_QUESTION = "7x + 4y + 8z = 61\n4x + y + 5z = 37\nIf (x, y, z) is a solution to the given system of equations, what is the value of x + y + z?";

test("a system in its own unknowns gets one bracket regression and a combination line, only when that value is fixed", () => {
  const plan = desmosNativePlan(SYSTEM_QUESTION)!;
  assert.deepEqual(plan.candidate.rows.map(row => row.latex), ["[7x_{1}+4y_{1}+8z,4x_{1}+y_{1}+5z]\\sim[61,37]", "x_{1}+y_{1}+z"]);
  assert.equal(plan.candidate.answer, "8");
  assert.equal(plan.candidate.strategy, 79);
  assert.equal(plan.explanation.handMath, null, "pure Desmos: nothing to do by hand");
  assert.match(plan.explanation.readAnswer!, /one of the many solutions/);
  // The same rows whether the transcription joins the equations with "and" or a LaTeX line break.
  for (const variant of [SYSTEM_QUESTION.replace("\n", " and ").replace("\nIf", ". If"), SYSTEM_QUESTION.replace("\n", "\\\\")]) {
    assert.deepEqual(desmosNativePlan(variant)?.candidate.rows.map(row => row.latex), plan.candidate.rows.map(row => row.latex), variant);
  }
  // Three equations in three unknowns: every value is fixed, but three unknowns cannot be graphed.
  const square = desmosNativePlan("x + y = 5\ny + z = 7\nx + z = 6\nIf (x, y, z) is the solution to the system, what is the value of x + y + z?");
  assert.deepEqual(square?.candidate.rows.map(row => row.latex), ["[x_{1}+y_{1},y_{1}+z,x_{1}+z]\\sim[5,7,6]", "x_{1}+y_{1}+z"]);
  assert.equal(square?.candidate.answer, "9");
  // Exact answers: a terminating decimal, and a fraction that does not terminate.
  assert.equal(desmosNativePlan("2x + 2y + 2z = 7 and x - y = 1. What is the value of x + y + z?")?.candidate.answer, "3.5");
  assert.equal(desmosNativePlan("3x + 3y + 3z = 10 and x - z = 2. What is the value of x + y + z?")?.candidate.answer, "10/3");
  // Declines: two lines are graphed and clicked; x alone is not fixed; "could" asks
  // which values work; k is a constant, not an unknown; contradictory equations.
  assert.equal(desmosNativePlan("2x + 3y = 17\n5x - y = 9\nWhat is the value of x + y?"), null);
  assert.equal(desmosNativePlan(SYSTEM_QUESTION.replace("x + y + z?", "x?")), null);
  assert.equal(desmosNativePlan(SYSTEM_QUESTION.replace("what is the value", "what could be the value")), null);
  assert.equal(desmosNativePlan("kx + 4y + 8z = 61 and 4x + y + 5z = 37, where k is a constant. What is the value of x + y + z?"), null);
  assert.equal(desmosNativePlan("x + y + z = 3 and 2x + 2y + 2z = 7. What is the value of x + y + z?"), null);
});

test("recognized old cache entries receive Desmos-first repairs and no explanation model calls", async () => {
  let fetches = 0;
  const cache = createMemorySolveCache();
  const deps: PipelineDeps = { cache, context: { model: "test-model", candidateInstructions: "", version: "test" }, diagnosticId: "native-plans-test", tier: { priorityUnavailable: false }, client: new OpenAI({ apiKey: "unit-test-key", maxRetries: 0, fetch: async () => { fetches++; throw new Error("No paid calls allowed"); } }) };
  for (const { question, answer } of nativeCases) {
    const selected = selectMethods(candidatesResponseSchema.parse(candidatesResponse([alternative(answer, question)], { question })));
    const entry: CacheEntry = { version: 1, cacheKey: question, promptConfigVersion: "test", question, choices: null, structure: null, methods: selected.methods, winnerId: selected.winnerId, modelPreference: null, retryOf: null, createdAt: new Date().toISOString() };
    const oldId = desmosNativePlan(question)!.candidate.techniqueId;
    await cache.putPreflight(entry.cacheKey, oldId, { status: "error", errors: [{ row: 1, message: "old batch failed" }] });
    const resolved = await resolveEntry(cache, entry);
    assert.equal(resolved.status, "ready");
    if (resolved.status !== "ready") continue;
    assert.equal(resolved.winner.approach, "desmos");
    assert.notEqual(resolved.winner.id, oldId, "the repaired batch receives a fresh browser check");
    const calls = { candidates: 0, explanation: 0 };
    const result = await explainMethod(deps, resolved.entry, resolved.winner, calls);
    assert.equal(result.source, "cache");
    assert.equal(result.solution.answer, answer);
    assert.deepEqual(calls, { candidates: 0, explanation: 0 });
    if (question.includes("every value of b")) {
      const badSaved = { ...result.solution, answerState: { param: "a", value: 6 }, why: "The left parabola becomes horizontal" };
      const fixed = repairSavedNativeSolution(badSaved);
      assert.equal(fixed.answer, answer);
      assert.match(fixed.why, /same curvature/);
      assert.equal(fixed.expressions[0].latex, "[4+2a,-2t]\\sim[16,-8]");
    } else assert.strictEqual(repairSavedNativeSolution(result.solution), result.solution);
  }
  assert.equal(fetches, 0);
});

test("quadratic-root gold replaces a fixed slider in fresh, cached, and saved multiple-choice solves", async () => {
  const question = "3x^2 - 16x + 2 = 0. One solution to the given equation can be written as (a + sqrt(b))/6, where a and b are integers. What is the value of a + b?";
  const choices = [{ label: "A", text: "66" }, { label: "B", text: "132" }, { label: "C", text: "248" }, { label: "D", text: "296" }];
  const old = graphCandidate({ techniqueId: "parameter-regression", rows: [
    { latex: "3x^2-16x+2", slider: null, copiesRow: null },
    { latex: "(a+\\sqrt{b})/6\\sim5.20526", slider: null, copiesRow: null },
    { latex: "a=16", slider: { min: -10, max: 16, step: 0.1 }, copiesRow: null },
    { latex: "a+b", slider: null, copiesRow: null },
  ], answer: "C) 248", result: { type: "numeric", row: 4, relatedRows: [], value: 248, listIndex: null, answerFrom: "value", choiceLabel: "C", detail: "a+b" } });
  const paper = alternative("248", question);
  paper.result.choiceLabel = "C";
  const response = candidatesResponseSchema.parse(candidatesResponse([old, paper], { question, choices }));
  const incompleteGraph = graphCandidate({
    techniqueId: "graph-both-sides", rows: [old.rows[0]], answer: "C) 248",
    result: { type: "visual_choice", row: 1, relatedRows: [], value: null, listIndex: null, answerFrom: "reasoning", choiceLabel: "C", detail: "Click both roots, then fit the radical forms in another method." },
  });
  const complete = selectMethods(repairDesmosNativePlans(candidatesResponseSchema.parse(candidatesResponse([incompleteGraph, old, paper], { question, choices }))));
  assert.equal(complete.winnerId, "bracket-regression", "a cheaper graph cannot substitute for the missing parameter fit");
  assert.equal(complete.methods.some(method => method.techniqueId === "graph-both-sides" && !method.rejected), false);
  const fresh = selectMethods(repairDesmosNativePlans(response));
  const winner = fresh.methods.find(method => method.id === fresh.winnerId)!;
  assert.equal(winner.techniqueId, "bracket-regression");
  assert.equal(winner.result.choiceLabel, "C");
  assert.equal(winner.result.value, 248);
  assert.ok(winner.rows.every(row => row.slider === null));
  assert.equal(winner.rows[1].latex, "[(a+\\sqrt{b})/6,(a-\\sqrt{b})/6]\\sim[5.20526,0.128076]");
  assert.equal(winner.rows[3].latex, "\\operatorname{round}(a)+\\operatorname{round}(b)");
  // Independent fit of the two rounded clicked roots, without fixed a.
  const a = 3*(5.20526+0.128076), b = (3*(5.20526-0.128076))**2;
  assert.equal(Math.round(a)+Math.round(b), 248);
  assert.ok(Math.abs(a-16) < 0.001 && Math.abs(b-232) < 0.001);
  const selectedOld = selectMethods(response);
  const entry: CacheEntry = { version: 1, cacheKey: "root-gold", promptConfigVersion: "test", question, choices, structure: null, methods: selectedOld.methods, winnerId: selectedOld.winnerId, modelPreference: null, retryOf: null, createdAt: "" };
  const cache = createMemorySolveCache();
  const resolved = await resolveEntry(cache, entry);
  assert.equal(resolved.status, "ready");
  if (resolved.status !== "ready") return;
  let fetches = 0;
  const deps: PipelineDeps = { cache, context: { model: "test", candidateInstructions: "", version: "test" }, diagnosticId: "root-gold", tier: { priorityUnavailable: false }, client: new OpenAI({ apiKey: "unit-test-key", fetch: async () => { fetches++; throw new Error("No paid calls allowed"); } }) };
  const explained = await explainMethod(deps, resolved.entry, resolved.winner);
  assert.equal(explained.source, "cache");
  assert.match(explained.solution.answer!, /248/);
  assert.match(explained.solution.why!, /both a and b/);
  const saved = { ...explained.solution, expressions: old.rows.map(row => ({ latex: row.latex, purpose: "Old fit", slider: row.slider })) };
  const repaired = repairSavedNativeSolution(saved);
  assert.equal(repaired.expressions[1].latex, winner.rows[1].latex);
  assert.equal(fetches, 0);
  assert.equal(desmosNativePlan(question.replace("16x", "17x"))?.candidate.answer, "282");
  assert.equal(desmosNativePlan(question.replace("integers", "real numbers")), null);
  assert.equal(desmosNativePlan(question.replace("a + b?", "a - b?")), null);
});

test("integer-leading quadratic roots get an exhaustive Desmos list instead of hand-derived choice testing", async () => {
  const question = "A quadratic function f is defined by f(x) = ax^2 + bx + c, where a is an integer greater than 1. The graph of y = f(x) in the xy-plane has x-intercepts at (-2, 0) and (8, 0). Which of the following could be the value of a + b?";
  const choices = ["-11", "-12", "-13", "-15"].map((text, i) => ({ label: "ABCD"[i], text }));
  const plan = desmosNativePlan(question, choices);
  assert.ok(plan);
  assert.equal(plan.candidate.techniqueId, "integer-list-filter");
  assert.equal(plan.candidate.answer, "-15");
  assert.deepEqual(plan.candidate.rows.map((row) => row.latex), ["a=[2...10]", "f(x)=a(x+2)(x-8)", "f(1)-f(0)"]);
  assert.equal(plan.candidate.result.listIndex, 2);
  assert.equal(plan.candidate.result.choiceLabel, "D");
  assert.equal(plan.explanation.purposes.length, 3);

  const hiddenCoefficient = graphCandidate({
    techniqueId: "function-evaluation", rows: [
      { latex: "a=3", slider: null, copiesRow: null },
      { latex: "f(x)=a(x+2)(x-8)", slider: null, copiesRow: null },
      { latex: "-5a", slider: null, copiesRow: null },
    ], answer: "D) -15",
    result: { type: "numeric", row: 3, relatedRows: [], value: -15, listIndex: null, answerFrom: "value", choiceLabel: "D", detail: "a+b after deriving b=-6a" },
    cost: { derivationSteps: 0, oneOffFacts: 0, newPrimitives: 0, setupConstructions: 0, manualIterations: 0 },
  });
  const costed = repairDesmosNativePlans(candidatesResponseSchema.parse(candidatesResponse([hiddenCoefficient], { question, choices })));
  const alternative = costed.candidates.find(candidate => candidate.techniqueId === "function-evaluation")!;
  assert.equal(alternative.cost.derivationSteps, 2, "a calculator alternative cannot hide the additional coefficient derivation");
  assert.equal(alternative.cost.oneOffFacts, 1, "the root-to-factor recognition applies to every alternative");
  const costedSelection = selectMethods(costed);
  assert.equal(costedSelection.methods.find(method => method.id === costedSelection.winnerId)?.techniqueId, "integer-list-filter");

  // Offline replay of the recorded model's tempting two-row answer-choice
  // shortcut: it happens to pick D, but its modulo test hides the root-to-
  // coefficient derivation that the three Desmos rows make visible.
  const shortcut = graphCandidate({
    techniqueId: "answer-choice-list", strategy: 20, rung: 4,
    rows: [{ latex: "A=[-11,-12,-13,-15]", slider: null, copiesRow: null },
      { latex: "A[\\operatorname{mod}(A,5)=0]", slider: null, copiesRow: null }],
    answer: "D) -15",
    result: { type: "list_entry", row: 2, relatedRows: [], value: -15, listIndex: 1, answerFrom: "value", choiceLabel: "D", detail: "choice value compatible with integer a" },
  });
  const response = candidatesResponseSchema.parse(candidatesResponse([shortcut], { question, choices }));
  const selected = selectMethods(repairDesmosNativePlans(response));
  const winner = selected.methods.find((method) => method.id === selected.winnerId)!;
  assert.equal(winner.techniqueId, "integer-list-filter");
  assert.equal(winner.answer, "D) -15");
  assert.deepEqual(winner.rows.map((row) => row.latex), plan.candidate.rows.map((row) => row.latex));
  assert.equal(winner.rejected, null);
  assert.doesNotThrow(() => validateExplanationQuality(winner, plan.explanation));
  const cache = createMemorySolveCache();
  const entry: CacheEntry = { version: 1, cacheKey: "integer-roots-test", promptConfigVersion: "test", question,
    choices, structure: selected.structure, methods: selected.methods, winnerId: winner.id,
    modelPreference: null, retryOf: null, createdAt: "" };
  let fetches = 0;
  const deps: PipelineDeps = { cache, context: { model: "test", candidateInstructions: "", version: "test" },
    diagnosticId: "integer-roots-test", tier: { priorityUnavailable: false },
    client: new OpenAI({ apiKey: "unit-test-key", fetch: async () => { fetches++; throw new Error("No paid calls allowed"); } }) };
  const explained = await explainMethod(deps, entry, winner);
  assert.equal(explained.source, "cache", "the native plan supplies its own explanation, without another model call");
  assert.equal(explained.solution.answer, "D) -15");
  assert.match(explained.solution.why!, /f\(1\)-f\(0\)=a\+b/);
  assert.equal(fetches, 0);
  const previous = selectMethods(response);
  const oldEntry: CacheEntry = { ...entry, methods: previous.methods, winnerId: previous.winnerId };
  const resolved = await resolveEntry(cache, oldEntry);
  assert.equal(resolved.status, "ready");
  if (resolved.status === "ready") {
    assert.equal(resolved.winner.techniqueId, "integer-list-filter", "an old cached choice-only method is repaired on read");
    const repaired = await explainMethod(deps, resolved.entry, resolved.winner);
    assert.equal(repaired.source, "cache");
    assert.equal(repaired.solution.answer, "D) -15");
  }
  assert.equal(fetches, 0);
  assert.equal(desmosNativePlan(`${question} Answer choices: A) -11, B) -12, C) -13, D) -15`, choices)?.candidate.answer, "-15", "a verbatim duplicated choice list is allowed");

  const changed = question.replace("(-2, 0) and (8, 0)", "(-4, 0) and (7, 0)");
  const changedChoices = ["-3", "-5", "-6", "-7"].map((text, i) => ({ label: "ABCD"[i], text }));
  const changedPlan = desmosNativePlan(changed, changedChoices);
  assert.equal(changedPlan?.candidate.answer, "-6");
  assert.deepEqual(changedPlan?.candidate.rows.map((row) => row.latex), ["a=[2...10]", "f(x)=a(x+4)(x-7)", "f(1)-f(0)"]);
});

test("integer-root list repair declines missing or changed mathematical conditions and ambiguous choices", () => {
  const question = "A quadratic function f is defined by f(x) = ax^2 + bx + c, where a is an integer greater than 1. The graph of y = f(x) in the xy-plane has x-intercepts at (-2, 0) and (8, 0). Which of the following could be the value of a + b?";
  const choices = ["-11", "-12", "-13", "-15"].map((text, i) => ({ label: "ABCD"[i], text }));
  for (const changed of [
    question.replace("integer greater than 1", "real number greater than 1"),
    question.replace("x-intercepts at (-2, 0) and (8, 0)", "x-intercepts at (-2, 0)"),
    question.replace("a + b?", "a + c?"),
    question.replace("Which of the following", "If c is positive, which of the following"),
  ]) assert.equal(desmosNativePlan(changed, choices), null, changed);
  assert.equal(desmosNativePlan(question), null, "choices are required to prove a unique answer");
  assert.equal(desmosNativePlan(`${question} Answer choices: A) -10, B) -12, C) -13, D) -15`, choices), null, "a trailing list must match the parsed choices exactly");
  assert.equal(desmosNativePlan(question, choices.map((choice, i) => i === 0 ? { ...choice, text: "-10" } : choice)), null, "two choices are possible");
  assert.equal(desmosNativePlan(question, choices.map((choice, i) => i === 3 ? { ...choice, text: "-17" } : choice)), null, "no choice is possible");
  assert.equal(desmosNativePlan(question, choices.map((choice, i) => i === 3 ? { ...choice, text: "-15/2" } : choice)), null, "nonintegral options need a separate proof");
  assert.equal(desmosNativePlan(question, choices.map((choice, i) => i === 0 ? { ...choice, text: "-100" } : choice)), null, "do not silently truncate a list covering every choice");
});

const ROOT_MINIMUM_QUESTION = "The function f is defined by f(x) = ax^2 + bx + c, where a, b, and c are constants. The equation f(x) = 0 has solutions x = 1 and x = -7. If a is an integer greater than 1, what is the least possible value of a + b?";

test("integer quadratic minimum uses the full unbounded sign proof and executable rows", () => {
  for (const [question, answer, firstRow] of [
    [ROOT_MINIMUM_QUESTION, "14", "a=2"],
    [ROOT_MINIMUM_QUESTION.replace("x = -7", "x = -9"), "18", "a=2"],
    [ROOT_MINIMUM_QUESTION.replace("greater than 1", "greater than 3"), "28", "a=4"],
    [ROOT_MINIMUM_QUESTION.replace("x = 1 and x = -7", "x = -2 and x = -4"), "14", "a=2"],
    [ROOT_MINIMUM_QUESTION.replace("ax^2", "ax²").replace("-7", "−7"), "14", "a=2"],
  ]) {
    const plan = desmosNativePlan(question)!;
    assert.ok(plan, question);
    assert.equal(plan.candidate.answer, answer);
    assert.equal(plan.candidate.rows[0].latex, firstRow);
    assert.equal(plan.candidate.rows.at(-1)?.latex, "a+b");
    assert.ok(plan.candidate.rows.every(row => row.slider === null));
    assert.match(plan.explanation.why, /global minimum/);
    const selected = selectMethods(repairDesmosNativePlans(candidatesResponseSchema.parse(candidatesResponse([paperCandidate({answer})], {question}))));
    assert.equal(selected.methods.find(method=>method.id===selected.winnerId)?.techniqueId, "bracket-regression");
  }
  for (const question of [
    ROOT_MINIMUM_QUESTION.replace("integer", "real number"),
    ROOT_MINIMUM_QUESTION.replace("least", "greatest"),
    ROOT_MINIMUM_QUESTION.replace("x = -7", "x = 7"),
    ROOT_MINIMUM_QUESTION.replace("x = -7", "x = 1"),
    ROOT_MINIMUM_QUESTION.replace("a + b?", "a + c?"),
    `${ROOT_MINIMUM_QUESTION} Also b is negative.`,
    ROOT_MINIMUM_QUESTION.replace("x = -7", "x = -1001"),
    ROOT_MINIMUM_QUESTION.replace("f(x) = 0", "F(x) = 0"),
  ]) assert.equal(desmosNativePlan(question), null, question);
});

test("old saved and error-marked cached root minima are repaired without another model call", async () => {
  const question = ROOT_MINIMUM_QUESTION;
  const old = graphCandidate({techniqueId:"slider-condition", rows:[
    {latex:"a=2",slider:{min:2,max:10,step:1},copiesRow:null},
    {latex:"f(x)=ax^2+bx+c",slider:null,copiesRow:null},
    {latex:"[f(1),f(-7)]\\sim[0,0]",slider:null,copiesRow:null},
    {latex:"a+b",slider:null,copiesRow:null},
  ],answer:"14",result:{type:"numeric",row:4,relatedRows:[],value:14,listIndex:null,answerFrom:"value",choiceLabel:null,detail:"a+b"}});
  const selected = selectMethods(candidatesResponseSchema.parse(candidatesResponse([old],{question})));
  const entry:CacheEntry={version:1,cacheKey:"old-root-minimum",promptConfigVersion:"old",question,choices:null,structure:null,methods:selected.methods,winnerId:selected.winnerId,modelPreference:null,retryOf:null,createdAt:""};
  const cache=createMemorySolveCache();
  await cache.putPreflight(entry.cacheKey,selected.winnerId,{status:"error",errors:[{row:2,message:"Unresolved coefficients"}]});
  const resolved=await resolveEntry(cache,entry);
  assert.equal(resolved.status,"ready");
  if(resolved.status!=="ready") return;
  const deps:PipelineDeps={cache,context:{model:"test",candidateInstructions:"",version:"test"},diagnosticId:"minimum-repair",tier:{priorityUnavailable:false},client:new OpenAI({apiKey:"unit-test-key",fetch:async()=>{throw new Error("No model calls allowed");}})};
  const result=await explainMethod(deps,resolved.entry,resolved.winner);
  assert.equal(result.source,"cache");
  assert.equal(result.solution.answer,"14");
  assert.deepEqual(result.solution.expressions.map(row=>row.latex),["a=2","[a(1)^2+b(1)+c,a(-7)^2+b(-7)+c]\\sim[0,0]","a+b"]);
  const saved=repairSavedNativeSolution({...result.solution,trick:"Slider until it fits",expressions:old.rows.map(row=>({latex:row.latex,purpose:"Old method",slider:row.slider}))});
  assert.deepEqual(saved.expressions,result.solution.expressions);
  assert.equal(saved.trick,"Bracket regression");
  const retried = {...entry, cacheKey:"old-root-minimum.desmos-retry", retryOf:entry.cacheKey};
  await cache.putPreflight(retried.cacheKey,selected.winnerId,{status:"error",errors:[{row:2,message:"Old retry also failed"}]});
  const recoveredRetry=await resolveEntry(cache,retried);
  assert.equal(recoveredRetry.status,"ready");
  if(recoveredRetry.status==="ready") assert.equal(recoveredRetry.winner.techniqueId,"bracket-regression");
});

test("fresh root minima need no rescue or explanation model call", async () => {
  let fetches=0;
  const cache=createMemorySolveCache();
  const deps:PipelineDeps={cache,context:{model:"test",candidateInstructions:"",version:"test"},diagnosticId:"fresh-minimum",tier:{priorityUnavailable:false},client:new OpenAI({apiKey:"unit-test-key",maxRetries:0,fetch:async()=>{
    fetches++;
    assert.equal(fetches,1,"native minimum needs no extra discovery or prose call");
    return Response.json(providerBody(candidatesResponse([paperCandidate({answer:"14"})],{question:ROOT_MINIMUM_QUESTION})));
  }})};
  const result=await solveProblem(deps,{kind:"text",problem:ROOT_MINIMUM_QUESTION,choices:null});
  assert.equal(result.kind,"solved");
  if(result.kind!=="solved") return;
  assert.equal(result.solution.answer,"14");
  assert.deepEqual(result.calls,{candidates:1,explanation:0});
  assert.equal(result.rescue,null);
});
