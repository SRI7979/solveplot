import assert from "node:assert/strict";
import { test } from "node:test";
import { discoveryPrompt, loadSolveContext } from "../src/lib/solve-pipeline";

test("retrieval experiments separate caches, retain the baseline and restore full coverage on retries/images", async () => {
  const previous = process.env.SOLVEPLOT_STRATEGY_RETRIEVAL;
  try {
    delete process.env.SOLVEPLOT_STRATEGY_RETRIEVAL;
    assert.equal((await loadSolveContext()).discovery?.mode, "hint", "default keeps the full library with local hints");
    process.env.SOLVEPLOT_STRATEGY_RETRIEVAL = "off";
    const baseline = await loadSolveContext();
    const input = { kind: "text" as const, problem: "The identity ax^2+c=(4x+b)(x-2)-(x-1)^2 is true for all real x. Find a+b+c.", choices: null };
    assert.equal(discoveryPrompt(baseline, input).instructions, baseline.candidateInstructions);
    assert.equal(baseline.discovery, undefined);
    process.env.SOLVEPLOT_STRATEGY_RETRIEVAL = "focused";
    const focused = await loadSolveContext();
    assert.notEqual(focused.version, baseline.version);
    const prompt = discoveryPrompt(focused, input);
    assert.equal(prompt.trace?.fallback, false);
    assert.ok(prompt.instructions.length < baseline.candidateInstructions.length);
    assert.match(prompt.instructions, /REGRESSION SAFETY/);
    for (const variant of [discoveryPrompt(focused, input, true), discoveryPrompt(focused, { kind: "image", bytes: Buffer.from("fixture"), mime: "image/png" })]) {
      assert.equal(variant.trace?.fallback, true);
      assert.ok(variant.instructions.startsWith(baseline.candidateInstructions));
    }
    const unknown = discoveryPrompt(focused, { kind: "text", problem: "Please help with the question in the missing diagram." });
    assert.equal(unknown.trace?.fallback, true);
    process.env.SOLVEPLOT_STRATEGY_RETRIEVAL = "hint";
    const hinted = await loadSolveContext();
    assert.notEqual(hinted.version, focused.version);
    assert.ok(discoveryPrompt(hinted, input).instructions.startsWith(baseline.candidateInstructions));
  } finally {
    if (previous === undefined) delete process.env.SOLVEPLOT_STRATEGY_RETRIEVAL;
    else process.env.SOLVEPLOT_STRATEGY_RETRIEVAL = previous;
  }
});
