import assert from "node:assert/strict";
import { test } from "node:test";
import { isLocalLearnReview } from "../src/lib/local-learn-review";

test("local Learn access requires an explicit development flag and is disabled in production", () => {
  assert.equal(isLocalLearnReview({ NODE_ENV: "development", SOLVEPLOT_LEARN_REVIEW: "1" }), true);
  for (const NODE_ENV of [undefined, "test", "production"]) {
    assert.equal(isLocalLearnReview({ NODE_ENV, SOLVEPLOT_LEARN_REVIEW: "1" }), false);
  }
  for (const SOLVEPLOT_LEARN_REVIEW of [undefined, "0", "true", ""]) {
    assert.equal(isLocalLearnReview({ NODE_ENV: "development", SOLVEPLOT_LEARN_REVIEW }), false);
  }
});
