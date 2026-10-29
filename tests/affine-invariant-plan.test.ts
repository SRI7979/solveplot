import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { affineInvariantPlan } from "../src/lib/affine-invariant-plan";
import { repairCachedDesmosNativePlans, repairDesmosNativePlans, repairSavedNativeSolution } from "../src/lib/desmos-native-plans";
import { validateExplanationQuality } from "../src/lib/method-presentation";
import { createMemorySolveCache, type CacheEntry } from "../src/lib/solve-cache";
import { explainMethod, type PipelineDeps } from "../src/lib/solve-pipeline";
import { findRegressionDeterminacyViolations } from "../src/lib/solver-rules";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { candidatesResponse, graphCandidate, paperCandidate } from "./method-fixtures";

const question = (condition: string, target: string, u = "x", v = "y") => `Real numbers ${u} and ${v} satisfy ${condition}. What is the value of ${target}?`;
const CUBIC = question("2x+y=20", "8x^3+12x^2y+6xy^2+y^3");

test("proven affine invariants preserve the original equation and expanded target in two rows", () => {
  for (const [input, answer] of [
    [CUBIC, "8000"],
    [question("3u-2v=7", "81u^4-216u^3v+216u^2v^2-96uv^3+16v^4", "u", "v"), "2401"],
    [question("3r-2s=7", "(3r-2s)^6", "r", "s"), "117649"],
    [question("u+v=1/3", "(u+v)^3", "u", "v"), "1/27"],
    [question("u+v=3", "u^2+2uv+v^2+5", "u", "v"), "14"],
    [question("0.5u-v=-2", "(0.5u-v)^2", "u", "v"), "4"],
  ]) {
    const plan = affineInvariantPlan(input);
    assert.ok(plan, input);
    assert.equal(plan.candidate.answer, answer);
    assert.equal(plan.candidate.rows.length, 2);
    assert.deepEqual(findRegressionDeterminacyViolations(plan.candidate.rows, { readoutRow: 2 }), []);
    assert.equal(plan.candidate.cost.derivationSteps, 0);
  }
  assert.deepEqual(affineInvariantPlan(CUBIC)?.candidate.rows.map(row => row.latex), ["2p+q\\sim20", "8p^3+12p^2q+6pq^2+q^3"]);
});

test("renaming is simultaneous and preserves LaTeX command tokens and arithmetic", () => {
  const swapped = affineInvariantPlan(question("q+2p=3", "(q+2p)^2", "q", "p"));
  assert.deepEqual(swapped?.candidate.rows.map(row => row.latex), ["p+2q\\sim3", "(p+2q)^2"]);
  const fraction = affineInvariantPlan(question(String.raw`\frac{x}{2}+y=3`, String.raw`\frac{(x+2y)^2}{4}`));
  assert.equal(fraction?.candidate.answer, "9");
  assert.match(fraction!.candidate.rows[0].latex, /\\frac\{p\}\{2\}/);
  const multiply = affineInvariantPlan(question(String.raw`2\cdot x+y=20`, String.raw`\left(2\times x+y\right)^3`));
  assert.equal(multiply?.candidate.answer, "8000");
  assert.ok(multiply?.candidate.rows.every(row => !/\\cdotp|\\timesp/.test(row.latex)));
  assert.equal(affineInvariantPlan(CUBIC.replace("What is the value of", "Evaluate"))?.candidate.answer, "8000");
  assert.equal(affineInvariantPlan(CUBIC.replace("What is the value of", "Find"))?.candidate.answer, "8000");
});

test("noninvariants, nonlinear or degenerate constraints, extra assumptions, and unsupported syntax decline", () => {
  for (const input of [
    question("2x+y=20", "x+y"), question("xy=3", "xy"), question("x^2+y=3", "x^2+y"),
    question("x+y=x+y+1", "0"), question("x+y=x+y", "0"), question("x=2", "x^2"),
    question("x+y=3", "x+y+z"), question("x+y=3", "(x+y)^7"), question("x+y=3", "x/x"),
    question("x+y=3", String.raw`\sin(x+y)`), question("x+y=3", "[x,y]"),
    question("x+y=3", "(x+y)^02"), question("x+y=3", "(x+y)^2.0"),
    question("x+y=3", "(x+y)^(2)"),
    CUBIC + " Also x is positive.", "If x is positive, " + CUBIC,
    CUBIC.replace("Real numbers", "Positive real numbers"), CUBIC.replace("Real numbers", "Integers"),
    CUBIC.replace("satisfy 2x+y=20.", "satisfy 2x+y=20 and x>0."),
    CUBIC.replace("numbers x and y", "numbers x and x"),
  ]) assert.equal(affineInvariantPlan(input), null, input);
});

test("a verified invariant plan displaces incomplete calculator samples while retaining a genuine paper method", () => {
  const sampled = graphCandidate({ rows: [{ latex: "x=0", slider: null, copiesRow: null }, { latex: "y=20", slider: null, copiesRow: null }], answer: "8000" });
  const paper = paperCandidate({ answer: "8000" });
  const original = candidatesResponseSchema.parse(candidatesResponse([sampled, paper], { question: CUBIC }));
  const fixed = repairDesmosNativePlans(original);
  assert.equal(fixed.candidates.length, 2);
  assert.ok(fixed.candidates.some(candidate => candidate.rows.length === 0));
  const selected = selectMethods(fixed);
  const winner = selected.methods.find(method => method.id === selected.winnerId)!;
  assert.equal(winner.techniqueId, "parameter-regression");
  assert.equal(winner.answer, "8000");
  assert.doesNotThrow(() => validateExplanationQuality(winner, affineInvariantPlan(CUBIC)!.explanation));
  const wrongChoices = candidatesResponseSchema.parse({ ...original, choices: [{ label: "A", text: "7" }, { label: "B", text: "8" }] });
  assert.strictEqual(repairDesmosNativePlans(wrongChoices), wrongChoices);
  const choices = [{ label: "A", text: "8000" }, { label: "B", text: "40" }];
  const choiceFixed = repairDesmosNativePlans(candidatesResponseSchema.parse({ ...original, choices }));
  assert.equal(choiceFixed.candidates[0].result.choiceLabel, "A");
});

