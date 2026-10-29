import { affineSolutionSpace, parseDecimal, rational, toNumber, type AffineForm, type Rational } from "./linear-forms";
import { polynomialReadoutValue, polynomialTerms } from "./polynomial-invariants";

const normalize = (text: string) => text.replace(/[−–]/g, "-").replace(/²/g, "^2").replace(/³/g, "^3").replace(/\$/g, "").replace(/\\(?:left|right)/g, "").trim();
const same = (a: Rational, b: Rational) => a.n * b.d === b.n * a.d;
const zero = () => rational(BigInt(0));

/** Closed source grammar. Extra conditions, nonlinear coefficient constraints,
 * rational functions and unrecognized wording are outside this proof. This
 * verifies emitted plans; it never generates a solution or calculator rows. */
export function polynomialIdentity(question: string) {
  if (question.length > 4096) return null;
  const match = normalize(question).match(/^For (?:every|all) (?:real )?(?:numbers? )?([a-z]),\s*(.+?)\s*=\s*(.+?),\s*where (.+?) are constants\.\s*(?:What is|Find)\s+(.+?)[?.]?$/i);
  if (!match) return null;
  const [, variable, left, right, declared, target] = match;
  const parameters = declared.split(/\s*(?:,?\s+and\s+|,)\s*/).filter(Boolean);
  if (parameters.length < 1 || parameters.length > 4 || new Set(parameters).size !== parameters.length || parameters.some(p => !/^[a-z]$/.test(p) || p === variable)) return null;
  const role = (name: string) => name === variable || parameters.includes(name) ? "variable" as const : null;
  const terms = polynomialTerms(`(${left})-(${right})`, role);
  if (!terms) return null;
  const conditions = new Map<number, { constant: Rational; terms: Map<string, Rational> }>();
  let degree = 0;
  for (const [monomial, coefficient] of terms) {
    const names = monomial ? monomial.split("*") : [];
    const power = names.filter(n => n === variable).length;
    const unknowns = names.filter(n => n !== variable);
    if (unknowns.length > 1) return null;
    degree = Math.max(degree, power);
    const form = conditions.get(power) ?? { constant: zero(), terms: new Map<string, Rational>() };
    if (unknowns.length) form.terms.set(unknowns[0], coefficient);
    else form.constant = coefficient;
    conditions.set(power, form);
  }
  if (degree < 1 || degree > 5) return null;
  const space = affineSolutionSpace([...conditions.values()] as AffineForm[], parameters);
  if (!space || parameters.some(p => space.get(p)?.terms.size !== 0)) return null;
  const value = polynomialReadoutValue(target, name => parameters.includes(name) ? "variable" : null, space);
  if (!value || !Number.isFinite(toNumber(value))) return null;
  return { variable, left, right, target, parameters, terms, role, space, value, degree };
}

/** A special input is a mathematical selection even when the model calls its
 * row ordinary function evaluation. Given-input evaluation is not charged. */
export function identityInsightBurden(question: string, rows: readonly { latex: string }[]): number {
  if (!polynomialIdentity(question) || rows.some(row => /~|\\sim\b/.test(row.latex))) return 0;
  return rows.length ? 1 : 0;
}

/** Exact original-identity and readout checks for the supported source family.
 * A degree-d polynomial agreeing at d+1 distinct inputs is identically zero;
 * coefficient reduction independently establishes the fitted parameters.
 * Unsupported rows stay with the existing validators, never gain a proof badge. */
