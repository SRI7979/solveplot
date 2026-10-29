import { affineForm, rational, toNumber } from "./linear-forms";

/** The unique x-intercept of a fully parsed numeric affine graph row.
 * This is a contradiction check for a claimed readout, not a proof that the
 * row represents the original question. Functions, parameters, powers,
 * restrictions, implicit equations, and oversized input remain unverified. */
export function scalarAffineXIntercept(latex: string): number | null {
  if (!latex || latex.length > 512 || /\^|\d{33}/.test(latex)) return null;
  let depth = 0;
  for (const character of latex) {
    if (character === "(" || character === "{") {
      if (++depth > 24) return null;
    } else if (character === ")" || character === "}") {
      if (--depth < 0) return null;
    }
  }
  if (depth !== 0) return null;
  const expression = latex.trim().replace(/^y\s*=\s*/, "");
  const form = affineForm(expression, name => name === "x" ? "variable" : null);
  const slope = form?.terms.get("x");
  if (!form || form.terms.size !== 1 || !slope || slope.n === BigInt(0)) return null;
  const root = rational(-form.constant.n * slope.d, form.constant.d * slope.n);
  if (root.n.toString(2).length > 256 || root.d.toString(2).length > 256) return null;
  const value = toNumber(root);
  return Number.isFinite(value) ? value : null;
}