test("native invariant explanations, repaired caches, and saved calculator plans need no model call", async () => {
  const original = candidatesResponseSchema.parse(candidatesResponse([paperCandidate({ answer: "8000" })], { question: CUBIC }));
  const selection = selectMethods(repairDesmosNativePlans(original));
  const entry: CacheEntry = { version: 1, cacheKey: "affine-proof", promptConfigVersion: "test", question: CUBIC, choices: null,
    structure: selection.structure, methods: selection.methods, winnerId: selection.winnerId, modelPreference: null, retryOf: null, createdAt: "" };
  const repaired = repairCachedDesmosNativePlans(entry);
  const method = repaired.methods.find(item => item.id === repaired.winnerId)!;
  let calls = 0;
  const deps: PipelineDeps = { cache: createMemorySolveCache(), context: { model: "test", candidateInstructions: "", version: "test" }, diagnosticId: "affine-proof",
    tier: { priorityUnavailable: false }, client: new OpenAI({ apiKey: "test", fetch: async () => { calls++; throw new Error("No network"); } }) };
  const result = await explainMethod(deps, repaired, method);
  assert.equal(result.source, "cache");
  assert.equal(result.solution.answer, "8000");
  const saved = { ...result.solution, expressions: [{ latex: "20^3", purpose: "After factoring by hand" }] };
  const corrected = repairSavedNativeSolution(saved);
  assert.equal(corrected.expressions.length, 2);
  assert.equal(corrected.expressions[0].latex, "2p+q\\sim20");
  for (const choices of [
    [{ label: "A", text: "10" }, { label: "B", text: "20" }],
    [{ label: "A", text: "8000" }, { label: "B", text: "8000" }],
  ]) {
    const staleCache = { ...entry, choices };
    const staleSaved = { ...saved, choices };
    assert.strictEqual(repairCachedDesmosNativePlans(staleCache), staleCache, "a repair cannot choose a missing or ambiguous answer");
    assert.strictEqual(repairSavedNativeSolution(staleSaved), staleSaved, "stale choices do not make loading history throw");
  }
  assert.equal(calls, 0);
});

const SCREENSHOT = 'What is the value of the expression $8x^2+18x+8xy+9y+2y^2$ when $2x+y=20$?';

test('screenshot wording recognizes the original expression without stripping conditions', () => {
  for (const input of [SCREENSHOT, SCREENSHOT.replace('the expression', 'expression:'),
    'If 2x+y=20, what is the value of the expression 8x²+18x+8xy+9y+2y²?',
    question('x+2y=7', 'the expression 3(x+2y)^2+5(x+2y)')]) {
    const plan = affineInvariantPlan(input);
    assert.ok(plan, input);
    assert.equal(plan.candidate.answer, input.includes('=7') ? '182' : '980');
    assert.equal(plan.candidate.rows.length, 2);
  }
  for (const input of [SCREENSHOT + ' Also x is positive.',
    SCREENSHOT.replace('the expression', 'the positive expression'),
    SCREENSHOT.replace('8x^2+18x+8xy+9y+2y^2', 'x+y'),
    SCREENSHOT.replace('2x+y=20', '2x+y=20 and x>0')]) {
    assert.equal(affineInvariantPlan(input), null, input);
  }
});

test('the screenshot paper fallback is repaired on fresh selection, old cache and retried cache without inference', async () => {
  const raw = candidatesResponseSchema.parse(candidatesResponse([paperCandidate({techniqueId:'direct-arithmetic',answer:'980'})],{question:SCREENSHOT}));
  const original = selectMethods(raw);
  assert.equal(original.methods[0].rows.length, 0);
  const fresh = selectMethods(repairDesmosNativePlans(raw));
  assert.equal(fresh.winnerId, 'parameter-regression');
  let calls = 0;
  const deps: PipelineDeps = {cache:createMemorySolveCache(),context:{model:'test',candidateInstructions:'',version:'test'},diagnosticId:'wording',tier:{priorityUnavailable:false},client:new OpenAI({apiKey:'test',fetch:async()=>{calls++;throw new Error('No inference');}})};
  for (const retryOf of [null, 'previous-entry']) {
    const entry: CacheEntry = {version:1,cacheKey:'old-wording',promptConfigVersion:'old',question:SCREENSHOT,choices:null,structure:'',methods:original.methods,winnerId:original.winnerId,modelPreference:null,retryOf,createdAt:''};
    const repaired = repairCachedDesmosNativePlans(entry);
    const winner = repaired.methods.find(method=>method.id===repaired.winnerId)!;
    assert.equal(winner.techniqueId,'parameter-regression');
    assert.deepEqual(winner.rows.map(row=>row.latex),['2p+q\\sim20','8p^2+18p+8pq+9q+2q^2']);
    const result = await explainMethod(deps,repaired,winner);
    assert.equal(result.source,'cache');
    assert.equal(result.solution.answer,'980');
    const saved = repairSavedNativeSolution({...result.solution,expressions:[],method:'algebra',trick:'Direct arithmetic'});
    assert.equal(saved.expressions.length,2);
    assert.equal(saved.method,'desmos');
  }
  assert.equal(calls,0);
});
