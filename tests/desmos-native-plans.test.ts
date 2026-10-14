import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { desmosNativePlan, repairDesmosNativePlans, repairSavedNativeSolution } from "../src/lib/desmos-native-plans";
import { candidatesResponse, graphCandidate, paperCandidate } from "./method-fixtures";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { validateExplanationQuality } from "../src/lib/method-presentation";
import { createMemorySolveCache, type CacheEntry } from "../src/lib/solve-cache";
import { explainMethod, resolveEntry, type PipelineDeps } from "../src/lib/solve-pipeline";

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
  const fresh = selectMethods(repairDesmosNativePlans(response));
  const winner = fresh.methods.find(method => method.id === fresh.winnerId)!;
  assert.equal(winner.techniqueId, "bracket-regression");
  assert.equal(winner.result.choiceLabel, "C");
  assert.equal(winner.result.value, 248);
  assert.ok(winner.rows.every(row => row.slider === null));
  assert.equal(winner.rows[1].latex, "[(a+\\sqrt{b})/6,(a-\\sqrt{b})/6]\\sim[5.20526,0.128073]");
  assert.equal(winner.rows[3].latex, "\\operatorname{round}(a)+\\operatorname{round}(b)");
  // Independent fit of the two rounded clicked roots, without fixed a.
  const a = 3*(5.20526+0.128073), b = (3*(5.20526-0.128073))**2;
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
  assert.equal(desmosNativePlan(question.replace("16x", "17x")), null);
  assert.equal(desmosNativePlan(question.replace("integers", "real numbers")), null);
  assert.equal(desmosNativePlan(question.replace("a + b?", "a - b?")), null);
});