export function identityPlanIssue(question: string, rows: readonly { latex: string }[], readoutRow: number | null, answer: string): string | null {
  const proof = polynomialIdentity(question);
  if (!proof) return null;
  const fits = rows.filter(row => /~|\\sim\b/.test(row.latex));
  if (fits.length !== 1) return null;
  const definitions = rows.flatMap(({ latex }) => {
    const match = normalize(latex).match(/^([a-z])_(?:\{(\w+)\}|(\w))\s*=\s*(.+)$/);
    return match ? [{ name: `${match[1]}_{${match[2] ?? match[3]}}`, body: match[4] }] : [];
  });
  if (definitions.length !== 1) return null;
  const data = definitions[0];
  const fit = normalize(fits[0].latex).replace(/([a-z])_(\w)/g, "$1_{$2}");
  const sides = fit.split(/~|\\sim\b/);
  if (sides.length !== 2) return null;
  const restored = `(${sides[0]})-(${sides[1]})`.split(data.name).join(proof.variable);
  const actual = polynomialTerms(restored, proof.role);
  if (!actual) return null;
  // Exact symbolic equality of residuals, allowing both sides to be swapped.
  const agrees = (sign: number) => actual.size === proof.terms.size && [...actual].every(([key, value]) => {
    const expected = proof.terms.get(key);
    return expected && same(value, rational(expected.n * BigInt(sign), expected.d));
  });
  if (!agrees(1) && !agrees(-1)) return "The fitted polynomial changes the original identity. Copy both original sides before fitting.";
  const list = data.body.match(/^\[([^\]]+)\]$/);
  if (list) {
    let values: number[];
    const range = list[1].match(/^(-?\d+)\s*\.\.\.\s*(-?\d+)$/);
    if (range && +range[2] >= +range[1] && +range[2] - +range[1] <= 100) values = Array.from({length: +range[2] - +range[1] + 1}, (_, i) => +range[1] + i);
    else {
      const items = list[1].split(",").map(s => s.trim());
      if (!items.every(s => /^-?\d+(?:\.\d+)?$/.test(s))) return null;
      values = items.map(Number);
    }
    if (new Set(values).size <= proof.degree) return `This degree-${proof.degree} identity needs at least ${proof.degree + 1} distinct inputs. Repeated samples do not identify it.`;
  } else if (!/^(?:\\operatorname\{random\}|random)\(\d+\)$/.test(data.body)) return null;
  else if (Number(data.body.match(/\((\d+)\)/)![1]) <= proof.degree) return "The random sample has fewer than degree + 1 inputs; use enough distinct deterministic inputs instead.";
  if (readoutRow && rows[readoutRow - 1]) {
    const value = polynomialReadoutValue(rows[readoutRow - 1].latex, name => proof.parameters.includes(name) ? "variable" : null, proof.space);
    if (value && !same(value, proof.value)) return "The fitted-parameter readout does not equal the original requested expression.";
  }
  if (/^-?\d+(?:\.\d+)?$/.test(answer.trim()) && !same(parseDecimal(answer.trim()), proof.value)) return "The stated answer contradicts the original polynomial identity.";
  return null;
}

/** A factor statement does not supply the other factor. A numeric affine
 * cofactor introduced into a fit requires choosing a product representation
 * and deriving its coefficients; fitting a free cofactor avoids that work. */
export function factorConstructionBurden(question: string, rows: readonly { latex: string }[]): number {
  const source = normalize(question).replace(/\s+/g, "");
  if (!/\bis a factor of\b/i.test(question)) return 0;
  const data = rows.flatMap(row => {
    const match = normalize(row.latex).match(/^([a-z])_(?:\{(\w+)\}|(\w))\s*=/);
    return match ? [{name: `${match[1]}_{${match[2] ?? match[3]}}`, variable: match[1]}] : [];
  });
  for (const row of rows) {
    if (!/~|\\sim\b/.test(row.latex)) continue;
    let fit = normalize(row.latex).replace(/([a-z])_(\w)/g, "$1_{$2}").replace(/\s+/g, "");
    for (const item of data) fit = fit.split(item.name).join(item.variable);
    for (const factor of fit.matchAll(/\(([+-]?\d+(?:\.\d+)?[a-z][+-]\d+(?:\.\d+)?)\)/g)) {
      if (!source.includes(factor[1])) return 2;
    }
  }
  return 0;
}
