import { proveConstrainedPolynomial } from "./constrained-polynomial";
import { polynomialTerms } from "./polynomial-invariants";

/** Preserve the original two-variable level-set construction only when all
 * source conditions and the target are actually present. This is not a general
 * geometry verifier and never treats a claimed correct answer as a proof. */
export function isOriginalInvariantGraph(question: string, candidate: {
  rows: readonly { latex: string; slider?: unknown }[];
  answerState?: { param: string; value: number } | null;
  result: { type: string; row: number | null; relatedRows: number[] };
}): boolean {
  const proof = proveConstrainedPolynomial(question);
  const state = candidate.answerState;
  if (!proof || !state || proof.names.some(name => !["x", "y"].includes(name)) ||
      proof.names.includes(state.param) || candidate.rows.length !== proof.equations.length + 2 ||
      !["slider_condition", "graph_overlap"].includes(candidate.result.type) ||
      Math.abs(state.value - proof.numeric) > 1e-9 * Math.max(1, Math.abs(proof.numeric))) return false;
  const normal = (text: string) => text.replace(/²/g,"^2").replace(/³/g,"^3").replace(/[−–]/g,"-").replace(/\\(?:left|right)/g,"").replace(/\s+/g,"");
  const slider = candidate.rows.find(row => row.slider && normal(row.latex).split("=")[0] === state.param);
  if (!slider) return false;
  const graphs = candidate.rows.filter(row => row !== slider);
  const expected = [...proof.equations.map(sides => `(${sides[0]})-(${sides[1]})`), `(${proof.target})-${state.param}`];
  const role = (name: string) => proof.names.includes(name) || name === state.param ? "variable" as const : null;
  const terms = graphs.map(row => {
    const sides = normal(row.latex).split("=");
    return sides.length === 2 ? polynomialTerms(`(${sides[0]})-(${sides[1]})`,role) : null;
  });
  for (const text of expected) {
    const source = polynomialTerms(normal(text),role);
    if (!source) return false;
    const index = terms.findIndex(actual => actual && actual.size === source.size && [BigInt(1),BigInt(-1)].some(sign => [...source].every(([key,value]) => {
      const other = actual.get(key);
      return other && value.n * other.d === sign * other.n * value.d;
    })));
    if (index < 0) return false;
    terms.splice(index,1);
  }
  return true;
}
