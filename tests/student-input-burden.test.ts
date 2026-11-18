import assert from "node:assert/strict";
import test from "node:test";

import { measuredSetupFloor } from "../src/lib/student-input-burden";

test("no setup penalty for short, directly transcribed rows", () => {
  assert.equal(measuredSetupFloor([{ latex: "2x+y=7" }, { latex: "x-y=3" }], "Solve 2x+y=7 and x-y=3.", null), 0);
});

test("chosen test values are priced unless supplied in the question or choices", () => {
  assert.equal(measuredSetupFloor([{ latex: "r=1" }, { latex: "2x+3y=7" }], "For every real r, find a point.", null), 2);
  assert.equal(measuredSetupFloor([{ latex: "r=1" }], "Given r=1, solve the problem.", null), 0);
  assert.equal(measuredSetupFloor([{ latex: "r=10" }], "Choose the correct expression.", [{ label: "A", text: "r=10" }]), 0);
});

test("long constructions carry a bounded typing/setup penalty", () => {
  assert.equal(measuredSetupFloor([{ latex: "x".repeat(101) }], "Find x.", null), 1);
  assert.equal(measuredSetupFloor([{ latex: "x".repeat(171) }], "Find x.", null), 2);
  assert.equal(measuredSetupFloor([{ latex: "r=1" }, { latex: "x".repeat(500) }], "Find x.", null), 4);
});

test("expressions and fitted or copied Desmos values are not mislabeled invented literals", () => {
  assert.equal(measuredSetupFloor([{ latex: "a+b" }, { latex: "x_{1}=[0,1,2]" }, { latex: "k=f(2)" }], "Find a+b.", null), 0);
});
