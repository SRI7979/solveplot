import assert from "node:assert/strict";
import { test } from "node:test";
import sharp from "sharp";
import { originalProblemText } from "../src/lib/text-problem";
import { textProblemPreview } from "../src/lib/text-problem-preview";

test("History accepts only bounded original text metadata and remains compatible with image records", () => {
  for (const value of [
    null,
    {},
    { inputText: 3 },
    { inputText: " " },
    { inputText: "x".repeat(6001) },
  ])
    assert.equal(originalProblemText(value), null);
  assert.equal(
    originalProblemText({ inputText: "x² + 4x + 3 = 0\nWhat is x?" }),
    "x² + 4x + 3 = 0\nWhat is x?",
  );
});

test("typed History previews escape markup and stay bounded for many short lines", async () => {
  const bytes = await textProblemPreview(
    '<svg> & "math"\n' + Array(1000).fill("x").join("\n"),
  );
  const info = await sharp(bytes).metadata();
  assert.equal(info.format, "png");
  assert.equal(info.width, 900);
  assert.ok(info.height! <= 2030);
  assert.ok(bytes.length < 8 * 1024 * 1024);
});
