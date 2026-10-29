import { affineForm, affineSolutionSpace, differenceForm, toNumber, type NameRole } from "./linear-forms";
import { isScalarPolynomial, polynomialReadoutValue } from "./polynomial-invariants";

const REQUEST = String.raw`(?:What\s+is\s+(?:the\s+)?value\s+of|Find(?:\s+the\s+value\s+of)?|Evaluate)`;
const DECLARED = new RegExp(String.raw`^Real\s+numbers\s+(.+?)\s+satisfy\s+(.+?)\.\s*${REQUEST}\s*:?\s+(.+?)\s*[?.]?$`, "i");
const TARGET_FIRST = new RegExp(String.raw`^${REQUEST}\s*:?\s+(.+?)\s+(?:when|if|given that)\s+(.+?)\s*[?.]?$`, "i");
const CONDITION_FIRST = new RegExp(String.raw`^(?:If|Given(?:\s+that)?)\s+(.+?)(?:,|\.)\s*${REQUEST}\s*:?\s+(.+?)\s*[?.]?$`, "i");
const SYMBOL = /\\[A-Za-z]+|[A-Za-z](?:_\{[A-Za-z0-9]+\}|_[A-Za-z0-9])?/g;

function normalize(text: string) {
  const powers: Record<string, string> = { "²": "^2", "³": "^3", "⁴": "^4", "⁵": "^5", "⁶": "^6" };
  return text.replace(/[²³⁴⁵⁶]/g, power => powers[power]).replace(/[−–]/g, "-").replace(/\$/g, "").replace(/\s+/g, " ").trim();
}

/** Complete, bounded language grammar, not extraction of a convenient equation
 * from arbitrary prose. Unsupported domains, extra givens and unknown symbols
 * must fail closed. Parsing is a retrieval hypothesis, never an invariance proof. */
export function constrainedPolynomial(question: string) {
  if (question.length > 4096) return null;
  const text = normalize(question);
  const declared = text.match(DECLARED);
  const targetFirst = text.match(TARGET_FIRST);
  const conditionFirst = text.match(CONDITION_FIRST);
  const conditionText = declared?.[2] ?? targetFirst?.[2] ?? conditionFirst?.[1];
  const requested = declared?.[3] ?? targetFirst?.[1] ?? conditionFirst?.[2];
  // A noun introducing the target is presentation, not an extra variable.
  // Only strip this anchored phrase; qualifiers and trailing conditions still
  // have to pass the complete polynomial/constraint grammar below.
  const target = requested?.replace(/^(?:the\s+)?expression\s*:?\s+/i, "");
  if (!conditionText || !target) return null;
  const equations = conditionText.split(/\s*(?:,?\s+and\s+|,|;)\s*/).map(equation => equation.split("=").map(side => side.trim()));
  if (!equations.length || equations.length > 3 || equations.some(sides => sides.length !== 2 || sides.some(side => !side))) return null;
  const inferred = [...new Set((equations.flat().join(" ").match(SYMBOL) ?? []).filter(token => !token.startsWith("\\")))];
  const names = declared ? declared[1].split(/\s*(?:,?\s+and\s+|,)\s*/) : inferred;
  if (names.length < 2 || names.length > 4 || new Set(names).size !== names.length || names.some(name => !/^[A-Za-z]$/.test(name))) return null;
  if (inferred.some(name => !names.includes(name)) || names.some(name => !inferred.includes(name))) return null;
  const role: NameRole = name => names.includes(name) ? "variable" : null;
  if (!isScalarPolynomial(target, role)) return null;
  const conditions = [];
  for (const sides of equations) {
    if (!sides.every(side => isScalarPolynomial(side, role))) return null;
    const left = affineForm(sides[0], role), right = affineForm(sides[1], role);
    if (!left || !right) return null;
    const condition = differenceForm(left, right);
    if (!condition.terms.size) return null;
    const coefficients = [...condition.terms.values()].map(coefficient => Math.abs(toNumber(coefficient)));
    if (coefficients.some(coefficient => coefficient < 1e-6 || coefficient > 1e6) || Math.abs(toNumber(condition.constant)) > 1e9) return null;
    conditions.push(condition);
  }
  // A one-variable graph is already simple and belongs to the existing path.
  if (conditions.length === 1 && conditions[0].terms.size < 2) return null;
  return { names, equations, target, role, conditions };
}

/** Reuse the exact rational reducer for all solutions, not a fitted sample. */
export function proveConstrainedPolynomial(question: string) {
  const parsed = constrainedPolynomial(question);
  if (!parsed) return null;
  const space = affineSolutionSpace(parsed.conditions, parsed.names);
  const value = polynomialReadoutValue(parsed.target, parsed.role, space);
  if (value === null) return null;
  const numeric = toNumber(value);
  if (!Number.isFinite(numeric) || Math.abs(numeric) > 1e12 || (numeric !== 0 && Math.abs(numeric) < 1e-12)) return null;
  return { ...parsed, space, value, numeric };
}

/** A measurable floor for algebra hidden in function construction. Only charge
 * a rewrite after exact equivalence under the complete source constraints is
 * established. Original rows and long-but-direct transcription are not taxed. */
export function constrainedRewriteBurden(question: string, rows: readonly { latex: string }[]): number {
  const proof = proveConstrainedPolynomial(question);
  if (!proof) return 0;
  const symbols = (text: string) => new Set((text.match(SYMBOL) ?? []).filter(token => proof.names.includes(token)));
  const originalNames = symbols(proof.target);
  let floor = 0;
  for (const row of rows) {
    const definition = normalize(row.latex).replace(/\\(?:left|right)/g, "").match(/^[A-Za-z]\(\s*([A-Za-z])\s*\)\s*=\s*(.+)$/);
    if (!definition || !proof.names.includes(definition[1])) continue;
    const body = definition[2];
    const remaining = symbols(body);
    const removed = [...originalNames].filter(name => !remaining.has(name));
    if (!removed.length || !remaining.size) continue;
    const rewritten = polynomialReadoutValue(body, proof.role, proof.space);
    if (!rewritten || rewritten.n * proof.value.d !== proof.value.n * rewritten.d) continue;
    // Repeated inserted affine groups are extra transcription work even if
    // every literal number came from the question (the old numeric guard).
    const groups = [...body.matchAll(/\([^()]+\)/g)].filter(([group]) => removed.some(name => {
      const zero = polynomialReadoutValue(`${group}-${name}`, proof.role, proof.space);
      return zero !== null && zero.n === BigInt(0);
    })).length;
    floor = Math.max(floor, Math.min(6, 1 + removed.length + Math.max(0, groups - 1)));
  }
  return floor;
}
