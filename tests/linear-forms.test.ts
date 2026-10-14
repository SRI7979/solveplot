import assert from "node:assert/strict";
import { test } from "node:test";

import { affineForm, determinedValue, differenceForm, formatRational, parseDecimal, rational, type AffineForm, type NameRole } from "../src/lib/linear-forms";

const variables = (...names: string[]): NameRole => (name) => (names.includes(name) ? "variable" : null);
const terms = (form: AffineForm | null) => (form ? Object.fromEntries([...form.terms].map(([name, value]) => [name, formatRational(value)])) : null);

test("affine forms read Desmos LaTeX exactly: juxtaposition, subscripts, fractions, decimals, and parentheses", () => {
  const role = variables("x_{1}", "y_{1}", "z", "a", "b");
  assert.deepEqual(terms(affineForm("7x_{1}+4y_{1}+8z", role)), { "x_{1}": "7", "y_{1}": "4", z: "8" });
  assert.deepEqual(terms(affineForm("4x_1+y_1+5z", role)), { "x_{1}": "4", "y_{1}": "1", z: "5" }, "x_1 and x_{1} are one name");
  const mixed = affineForm("\\frac{1}{2}x_{1}-3\\left(y_{1}+2\\right)", role)!;
  assert.deepEqual(terms(mixed), { "x_{1}": "0.5", "y_{1}": "-3" });
  assert.equal(formatRational(mixed.constant), "-6");
  assert.deepEqual(terms(affineForm("1.5a\\cdot2-b/4", role)), { a: "3", b: "-0.25" });
  assert.deepEqual(terms(affineForm("2^{3}a", role)), { a: "8" });
  assert.equal(formatRational(affineForm("-337", role)!.constant), "-337");
});

test("anything not provably affine is unverifiable, never guessed", () => {
  const role = variables("x_{1}", "y_{1}", "a", "b");
  for (const latex of ["x_{1}y_{1}", "a^{2}", "a/b", "a/2b", "\\sqrt{a}", "2 3", "x^23", "\\operatorname{mean}(a)", "[a,b]", "q", "a+", ""]) {
    assert.equal(affineForm(latex, role), null, latex);
  }
  // Known values substitute exactly, so 7rx_{1} is affine in r once x_{1}=2.
  const known: NameRole = (name) => (name === "x_{1}" ? rational(BigInt(2)) : name === "r" ? "variable" : null);
  assert.deepEqual(terms(affineForm("7rx_{1}", known)), { r: "14" });
});

test("a readout is determined only when every exact solution gives it the same value", () => {
  const role = variables("x_{1}", "y_{1}", "z");
  const condition = (left: string, right: string) => differenceForm(affineForm(left, role)!, affineForm(right, role)!);
  const system = [condition("7x_{1}+4y_{1}+8z", "61"), condition("4x_{1}+y_{1}+5z", "37")];
  const value = (latex: string) => {
    const result = determinedValue(system, affineForm(latex, role)!);
    return result && formatRational(result);
  };
  assert.equal(value("x_{1}+y_{1}+z"), "8", "the first equation minus the second is 3x+3y+3z=24");
  assert.equal(value("2x_{1}+2y_{1}+2z+1"), "17");
  assert.equal(value("x_{1}"), null, "x alone moves along the solution line");
  assert.equal(value("y_{1}-z"), null);
  const inconsistent = [condition("x_{1}+y_{1}", "3"), condition("2x_{1}+2y_{1}", "7")];
  assert.equal(determinedValue(inconsistent, affineForm("x_{1}+y_{1}", role)!), null, "contradictory equations fix nothing");
  const square = [condition("x_{1}+y_{1}", "3"), condition("x_{1}-y_{1}", "1")];
  assert.equal(formatRational(determinedValue(square, affineForm("y_{1}/3", role)!)!), "1/3");
});

test("decimals parse exactly and format as decimals or fractions", () => {
  assert.equal(formatRational(parseDecimal("12.5")), "12.5");
  assert.equal(formatRational(parseDecimal(".5")), "0.5");
  assert.equal(formatRational(parseDecimal("-2.25")), "-2.25");
  assert.equal(formatRational(rational(BigInt(10), BigInt(3))), "10/3");
  assert.equal(formatRational(rational(BigInt(24), BigInt(3))), "8");
});
