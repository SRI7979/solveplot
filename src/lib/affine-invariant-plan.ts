import { formatRational } from "./linear-forms";
import { normalizeDesmosExpressions } from "./desmos-latex";
import { proveConstrainedPolynomial } from "./constrained-polynomial";
import type { Explanation } from "./solve-cache";
import type { Candidate } from "./strategy-selection";

const SYMBOL = /\\[A-Za-z]+|[A-Za-z](?:_\{[A-Za-z0-9]+\}|_[A-Za-z0-9])?/g;

/** Original constraints and target, backed by exact affine-space reduction. */
export function affineInvariantPlan(question: string): {
  candidate: Candidate; explanation: Explanation; structure: string;
  supportsChoices: true; preserveInvariantAlternatives: true; repairRetriedEntries: true;
} | null {
  const proof = proveConstrainedPolynomial(question);
  if (!proof) return null;
  const { names, equations, target, value, numeric } = proof;
  const fittedNames = ["p", "q", "r", "s"].slice(0, names.length);
  const rename = new Map(names.map((name, index) => [name, fittedNames[index]]));
  const row = (text: string) => text.replace(/[·×]|\\(?:cdot|times)(?![A-Za-z])/g, "*")
    .replace(/\\(?:left|right)(?![A-Za-z])/g, "").replace(SYMBOL, (token) => rename.get(token) ?? token).replace(/\s+/g, "");
  const side = (index: number) => equations.length === 1 ? row(equations[0][index]) : `[${equations.map(equation => row(equation[index])).join(",")}]`;
  const rows = normalizeDesmosExpressions([`${side(0)}\\sim${side(1)}`, row(target)].map((latex) => ({ latex, purpose: "" }))).map(({ latex }) => latex);
  const answer = formatRational(value);
  const renameNote = names.every((name, index) => name === fittedNames[index])
    ? "Keep the question's letters."
    : `Use ${names.map((name, index) => `${fittedNames[index]} for ${name}`).join(", ")}, so Desmos treats them as fitted numbers rather than graph coordinates.`;
  return {
    candidate: {
      techniqueId: "parameter-regression", strategy: null, rung: 4,
      rows: rows.map((latex) => ({ latex, slider: null, copiesRow: null })),
      answer,
      result: { type: "numeric", row: 2, relatedRows: [1], value: numeric, listIndex: null,
        answerFrom: "value", choiceLabel: null, detail: "The original target, fixed for every solution of the constraints" },
      answerState: null, parameters: [], conditionType: null, distinguishes: null, graphBounds: null,
      cost: { derivationSteps: 0, oneOffFacts: 0, newPrimitives: 0, setupConstructions: 0, manualIterations: 0 },
    },
    supportsChoices: true,
    repairRetriedEntries: true,
    // Keep independently checked original-graph workflows as alternatives.
    preserveInvariantAlternatives: true,
    structure: "The original constraints fix the requested expression. Fit those constraints and evaluate the original target directly.",
    explanation: {
      why: "The original conditions fix the value of the whole expression, even when they leave individual numbers free. Reducing the expression with those conditions cancels every free variable. That is why any exact fit gives the same answer; a zero regression error alone would not prove this. Let Desmos fit the conditions and evaluate the original expression without rearranging or substituting by hand.",
      handMath: null,
      readAnswer: `Read row 2: ${answer}. You do not need particular values of ${names.join(" and ")}; every solution of the original conditions gives this result.`,
      steps: [],
      purposes: [
        `${renameNote} ${equations.length === 1 ? "Replace the original equation's equals sign with ~" : "Put the original left sides in one list and the matching right sides in another, joined by ~"} and leave ${fittedNames.join(" and ")} undefined. Desmos fits values satisfying the original conditions; they need not be unique.`,
        "Enter the expression exactly as asked, using the same renamed letters. It has the same value for every allowed solution, so the result is independent of which solution the regression finds.",
      ],
    },
  };
}
