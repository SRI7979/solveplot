import assert from "node:assert/strict";
import { test } from "node:test";
import { affineForm, affineSolutionSpace, differenceForm, formatRational, parseDecimal, type NameRole, type Rational } from "../src/lib/linear-forms";
import { polynomialReadoutValue } from "../src/lib/polynomial-invariants";

function prove(conditions: string[], target: string, names = ["u", "v"], known = new Map<string, Rational>()) {
  const role: NameRole = (name) => known.get(name) ?? (names.includes(name) ? "variable" : null);
  const forms = conditions.map((condition) => {
    const sides = condition.split("=");
    if (sides.length !== 2) return null;
    const left = affineForm(sides[0], role), right = affineForm(sides[1], role);
    return left && right ? differenceForm(left, right) : null;
  });
  if (forms.some((form) => !form)) return null;
  const space = affineSolutionSpace(forms.filter((form) => form !== null), names);
  return polynomialReadoutValue(target, role, space);
}

test("an expanded cubic target is proved fixed over the entire affine solution space", () => {
  assert.equal(formatRational(prove(["2u+v=20"], "8u^3+12u^2v+6uv^2+v^3")!), "8000");
  assert.equal(formatRational(prove(["3u-2v=7"], "81u^4-216u^3v+216u^2v^2-96uv^3+16v^4")!), "2401");
  assert.equal(formatRational(prove(["3u-2v=7"], "(3u-2v)^6")!), "117649");
});

test("varying targets and genuinely free coordinates do not become invariant", () => {
  assert.equal(prove(["2u+v=20"], "u+v"), null);
  assert.equal(prove(["2u+v=20"], "u^2+v^2"), null);
  assert.equal(prove(["u+v=3"], "(u+v)^2+w", ["u", "v", "w"]), null);
  assert.equal(prove(["u+v=3"], "w^2", ["u", "v", "w"]), null);
  assert.equal(formatRational(prove(["u+v=3"], "(u+v)^2+w-w", ["u", "v", "w"])!), "9");
});

test("multiple affine constraints and exact decimal coefficients share the existing rational reducer", () => {
  assert.equal(formatRational(prove(["u+v=3", "v-w=1"], "(u+w)^4", ["u", "v", "w"])!), "16");
  assert.equal(formatRational(prove(["u+2v=10"], "(0.1u+0.2v)^2")!), "1");
  assert.equal(formatRational(prove(["u+v=1/3"], "(u+v)^3")!), "1/27");
  assert.equal(formatRational(prove(["2u+v=20"], "(2u+v)^2/k", ["u", "v"], new Map([["k", parseDecimal("0.5")]]))!), "800");
  assert.equal(formatRational(prove(["x_1+y_1=5"], String.raw`\frac{(x_{1}+y_{1})^{2}}{2}`, ["x_{1}", "y_{1}"])!), "12.5");
});

test("symbolic cancellation is exact, including terms in unconstrained coordinates", () => {
  assert.equal(formatRational(prove(["u+v=3"], "(u+v)^2-u^2-2uv-v^2+5")!), "5");
  assert.equal(formatRational(prove(["u+v=3"], "u-u")!), "0");
  assert.equal(formatRational(prove(["u+v=3"], "1/(u-u+2)")!), "0.5");
});

test("inconsistent or nonlinear regression conditions never justify a target", () => {
  assert.equal(prove(["u+v=1", "u+v=2"], "u-u+5"), null);
  assert.equal(prove(["u+v=1", "u+v=2"], "0"), null);
  assert.equal(prove(["u^2+v=20"], "u^2+v"), null);
  assert.equal(prove(["uv=20"], "uv"), null);
});

test("functions, variable denominators, malformed syntax, and absent names fail closed", () => {
  for (const target of ["u/u", "1/u", "1/(u-u)", "1/0", "(u+v", "u^23", "u^{-1}", "u^{0.5}", "u+v+w", "u/2v", "2 3", "u=2", "[u,v]", "u{u>0}", String.raw`\sqrt{u}`, String.raw`\sin(u)`, String.raw`\operatorname{round}(u)`, "sin(u)", ""]) {
    assert.equal(prove(["u=2", "v=3"], target), null, target);
  }
});

test("a numerical exponent value cannot erase unbraced Desmos token boundaries", () => {
  for (const target of ["(u+v)^02", "(u+v)^2.0", "(u+v)^01", "(u+v)^.0", "(u+v)^(2)", "(u+v)^(1+1)"]) {
    assert.equal(prove(["u+v=3"], target), null, target);
  }
  assert.equal(formatRational(prove(["u+v=3"], "(u+v)^{2.0}")!), "9");
  assert.equal(formatRational(prove(["u+v=3"], "(u+v)^{02}")!), "9");
});

test("polynomial and arithmetic bounds reject expensive expressions before acceptance", () => {
  assert.equal(prove(["u+v=3"], "(u+v)^7"), null, "degree cap");
  assert.equal(prove(["u=1"], "(u+v+w+a+b+c)^6", ["u", "v", "w", "a", "b", "c"]), null, "monomial cap");
  assert.equal(prove(["u=1"], "u+v+w+a+b+c+d", ["u", "v", "w", "a", "b", "c", "d"]), null, "variable cap");
  assert.equal(prove(["u+v=3"], Array(300).fill("u").join("+")), null, "token cap");
  assert.equal(prove(["u+v=3"], `(${"9".repeat(64)})^6`), null, "coefficient size cap");
  assert.equal(prove(["u+v=3"], " ".repeat(4097)), null, "input size cap");
});
