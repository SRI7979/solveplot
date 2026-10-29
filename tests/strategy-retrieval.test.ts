import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { GoldSolution } from "../src/lib/gold-solutions";
import { buildRetrievalIndex, retrieveStrategies, SHORTCUT_CHALLENGE_INSTRUCTIONS } from "../src/lib/strategy-retrieval";

const library = readFileSync(new URL("../src/content/desmos-tricks.md", import.meta.url), "utf8");
const index = buildRetrievalIndex(library);

test("indexes only the 79 annotated strategies, preserving examples and cross-cutting rules", () => {
  assert.equal(index.strategies.length, 79);
  assert.deepEqual(index.strategies.map(strategy => strategy.number), Array.from({ length: 79 }, (_, i) => i + 1));
  assert.match(index.strategies[60].body, /1\. x_\{1\}=\[-6,0\]/);
  assert.ok(!index.strategies[78].body.includes("REGRESSION SAFETY"));
  for (const heading of ["REGRESSION SAFETY", "DESMOS-FIRST ROUTING", "WRITTEN FALLBACKS", "OUTPUT CONTRACT"]) assert.ok(index.footer.includes(heading));
  assert.ok(index.preamble.startsWith("SOLVEPLOT SAT MATH STRATEGY LIBRARY"));
  assert.equal(index.fullLibrary, library);
});

test("retrieves identity strategies across unseen coefficients without prescribing answers", () => {
  const questions = [
    "ax^2+c=(2x+b)(x-3)-(x-1)^2 for all real values of x. Find a+b+c.",
    "px^2+r=(7x+q)(x+4)-(2x-5)^2 for all x. What is p+q+r?",
  ];
  for (const question of questions) {
    const result = retrieveStrategies(index, question);
    assert.equal(result.fallback, false);
    assert.ok(result.strategyIds.includes(59));
    assert.ok(result.strategyIds.includes(60));
    assert.ok(result.strategyIds.length >= 5 && result.strategyIds.length <= 10);
    assert.match(result.focusHint, /degree-d.*d\+1/);
    assert.match(result.focusHint, /requested quantity/);
    assert.ok(result.focusedLibrary.includes(index.footer));
    assert.ok(result.focusedLibrary.includes(index.preamble));
    assert.ok(result.focusedLibrary.length < library.length);
  }
});

test("radical forms retain both-root, precision, and integer-proof prerequisites", () => {
  const result = retrieveStrategies(index, "2x^2-9x+1=0. One root can be written as (u+sqrt(v))/4, where u and v are integers. Find u+v.");
  assert.equal(result.fallback, false);
  assert.ok(result.strategyIds.includes(78));
  assert.match(result.focusHint, /both conjugate forms/);
  assert.match(result.focusHint, /approximate/);
  assert.match(result.focusHint, /original equation/);
  assert.match(result.focusHint, /One clicked root does not identify two/);
});

test("invariant retrieval does not claim that an arbitrary fitted branch proves the target", () => {
  const result = retrieveStrategies(index, "For every solution of 7x+3y=18, the expression has the same value. What is that value?");
  assert.ok(result.strategyIds.includes(79));
  assert.match(result.focusHint, /proven constant across every allowed solution/);
  assert.match(result.focusHint, /One convenient fitted pair or one nonlinear branch cannot/);
});

test("one constraint triggers an identifiability search equally for fixed and varying targets", () => {
  const constraint = "Real numbers x and y satisfy 3x+y=11.";
  const fixed = retrieveStrategies(index, `${constraint} What is the value of 9x^2+6xy+y^2?`);
  const varying = retrieveStrategies(index, `${constraint} What is the value of x+y?`);
  for (const result of [fixed, varying]) {
    assert.equal(result.fallback, false);
    assert.equal(result.confidence, "medium");
    assert.ok(result.structures.includes("constrained-target"));
    assert.ok(!result.structures.includes("invariant-target"));
    assert.ok(result.strategyIds.includes(79));
    assert.match(result.focusHint, /Search hypothesis only/);
    assert.match(result.focusHint, /two valid pairs with different targets disprove uniqueness/);
    assert.match(result.focusHint, /Do not assert an invariant/);
    assert.doesNotMatch(result.focusHint, /(?:answer is|target equals|=121)/);
  }
  assert.deepEqual(fixed.strategyIds, varying.strategyIds);
  assert.equal(retrieveStrategies(index, "Real numbers p and q satisfy 7p-q=4. Find p+q.").confidence, "medium");
  assert.ok(!retrieveStrategies(index, "Real numbers p and q satisfy an unspecified equation. Find p+q.").structures.includes("constrained-target"));
});

test("negative identity/factor cues and non-polynomial infinite roots retain the complete library", () => {
  for (const question of [
    "Which expression is not equivalent to 5(x+2)?",
    "The relation is not an identity. What is the value of x?",
    "The linear term is not a factor of this polynomial.",
    "sin(x)=0 has infinitely many solutions. Determine whether sin(x) is always zero.",
    "Interpret the story accompanying the missing diagram.",
  ]) {
    const result = retrieveStrategies(index, question);
    assert.equal(result.fallback, true, question);
    assert.equal(result.confidence, "low");
    assert.equal(result.focusedLibrary, library);
  }
});

test("simple original equations retain direct graphing without requiring algebraic preprocessing", () => {
  const result = retrieveStrategies(index, "Solve (4x-7)/3=9.");
  assert.equal(result.fallback, false);
  assert.ok(result.strategyIds.includes(3));
  assert.ok(result.strategyIds.includes(4));
  assert.match(SHORTCUT_CHALLENGE_INSTRUCTIONS, /genuinely different representations/);
  assert.match(SHORTCUT_CHALLENGE_INSTRUCTIONS, /optional simplest paper alternative/);
});

test("gold retrieval excludes drafts, selects related reviewed examples, and preserves all on fallback", () => {
  const gold = (id: string, techniqueId: GoldSolution["techniqueId"], needs_review = false): GoldSolution => ({
    id, techniqueId, needs_review, question: "A polynomial identity true for all x.", answer_choices: {},
    correct_answer: "1", strategy_name: "Example", trigger_pattern: "polynomial identity", desmos_steps: ["x_1=[0...2]"], why_preferred: "Fits original forms.",
  });
  const withGold = buildRetrievalIndex(library, [gold("reviewed-identity", "identity-regression"), gold("draft-identity", "identity-regression", true), gold("reviewed-statistics", "statistics-builtin")]);
  const selected = retrieveStrategies(withGold, "ax+b=3(x-1) for all x. Find a+b.");
  const examples = JSON.parse(selected.selectedGoldPrompt) as GoldSolution[];
  assert.deepEqual(examples.map(example => example.id), ["reviewed-identity"]);
  assert.equal(examples[0].desmos_steps[0], "x_{1}=[0...2]");
  const fallback = JSON.parse(retrieveStrategies(withGold, "Interpret this diagram.").selectedGoldPrompt) as GoldSolution[];
  assert.deepEqual(fallback.map(example => example.id), ["reviewed-identity", "reviewed-statistics"]);
});

test("retrieval is stable, bounded, and leaves the source index untouched", () => {
  const before = JSON.stringify(index);
  const question = "The standard deviation of the values in a frequency table is requested.";
  const first = retrieveStrategies(index, question);
  assert.deepEqual(retrieveStrategies(index, question), first);
  assert.ok(first.strategyIds.includes(47));
  assert.ok(first.strategyIds.includes(66));
  assert.equal(new Set(first.strategyIds).size, first.strategyIds.length);
  assert.equal(JSON.stringify(index), before);
});
