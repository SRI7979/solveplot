import assert from "node:assert/strict";
import test from "node:test";
import katex from "katex";
import { EDUCATIONAL_GUIDES, getGuide, guideHref } from "../src/content/educational-guides";
import { splitMathText } from "../src/lib/math-text";

test("public guide catalog has complete relationships and safe canonical slugs", () => {
  const slugs = new Set(EDUCATIONAL_GUIDES.map(guide => guide.slug));
  assert.equal(slugs.size, EDUCATIONAL_GUIDES.length);
  for (const guide of EDUCATIONAL_GUIDES) {
    assert.match(guide.slug, /^[a-z]+(?:-[a-z]+)*$/);
    assert.equal(guideHref(guide), `/guides/${guide.slug}`);
    assert.ok(guide.related.every(slug => slugs.has(slug as typeof guide.slug) && slug !== guide.slug));
    assert.ok(guide.example.rows.length > 0);
    assert.ok(guide.practice.rows.length > 0);
    assert.ok(guide.sources.every(source => new URL(source.url).protocol === "https:"));
  }
  assert.equal(getGuide("private-user-problem"), undefined);
});

test("all authored guide formulas render without a KaTeX parse error", () => {
  function strings(value: unknown): string[] {
    return typeof value === "string" ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === "object" ? Object.values(value).flatMap(strings) : [];
  }
  for (const value of strings(EDUCATIONAL_GUIDES)) {
    for (const part of splitMathText(value)) {
      if (part.type === "math") assert.doesNotThrow(() => katex.renderToString(part.value, { throwOnError: true, strict: "ignore" }), part.value);
    }
  }
});

test("original equation and system examples satisfy every original condition", () => {
  assert.equal(3 * 5 + 4, 19);
  assert.equal(4 * 6 - 7, 17);
  assert.equal(5 + 7, 12);
  assert.equal(2 * 5 - 7, 3);
  assert.equal(5 + 4, 9);
  assert.equal(5 - 4, 1);
  // Nonzero determinant means each two-line example has exactly one intersection.
  assert.notEqual(1 * -1 - 1 * 2, 0);
  assert.notEqual(1 * -1 - 1 * 1, 0);
});

test("quadratic table examples determine the published coefficients and predictions", () => {
  const f = (x: number) => x ** 2 + 2 * x + 3;
  const g = (x: number) => x ** 2 + 2 * x + 2;
  assert.deepEqual([0, 1, 2].map(f), [3, 6, 11]);
  assert.equal(f(4), 27);
  assert.deepEqual([0, 1, 2].map(g), [2, 5, 10]);
  assert.equal(g(3), 17);
  // The quadratic basis at 0, 1, 2 has determinant -2, so the fit is unique.
  const determinant = 0 * (1 * 1 - 1 * 2) - 0 * (1 * 1 - 1 * 4) + 1 * (1 * 2 - 1 * 4);
  assert.equal(determinant, -2);
});

test("quadratic minimum, roots, and restricted-domain warning agree", () => {
  const f = (x: number) => x ** 2 - 8 * x + 12;
  for (const x of [-100, -3, 0, 2, 4, 5, 6, 12, 100]) assert.equal(f(x), (x - 4) ** 2 - 4);
  assert.equal(f(4), -4);
  assert.equal(f(2), 0);
  assert.equal(f(6), 0);
  assert.equal(f(5), -3);
  // For x >= 5 the squared distance from 4 is at least 1; the boundary is minimal.
  for (const x of [5, 5.01, 6, 10, 100]) assert.ok(f(x) >= -3);
});
