import { sliderDiscoveryRows } from "./desmos-preflight";
import { factorConstructionBurden, identityInsightBurden, identityPlanIssue } from "./polynomial-identity";
import { z } from "zod";
import { constrainedRewriteBurden } from "./constrained-polynomial";

import {
  AnswerConsistencyError,
  deriveConsistentSolution,
  isApproximationQuestion,
  isWholeNumberQuestion,
  numbersMatch,
  normalizeChoices,
  parseNumber,
  ProseLatexError,
  roundsTo,
  sanitizeProse,
  validateAnswerState,
} from "./answer-consistency";
import {
  findDerivedConstants,
  findDerivedDefinitions,
  findUntranscribedListValues,
  findProseRows,
  findUndefinedVariables,
  normalizeDesmosExpressions,
  unwrapCaption,
  unwrapSyntheticResultAlias,
} from "./desmos-latex";
import {
  assignBadges,
  compareMethods,
  deriveCost,
  describeShape,
  mathLevel,
  mathScore,
  methodApproach,
  methodFamily,
  rowSignature,
  totalCost,
  APPROACHES,
  BADGES,
  METHOD_FAMILIES,
  type Approach,
} from "./method-scoring";
import { hasUnnecessaryCoefficientLists } from "./regression-workflow";
import { scalarAffineXIntercept } from "./affine-intercept";
import { similarityReadoutConflict } from "./similarity-validation";
import { exactLinearTableIntercept, graphsExactLinearTableFit, plottedLinearTableInterceptRow, type LinearTableIntercept } from "./linear-table-intercept";
import { exactQuadraticProductTable, fitsExactQuadraticProductTable, type QuadraticProductTable } from "./quadratic-product-table";
import {
  answerChoiceSchema,
  answerStateSchema,
  CONDITION_TYPES,
  DISTINGUISH_METHODS,
  graphBoundsSchema,
  MAX_EXPRESSIONS,
  parameterSchema,
  sliderSchema,
  typedResultSchema,
  type AnswerChoice,
  type ConditionType,
  type Parameter,
} from "./solver-schema";
import {
  checkConditionCompleteness,
  findIntegerParameterViolations,
  findListShapeViolations,
  findRegressionDeterminacyViolations,
  findUnsupportedDesmosOperations,
} from "./solver-rules";
import { getTechnique, LIBRARY_STRATEGY_COUNT, TECHNIQUE_IDS, techniqueName, type TechniqueId } from "./technique-vocabulary";

/**
 * Every technique that validly solves the problem, up to six: the dropdown is
 * for picking a technique the student already knows, so it lists all real
 * options, not just the best two. More than six grows output tokens for
 * options no student scrolls to.
 */
export const MAX_CANDIDATES = 6;

const count = z.number().int().min(0).max(20);

/** Model-reported judgment. Row count is measured by the server, never reported. */
export const reportedCostSchema = z
  .object({
    derivationSteps: count,
    newPrimitives: count,
    oneOffFacts: count,
    setupConstructions: count,
    manualIterations: count,
  })
  .strict();

const candidateRowSchema = z
  .object({
    latex: z.string().min(1).max(1000),
    slider: sliderSchema.nullable().default(null),
    // The earlier row whose displayed fitted result this row copies (freezing
    // a regression before a chained fit); those constants are not derived.
    copiesRow: z.number().int().min(1).max(MAX_EXPRESSIONS).nullable().default(null),
  })
  .strict();

const strategyNumber = z.number().int().min(1).max(LIBRARY_STRATEGY_COUNT);

/**
 * The library search, written after the structure and before any candidate
 * (the schema's field order makes it come first): the numbered strategies
 * whose trigger fits, and why a matched strategy did not become a candidate.
 * Logged for development and evals only; it never selects.
 */
export const libraryReportSchema = z
  .object({
    matched: z.array(strategyNumber).max(12),
    skipped: z.array(z.object({ strategy: strategyNumber, reason: z.string().max(160) }).strict()).max(8),
  })
  .strict();
export type LibraryReport = z.infer<typeof libraryReportSchema>;

/** One terse candidate technique: rows, readout, and cost components. No prose. */
export const candidateSchema = z
  .object({
    techniqueId: z.enum(TECHNIQUE_IDS),
    // The numbered library strategy this candidate applies; null for a paper technique.
    strategy: strategyNumber.nullable().default(null),
    rung: z.number().int().min(0).max(4),
    rows: z.array(candidateRowSchema).max(MAX_EXPRESSIONS),
    answer: z.string().max(500),
    result: typedResultSchema,
    answerState: answerStateSchema.default(null),
    parameters: z.array(parameterSchema).max(6).default([]),
    conditionType: z.enum(CONDITION_TYPES).nullable().default(null),
    distinguishes: z.enum(DISTINGUISH_METHODS).nullable().default(null),
    graphBounds: graphBoundsSchema.nullable(),
    cost: reportedCostSchema,
  })
  .strict();

/** Call 1: transcription, recognized structure, and 1–6 named techniques. */
export const candidatesResponseSchema = z.object({
  status: z.enum(["solved", "needs_clarification"]),
  question: z.string().max(8000),
  choices: z.array(answerChoiceSchema).max(8).nullable().default(null),
  clarification: z.string().max(1000).nullable(),
  structure: z.string().max(240).default(""),
  library: libraryReportSchema.default({ matched: [], skipped: [] }),
  candidates: z.array(candidateSchema).max(MAX_CANDIDATES),
  // Logged when it disagrees with the server's argmin; never used to select.
  preferredTechniqueId: z.enum(TECHNIQUE_IDS).nullable(),
});

export type Candidate = z.infer<typeof candidateSchema>;
export type CandidatesResponse = z.infer<typeof candidatesResponseSchema>;
export type CandidatesResponseInput = z.input<typeof candidatesResponseSchema>;

const costSchema = reportedCostSchema.extend({ rows: z.number().int().min(0) });

/** A scored candidate as cached and returned. */
export const methodSchema = z.object({
  id: z.string().min(1),
  techniqueId: z.enum(TECHNIQUE_IDS),
  name: z.string().min(1),
  rung: z.number().int().min(0).max(4),
  rows: z.array(z.object({ latex: z.string(), slider: sliderSchema.nullable() })),
  answer: z.string(),
  result: typedResultSchema,
  answerState: answerStateSchema,
  parameters: z.array(parameterSchema),
  conditionType: z.enum(CONDITION_TYPES).nullable(),
  distinguishes: z.enum(DISTINGUISH_METHODS).nullable(),
  graphBounds: graphBoundsSchema.nullable(),
  cost: costSchema,
  total: z.number(),
  mathScore: z.number(),
  mathLevel: z.enum(["low", "medium", "high"]),
  shape: z.string(),
  // Optional: entries cached before families existed still load.
  family: z.enum(METHOD_FAMILIES).optional(),
  // Desmos way or math way; optional for entries cached before it existed.
  approach: z.enum(APPROACHES).optional(),
  badges: z.array(z.enum(BADGES)),
  rejected: z.object({ rule: z.string(), reason: z.string() }).nullable(),
  repairs: z.array(z.string()),
});
export type Method = z.infer<typeof methodSchema>;

export type MethodSelection = {
  question: string;
  choices: AnswerChoice[] | null;
  structure: string | null;
  /** Eligible methods in rank order (winner first), then rejected ones. */
  methods: Method[];
  winnerId: string;
  modelPreference: TechniqueId | null;
};

export class StrategySelectionError extends Error {
  constructor(message: string, readonly stage = "strategy_selection") {
    super(message);
    this.name = "StrategySelectionError";
  }
}

type Rejection = { rule: string; reason: string; stage: string };

/**
 * "Which equation represents this situation?" asks for the model, not its
 * solution. Matching an equation to a supplied graph or table is different:
 * graphing can legitimately distinguish those choices.
 */
export function isRepresentationQuestion(question: string): boolean {
  const text = question.replace(/\s+/g, " ");
  return (
    /\bwhich\b[^?]{0,120}?\b(?:equations?|expressions?|inequalit(?:y|ies)|systems?|functions?|models?)\b[^?]{0,120}?\b(?:represents?|models?|could be used|can be used|describes?)\b/i.test(text) &&
    !/\b(?:graph|table|scatter ?plot|figure|shown|equivalent)\b/i.test(text) &&
    // "Which expression represents a solution to <equation>" asks for a solution, not a model.
    !/\brepresents?\s+(?:(?:one|a|the|all|each)\s+)?(?:possible\s+)?(?:solutions?|roots?|zeros?|values?\s+of)\b/i.test(text)
  );
}

/** Interpret a supplied model, rather than solve for an unknown value. */
export function isInterpretationQuestion(question: string): boolean {
  return /\bwhat does [^?]{1,100}\b(?:represent|mean)\b|\b(?:best|correct) interpretation of\b|\b(?:meaning|interpretation) of (?:the )?(?:constant|coefficient|slope|y-intercept|x-intercept|parameter)\b/i.test(question.replace(/\s+/g, " "));
}

/**
 * A question asking for a value that makes a system have no solution. Rule 3
 * must apply to every candidate for such a question, including one whose
 * model output left conditionType null: a paper "equate the slopes" method is
 * exactly the half-condition it catches, and cost selection would otherwise
 * make it the default. Infinitely-many questions are left to the model's own
 * conditionType: there the requested value (b/d, g/k) usually comes from the
 * constants' ratio itself, so a ratio computation is already complete.
 */
export function questionCondition(question: string): ConditionType | null {
  const text = question.replace(/\s+/g, " ");
  if (!/\bvalues?\b|\bconstant\b|\bwhat is [a-z]\b/i.test(text)) return null;
  if (/\binfinitely many solutions\b|\binfinite (?:number of )?solutions\b/i.test(text)) return null;
  if (/\bno solutions?\b|\bno real solutions?\b/i.test(text)) return "no-solution";
  return null;
}

type ExactParallelSystem = { parameter: string; value: number; distinct: boolean; equations: [string, string] };

/**
 * Only the literal two-line form A x ± k y = C, B x ± D y = E. The determinant
 * gives the one coefficient value that makes the lines parallel; unequal
 * constants under the same scale ensure they are distinct, not coincident.
 * Other systems are left to the usual validator rather than guessed at.
 */
function exactNoSolutionParallelSystem(question: string): ExactParallelSystem | null {
  if (questionCondition(question) !== "no-solution") return null;
  const [first, second] = question.replace(/−/g, "-").split(/\r?\n/).map((line) => line.replace(/\s+/g, ""));
  const left = first?.match(/^([+-]?\d+(?:\.\d+)?)x([+-])([a-z])y=([+-]?\d+(?:\.\d+)?)$/i);
  const right = second?.match(/^([+-]?\d+(?:\.\d+)?)x([+-])(\d+(?:\.\d+)?)y=([+-]?\d+(?:\.\d+)?)$/i);
  if (!left || !right) return null;
  const [a, c, b, d, e] = [left[1], left[4], right[1], right[3], right[4]].map(Number);
  const leftSign = left[2] === "+" ? 1 : -1;
  const rightSign = right[2] === "+" ? 1 : -1;
  if (![a, b, c, d, e].every(Number.isFinite) || a === 0 || b === 0) return null;
  const value = (a * rightSign * d) / (b * leftSign);
  if (!Number.isFinite(value)) return null;
  return { parameter: left[3], value, distinct: !numbersMatch(c * b, e * a), equations: [first, second] };
}

/** Correct a literal, graphed slider plan from the printed coefficients. */
function repairExactParallelSlider(candidate: Candidate, exact: ExactParallelSystem | null): { candidate: Candidate; repair: string | null } {
  if (!exact?.distinct || !["slider-condition", "slider-parallel"].includes(candidate.techniqueId) ||
      !candidate.answerState || candidate.answerState.param !== exact.parameter ||
      candidate.result.type !== "slider_condition" || candidate.result.value !== null ||
      candidate.rows.length !== 3) return { candidate, repair: null };
  const sliderRow = candidate.rows.find((row) => row.slider !== null &&
    row.latex.replace(/\s+/g, "").match(/^([A-Za-z])=/)?.[1] === exact.parameter);
  if (!sliderRow?.slider) return { candidate, repair: null };
  const graphs = candidate.rows.filter((row) => row !== sliderRow).map((row) => row.latex.replace(/\s+/g, ""));
  if (graphs[0] !== exact.equations[0] || graphs[1] !== exact.equations[1]) return { candidate, repair: null };
  const { min, max, step } = sliderRow.slider;
  const stops = (exact.value - min) / step;
  if (exact.value < min || exact.value > max || Math.abs(stops - Math.round(stops)) > 1e-6) {
    return { candidate, repair: null };
  }
  const answer = String(exact.value);
  const detail = `At ${exact.parameter} = ${answer}, the graphed lines are parallel and distinct.`;
  if (numbersMatch(candidate.answerState.value, exact.value) &&
      numbersMatch(parseNumber(candidate.answer) ?? Number.NaN, exact.value) &&
      candidate.result.detail === detail) return { candidate, repair: null };
  return {
    candidate: {
      ...candidate,
      answer,
      answerState: { ...candidate.answerState, value: exact.value },
      result: { ...candidate.result, detail },
    },
    repair: `Verified ${exact.parameter} = ${answer} from the printed line coefficients, corrected the slider or answer if needed, and checked that the parallel lines have different constants.`,
  };
}

/**
 * The question fixes how many solutions an equation or system has (none,
 * infinitely many, exactly one) and asks for the value that does it. A paper
 * method can only decide that through a solution-count rule (proportional
 * coefficients, |u| = c has one solution only at c = 0, a zero discriminant),
 * a memorized fact the graphs show instead.
 */
export function isSolutionCountCondition(question: string): boolean {
  const text = question.replace(/\s+/g, " ");
  if (!/\bvalues?\b|\bconstants?\b|\bwhat is [a-z]\b/i.test(text)) return false;
  return /\b(?:no|infinitely many|exactly one|exactly two|only one)\s+(?:real\s+)?solutions?\b|\binfinite (?:number of )?solutions\b|\bintersect\w*\s+(?:at\s+)?exactly (?:one|two) points?\b/i.test(text);
}

/**
 * A tangent-line problem can be solved exactly by clicking the vertex of the
 * parabola minus the line's x-term. A rounded slider cannot land on a
 * fractional k, so replace that particular model slip only when the printed
 * equations and the claimed answer independently agree with the vertex.
 */
function repairExactTangentVertex(candidate: Candidate, question: string): { candidate: Candidate; repair: string | null } {
  if (candidate.techniqueId !== "vertex-of-difference" || candidate.rows.length !== 2 ||
      candidate.result.type !== "vertex" || candidate.result.row !== 2 ||
      candidate.result.answerFrom !== "reasoning" || !candidate.answerState ||
      candidate.answerState.value === null || !/exactly\s+one\s+point/i.test(question)) {
    return { candidate, repair: null };
  }
  const compact = question.replace(/\s+/g, "");
  const givens = compact.match(/liney=([+-]?\d+(?:\.\d+)?)x-([a-z]).*parabolay=([+-]?\d+(?:\.\d+)?)x(?:\^2|\^\{2\})([+-]\d+(?:\.\d+)?)x([+-]\d+(?:\.\d+)?)/i);
  if (!givens) return { candidate, repair: null };
  const [, slopeText, parameter, aText, bText, cText] = givens;
  if (candidate.answerState.param.toLowerCase() !== parameter.toLowerCase() ||
      candidate.rows[0].latex.replace(/\s+/g, "") !== `${parameter}=0` || !candidate.rows[0].slider ||
      candidate.rows[1].slider) return { candidate, repair: null };
  const slider = candidate.rows[0].slider;
  const stops = (candidate.answerState.value - slider.min) / slider.step;
  if (Math.abs(stops - Math.round(stops)) <= 1e-6) return { candidate, repair: null };
  const actualRow = candidate.rows[1].latex.replace(/\s+/g, "").replace(/\^\{2\}/g, "^2");
  const expectedRow = `y=(${aText}x^2${bText}x${cText})-${slopeText}x+${parameter}`;
  if (actualRow !== expectedRow) return { candidate, repair: null };
  const [m, a, b, c] = [slopeText, aText, bText, cText].map(Number);
  if (a === 0 || ![m, a, b, c].every(Number.isFinite)) return { candidate, repair: null };
  const exactK = (b - m) ** 2 / (4 * a) - c;
  const statedK = parseNumber(candidate.answer);
  if (statedK === null || !numbersMatch(statedK, exactK) || !numbersMatch(candidate.answerState.value, exactK)) {
    return { candidate, repair: null };
  }
  return {
    candidate: {
      ...candidate,
      rows: [{ latex: `y=(${aText}x^2${bText}x${cText})-${slopeText}x`, slider: null, copiesRow: null }],
      result: {
        ...candidate.result,
        row: 1,
        relatedRows: [],
        detail: "Click the vertex. Its y-coordinate is the opposite of the k that makes the line tangent.",
      },
      answerState: null,
      cost: { ...candidate.cost, derivationSteps: Math.max(1, candidate.cost.derivationSteps), manualIterations: 0 },
    },
    repair: "Replaced an unreachable fractional slider stop with the exact vertex readout of the printed parabola minus the line's x-term.",
  };
}

/**
 * A list capped at an arbitrary round number can still be sound, but the cap
 * trips the hidden-derivation guard. For a literal increasing cost model,
 * the printed budget itself is a safe cap when its cost already exceeds that
 * budget. Reuse that printed number instead of trusting the arbitrary cap.
 */
function repairBudgetListCap(rows: Array<{ latex: string; slider?: unknown }>, question: string): string | null {
  const range = rows[0]?.latex.replace(/\s+/g, "").match(/^([A-Za-z])=\[0\.\.\.(\d+)\]$/);
  if (!range) return null;
  const [, miles, originalCap] = range;
  const cost = rows[1]?.latex.replace(/\s+/g, "").match(/^([A-Za-z])=(\d+(?:\.\d+)?)\+(\d+(?:\.\d+)?)([A-Za-z])$/);
  if (!cost || cost[4] !== miles) return null;
  const [, costName, feeText, rateText] = cost;
  const filter = rows[2]?.latex.replace(/\s+/g, "");
  const match = filter?.match(/^(.+?)=([A-Za-z])\[([A-Za-z])\\le(\d+)\]$/);
  if (!match || match[2] !== miles || match[3] !== costName || rows.length < 4 ||
      rows[3].latex.replace(/\s+/g, "") !== `\\operatorname{max}(${match[1]})`) return null;
  const budgetText = match[4];
  const [fee, rate, budget] = [feeText, rateText, budgetText].map(Number);
  if (!Number.isInteger(budget) || budget <= 0 || fee < 0 || rate <= 0 || fee + rate * budget <= budget) return null;
  const literalInQuestion = (value: string) => new RegExp(`(?<![\\d.])${value.replace(/\./g, "\\.")}(?!\\d|\\.\\d)`).test(question);
  if (![feeText, rateText, budgetText].every(literalInQuestion)) return null;
  if (originalCap === budgetText) return null;
  rows[0] = { ...rows[0], latex: `${miles}=[0...${budgetText}]` };
  return `Used the printed budget ${budgetText} as the integer-list cap; the increasing cost is already above budget there.`;
}

const literal = String.raw`-?\d+(?:\.\d+)?`;
const literalDifference = String.raw`${literal}\s*-\s*(?:\(\s*${literal}\s*\)|${literal})`;
/** (1-11)/(1-(-4)) or \frac{8-2}{5-1}: the two-point slope formula typed over given numbers. */
const SLOPE_QUOTIENT = new RegExp(
  String.raw`\(\s*${literalDifference}\s*\)\s*/\s*\(\s*${literalDifference}\s*\)|\\frac\{\s*${literalDifference}\s*\}\{\s*${literalDifference}\s*\}`,
);

/**
 * 16^{2}-4(3)(2), (-16)^{2}-4\cdot3\cdot2, or b^{2}-4ac: the quadratic
 * formula's discriminant typed into a row (whitespace removed). Desmos does
 * the arithmetic; the student still recalled the formula, where clicking the
 * graph's root would not need it. The squared base must be a literal number,
 * so x^{2}-4x and (x-2)^{2}-4(x+1) never match.
 */
const TYPED_DISCRIMINANT = /(?:\(-?\d+(?:\.\d+)?\)|(?<![\w.)])\d+(?:\.\d+)?)\^\{?2\}?-4(?:\(|\*?\d|\\cdot)|\bb\^\{?2\}?-4ac\b/;

/**
 * 18(540)/3^{2} or cost=391/1.15: a row computing a number from the
 * question's numbers alone. Lists, points, equations, and rows with a
 * variable or a built-in such as distance() are not this.
 */
export function isLiteralArithmetic(latex: string): boolean {
  let expression = latex.replace(/\\left|\\right|\\[bB]igg?[lr]?/g, "").trim();
  const definition = expression.match(/^(?:[A-Za-z](?:_\{[^{}]*\}|_[A-Za-z0-9])?|[A-Za-z]{2,})\s*=(?!=)([\s\S]*)$/);
  if (definition) expression = definition[1];
  if (/[[\],=<>~]|\\(?:sim|le|ge|ne)(?![A-Za-z])/.test(expression.replace(/\|/g, ""))) return false;
  const bare = expression
    .replace(/\\(?:frac|sqrt|cdot|times|pi)(?![A-Za-z])/g, " ")
    .replace(/\\operatorname\{(?:round|floor|ceil|abs)\}/g, " ");
  if (/[A-Za-z\\]/.test(bare)) return false;
  return (bare.match(/\d+(?:\.\d+)?/g) ?? []).length >= 2;
}

/** Only waive recovery for an explicitly requested calculation, not a formula
 * derived from a word problem whose setup cost the model may under-report. */
function isPrintedCalculation(question: string, latex: string): boolean {
  const requested = question.trim().replace(/^Problem:\s*/i, "")
    .match(/^(?:what is(?: the value of)?|evaluate|calculate|compute)\s+(.+?)[?.]?$/i)?.[1];
  if (!requested || !isLiteralArithmetic(requested)) return false;
  const normalize = (value: string) => value.replace(/\\left|\\right|\$|\s/g, "")
    .replace(/\\(?:cdot|times)|×/g, "*");
  return normalize(requested) === normalize(latex);
}

const LITERAL_LIST = /^\s*[A-Za-z](?:_\{[^{}]*\}|_[A-Za-z0-9])?\s*=\s*(?:\\left)?\[[^[\]A-Za-z]*\](?:\\right)?\s*$/;
const LIST_LOOKUP = /^\s*[A-Za-z](?:_\{[^{}]*\}|_[A-Za-z0-9])?\s*(?:\\left)?\[[^[\]]*\](?:\\right)?\s*$/;

/** A choice list minus one scalar calculation still makes the student set up that scalar calculation. */
function wrapsScalarArithmeticInChoiceList(rows: readonly { latex: string }[]): boolean {
  if (rows.length !== 2) return false;
  const list = rows.find((row) => LITERAL_LIST.test(row.latex));
  if (!list) return false;
  const name = list.latex.match(/^\s*([A-Za-z](?:_\{[^{}]*\}|_[A-Za-z0-9])?)/)?.[1];
  if (!name) return false;
  const comparison = rows.find((row) => row !== list)?.latex.replace(/\s+/g, "") ?? "";
  const arithmetic = comparison.startsWith(`${name}-`)
    ? comparison.slice(name.length + 1)
    : comparison.endsWith(`-${name}`)
      ? comparison.slice(0, -name.length - 1)
      : null;
  return arithmetic !== null && isLiteralArithmetic(arithmetic);
}

/**
 * Desmos way or math way. Paper and calculator-only techniques are the math
 * way; so is any plan whose rows only do arithmetic on the question's numbers,
 * list literals, or look a computed value up in that list (a choice list
 * wrapped around 18(540)/3^2): Desmos is a calculator there, whatever the
 * technique is called.
 */
export function planApproach(techniqueId: TechniqueId, rows: readonly { latex: string }[]): Approach {
  if (rows.length === 0 || methodApproach({ techniqueId }) === "math") return "math";
  if (techniqueId === "answer-choice-list" && wrapsScalarArithmeticInChoiceList(rows)) return "math";
  const arithmeticOnly = rows.length > 0 && rows.some((row) => isLiteralArithmetic(row.latex)) &&
    rows.every((row) => isLiteralArithmetic(row.latex) || LITERAL_LIST.test(row.latex) || LIST_LOOKUP.test(row.latex));
  return arithmeticOnly ? "math" : "desmos";
}

/** A row that defines a function, f(x)=... or g_{1}(t)=... */
const FUNCTION_DEFINITION = /^\s*[A-Za-z](?:_\{[^{}]*\}|_[A-Za-z0-9])?\s*\([^()]*\)\s*=(?!=)/;

/** One data list fit with no squared or higher term: y_{1}\sim mx_{1}+b (never a bracket system). */
const isLinearFit = (latex: string) => /^\s*[A-Za-z](?:_\{[^{}]*\}|_[A-Za-z0-9])?\s*(?:\\sim(?![A-Za-z])|~)/.test(latex) && !latex.includes("^");

/**
 * Technique names the rows contradict, corrected before validation so the
 * student learns the pattern by its right name: scalar rows with no function
 * are calculator arithmetic (not function evaluation, and not paper
 * arithmetic); a linear fit is a linear regression however many points it
 * uses, including one whose fitted line is graphed and read; and a paper "direct
 * arithmetic" answer to a representation question is the translation itself.
 * A relabel may duplicate another candidate's technique; selection keeps the
 * better of the two.
 */
function relabel(candidate: Candidate, representation: boolean, interpretation = false): { candidate: Candidate; repair: string | null } {
  const rows = candidate.rows;
  let techniqueId: TechniqueId | null = null;
  if (candidate.techniqueId === "translate-the-words" && !representation && !interpretation) {
    techniqueId = rows.length ? "calculator-arithmetic" : "direct-arithmetic";
  } else if (candidate.techniqueId === "function-evaluation" && rows.length > 0 && !rows.some((row) => FUNCTION_DEFINITION.test(row.latex))) {
    techniqueId = "calculator-arithmetic";
  } else if (candidate.techniqueId === "direct-arithmetic" && rows.length > 0) {
    techniqueId = "calculator-arithmetic";
  } else if (candidate.techniqueId === "direct-arithmetic" && representation) {
    techniqueId = "translate-the-words";
  } else if (["three-point-regression", "intercept-read", "graph-both-sides", "graph-raw"].includes(candidate.techniqueId)) {
    const fits = rows.filter((row) => /\\sim(?![A-Za-z])|~/.test(row.latex));
    if (fits.length > 0 && fits.every((row) => isLinearFit(row.latex))) techniqueId = "linear-regression";
  }
  if (!techniqueId) return { candidate, repair: null };
  return {
    candidate: { ...candidate, techniqueId },
    repair: `Relabeled ${techniqueName(candidate.techniqueId)} as ${techniqueName(techniqueId)}: that is what its rows do.`,
  };
}

/** The condition is given; a ratio of coefficients follows from the common scale factor. */
function isGivenInfiniteSolutionRatioQuestion(question: string): boolean {
  const text = question.replace(/\s+/g, " ");
  return /\binfinitely many solutions\b|\binfinite (?:number of )?solutions\b/i.test(text) &&
    /\bwhat is (?:the value of )?[a-z]\s*\/\s*[a-z]\s*\?/i.test(text);
}

/** A short literal list used only as numbered storage adds work to scalar arithmetic. */
function hasDisposableScalarList(rows: ReadonlyArray<{ latex: string }>): boolean {
  for (const [index, { latex }] of rows.entries()) {
    const declaration = latex.match(/^\s*([A-Za-z](?:_\{[A-Za-z0-9]+\}|_[A-Za-z0-9])?)\s*=\s*\[\s*-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?){1,3}\s*\]\s*$/);
    if (!declaration) continue;
    const name = declaration[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const indexed = new RegExp(`(?<![A-Za-z\\\\])${name}\\s*\\[\\s*\\d+\\s*\\]`, "g");
    const bare = new RegExp(`(?<![A-Za-z\\\\])${name}(?![A-Za-z0-9_{])`);
    let references = 0;
    let onlyIndexed = true;
    rows.forEach((row, rowIndex) => {
      if (rowIndex === index) return;
      const withoutIndices = row.latex.replace(indexed, () => {
        references += 1;
        return "";
      });
      if (bare.test(withoutIndices)) onlyIndexed = false;
    });
    if (references > 0 && onlyIndexed) return true;
  }
  return false;
}

/**
 * One constraint on x and y usually leaves infinitely many possible pairs.
 * Evaluating the target at one convenient pair is only enough if the plan
 * first shows the target does not change as the pair moves along that line.
 */
function hasUnprovenSingleSample(question: string, rows: ReadonlyArray<{ latex: string }>, resultRow: number | null): boolean {
  const premise = question.match(/\b(?:if|given(?: that)?)\s+([^,?]{1,100}),\s*what is (?:the )?value of\b/i)?.[1];
  if (!premise || !premise.includes("x") || !premise.includes("y") || !premise.includes("=")) return false;
  const target = question.split(/\bwhat is (?:the )?value of\b/i)[1] ?? "";
  if (!target.includes("x") || !target.includes("y") || resultRow === null) return false;
  const evaluated = rows[resultRow - 1]?.latex.replace(/\s+/g, "").match(/^([A-Za-z](?:_\{[^{}]+\})?)\((-?\d+(?:\.\d+)?)\)$/);
  if (!evaluated) return false;
  const [, name, input] = evaluated;
  const definition = rows.some(({ latex }) => latex.replace(/\s+/g, "").startsWith(`${name}(x)=`));
  if (!definition) return false;
  const difference = `${name}(x)-${name}(${input})`;
  return !rows.some(({ latex }) => latex.replace(/\s+/g, "").includes(difference));
}

/**
 * Parameters the question itself restricts to integers ("where a is an
 * integer greater than 1", "b is a positive integer constant", "positive
 * integers n"). Rule 1 must apply even when a candidate did not declare them.
 */
export function questionIntegerParameters(question: string): Parameter[] {
  const names = new Set<string>();
  const kinds = String.raw`(?:positive |negative |nonnegative |nonzero )?(?:integers?|whole numbers?|counting numbers?)`;
  for (const match of question.matchAll(new RegExp(String.raw`\b([a-z])\s+(?:is|are)\s+(?:an?\s+)?${kinds}`, "gi"))) names.add(match[1]);
  // "positive integer j and k", "positive integers k, a, b, c, and d"
  for (const match of question.matchAll(new RegExp(String.raw`\b${kinds}\s+([a-z]\b(?:\s*,\s*[a-z]\b)*(?:\s*,?\s*and\s+[a-z]\b)?)`, "gi"))) {
    for (const name of match[1].match(/\b[a-z]\b/gi) ?? []) if (name.toLowerCase() !== "and") names.add(name);
  }
  // "a, b, c, and d are all integer constants" applies to every named
  // coefficient, not just the final d. Continuous regression cannot enforce it.
  const group = /((?:\b[a-z]\b\s*,\s*)+\b[a-z]\b)\s+are\s+(?:all\s+)?(?:positive\s+|negative\s+|nonnegative\s+|nonzero\s+)?(?:integers?\b|whole numbers?\b|counting numbers?\b)/gi;
  const groupedText = question.replace(/,?\s+and\s+(?=[a-z]\b\s+are\b)/gi, ", ");
  for (const match of groupedText.matchAll(group)) {
    for (const name of match[1].match(/\b[a-z]\b/gi) ?? []) names.add(name.toLowerCase());
  }
  // x and y are graph coordinates, never parameters a row introduces.
  return [...names].filter((name) => !/^[xyt]$/i.test(name)).map((name) => ({ name, integer: true, min: -1000, max: 1000 }));
}

const NUMBER = String.raw`(-?\d+(?:\.\d+)?)`;
/** g(1)=5 */
// A value ends at the end of the text, punctuation, or a space: not inside 4.5, 3f(1), or 3(x+1). A full stop ends a sentence.
const VALUE_END = String.raw`(?=$|[^\d.A-Za-z(]|\.(?!\d))`;
const FUNCTION_VALUE = new RegExp(String.raw`\b([a-z])\s*\(\s*${NUMBER}\s*\)\s*=\s*${NUMBER}${VALUE_END}`, "gi");
/** x: 1 → g(x)=5, x = 1, g(x) = 5 */
const TABLE_ROW_VALUE = new RegExp(String.raw`\bx\s*[:=]\s*${NUMBER}\s*(?:→|->|,|;|\|)\s*([a-z])\s*\(\s*x\s*\)\s*=\s*${NUMBER}${VALUE_END}`, "gi");

export type TranscriptionConflict = { name: string; input: number; values: number[] };

/**
 * The same function value transcribed twice with different numbers: the model
 * read the table, then added values it computed itself under the table's name
 * ("x: 1 → g(x)=5" and "Table values: g(1)=15", which is f(1)). Any repair or
 * regression that trusts one of them may be fitting computed numbers.
 */
export function findTranscriptionConflicts(question: string): TranscriptionConflict[] {
  const seen = new Map<string, { name: string; input: number; values: Set<number> }>();
  const record = (name: string, input: number, value: number) => {
    const key = `${name.toLowerCase()}(${input})`;
    const entry = seen.get(key) ?? { name: name.toLowerCase(), input, values: new Set<number>() };
    entry.values.add(value);
    seen.set(key, entry);
  };
  for (const match of question.matchAll(FUNCTION_VALUE)) record(match[1], Number(match[2]), Number(match[3]));
  for (const match of question.matchAll(TABLE_ROW_VALUE)) record(match[2], Number(match[1]), Number(match[3]));
  return [...seen.values()].filter((entry) => entry.values.size > 1).map(({ name, input, values }) => ({ name, input, values: [...values].sort((a, b) => a - b) }));
}

/** Techniques whose slider the student drags: a step-1 slider keeps every stop an integer. */
const DRAGGED_SLIDER_TECHNIQUES: ReadonlySet<TechniqueId> = new Set(["slider-condition", "slider-parallel", "shared-zero"]);

/**
 * "What is the value of a + b?" asks for one determined value. "Which could be",
 * "possible values", greatest/least, "how many", and NOT/EXCEPT do not: there a
 * continuous fit can land on any one of several answers.
 */
export function asksForDeterminedValue(question: string): boolean {
  return (
    !/\b(?:could|possible|greatest|least|maximum|minimum|largest|smallest|how many)\b/i.test(question) &&
    !/\b(?:NOT|EXCEPT)\b/.test(question) &&
    !isIntegerFactorExtremumQuestion(question)
  );
}

/** A single fitted factorization cannot establish an extremum over integer factorizations. */
export function isIntegerFactorExtremumQuestion(question: string): boolean {
  // A factorization may be named ("factor") or just written: k(ax^2+b)(cx^2+d).
  const factorization = /\bfactor(?:s|ed|ization)?\b/i.test(question) ||
    /\([^()]*[a-z][^()]*[+-][^()]*\)\s*\([^()]*[a-z][^()]*[+-][^()]*\)/i.test(question.replace(/\s+/g, ""));
  return /\b(?:maximum|minimum|greatest|least)\b/i.test(question) &&
    factorization &&
    /\bintegers?\b/i.test(question);
}

/**
 * A symbolic choice that must be an integer for every allowed assignment needs
 * a general argument. Fitting one set of integer coefficients can illustrate
 * the claim, but the fitted values are only one possible assignment.
 */
export function isUniversalSymbolicIntegerQuestion(question: string, choices: readonly AnswerChoice[] | null, integers: readonly Parameter[]): boolean {
  if (!choices?.length || !integers.length) return false;
  if (!/\b(?:must|always|necessarily)\b[^?.]{0,60}\b(?:integer|whole number)\b/i.test(question)) return false;
  return integers.some(({ name }) => {
    const symbol = new RegExp(`(?<![A-Za-z])${name}(?![A-Za-z])`, "i");
    return choices.some(({ text }) => symbol.test(text));
  });
}

type Interval = { low: number; high: number };

/** A stated continuous domain such as 2 <= x <= 8 (not one restricted to integers). */
export function continuousInterval(question: string): Interval | null {
  if (/\b(?:integers?|whole numbers?|counting numbers?)\b/i.test(question)) return null;
  const text = question.replace(/≤/g, "<=").replace(/[−–]/g, "-");
  const match = text.match(/(-?\d+(?:\.\d+)?)\s*<=?\s*[a-z]\s*<=?\s*(-?\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const [low, high] = [Number(match[1]), Number(match[2])];
  return low < high ? { low, high } : null;
}

/** An integer list that walks the interval one unit at a time, e.g. [2...8] for 2 <= x <= 8. */
export function samplesInterval(rows: readonly { latex: string }[], interval: Interval): boolean {
  const start = Math.ceil(interval.low);
  const end = Math.floor(interval.high);
  if (end - start < 2) return false;
  for (const { latex } of rows) {
    for (const [, body] of latex.replace(/\\left|\\right/g, "").matchAll(/\[([^\[\]]*)\]/g)) {
      const range = body.match(/^\s*(-?\d+)\s*\.\.\.\s*(-?\d+)\s*$/);
      if (range && Number(range[1]) <= start && Number(range[2]) >= end) return true;
      const values = body.split(",").map((part) => Number(part.trim()));
      const consecutive =
        values.length >= 3 &&
        values.every((value, index) => Number.isInteger(value) && (index === 0 || value === values[index - 1] + 1));
      if (consecutive && values[0] <= start && values[values.length - 1] >= end) return true;
    }
  }
  return false;
}

type CandidateContext = {
  question: string;
  choices: AnswerChoice[] | null;
  representation: boolean;
  interval: Interval | null;
  condition: ConditionType | null;
  integers: Parameter[];
  integerFactorExtremum: boolean;
  universalSymbolicInteger: boolean;
  solutionCount: boolean;
  approximate: boolean;
  wholeNumber: boolean;
  linearTableIntercept: LinearTableIntercept | null;
  quadraticProductTable: QuadraticProductTable | null;
  exactParallelSystem: ExactParallelSystem | null;
};

type Validated = Omit<Method, "id" | "badges" | "rejected" | "total" | "mathScore" | "mathLevel" | "shape" | "cost" | "name"> & {
  rawCost: Candidate["cost"];
  /** Memorized facts the plan itself shows it relies on, whatever the model reported. */
  factFloor: number;
  /** Hand derivation the plan itself shows, whatever the model reported. */
  derivationFloor: number;
};

function reject(rule: string, reason: string, stage = "strategy_policy"): Rejection {
  return { rule, reason, stage };
}

/** Every hard rejection, applied before scoring. Never priced, never selectable. */
function validateCandidate(candidate: Candidate, context: CandidateContext): Validated | Rejection {
  const { question, choices } = context;
  const repairs: string[] = [];
  if (context.exactParallelSystem) {
    const exact = context.exactParallelSystem;
    if (!exact.distinct) {
      return reject("linear-system-condition-impossible",
        "At the only coefficient value that makes these printed lines parallel, their constants also scale together; the lines coincide, so no parameter value makes this system have no solution.",
        "answer_consistency");
    }
    const stated = parseNumber(candidate.answer);
    if (stated === null || !numbersMatch(stated, exact.value)) {
      return reject("linear-system-answer-mismatch",
        `The printed line coefficients give ${exact.parameter} = ${exact.value} for distinct parallel lines; this candidate states ${candidate.answer}.`,
        "answer_consistency");
    }
    if (candidate.answerState?.param === exact.parameter && !numbersMatch(candidate.answerState.value, exact.value)) {
      return reject("linear-system-answer-mismatch",
        `The ${exact.parameter} slider opens at ${candidate.answerState.value}, but the printed lines are distinct and parallel at ${exact.value}.`,
        "answer_consistency");
    }
    if (["slider-condition", "slider-parallel"].includes(candidate.techniqueId) &&
        candidate.answerState?.param === exact.parameter) {
      const graphs = candidate.rows.filter((row) => row.slider === null).map((row) => row.latex.replace(/\s+/g, ""));
      if (graphs.length !== 2 || graphs[0] !== exact.equations[0] || graphs[1] !== exact.equations[1]) {
        return reject("linear-system-plan-mismatch",
          "This slider plan must graph both printed equations exactly before its parallel-lines readout can be verified.",
          "answer_consistency");
      }
    }
  }
  // For a stated infinitely-many condition, b/d-style ratio questions ask
  // for the common scale factor itself. A direct computation need not prove
  // that a separate parameter makes two graphed lines coincide.
  const conditionType = (candidate.techniqueId === "direct-arithmetic" || candidate.techniqueId === "calculator-arithmetic") &&
    isGivenInfiniteSolutionRatioQuestion(question)
    ? null
    : candidate.conditionType ?? context.condition;
  const declared = new Set(candidate.parameters.map((parameter) => parameter.name));
  const parameters = [...candidate.parameters, ...context.integers.filter((parameter) => !declared.has(parameter.name))];
  const rows = normalizeDesmosExpressions(
    candidate.rows.map((row) => ({
      latex: row.latex,
      purpose: row.copiesRow ? `Copies the displayed fitted equation from line ${row.copiesRow}.` : "",
      slider: row.slider,
    })),
  );

  if (candidate.techniqueId === "integer-list-filter") {
    const budgetRepair = repairBudgetListCap(rows, question);
    if (budgetRepair) repairs.push(budgetRepair);
  }

  if (rows.some((row) => !row.latex.trim())) {
    return reject("row-fails-to-insert", "A calculator row normalizes to empty.", "desmos_syntax");
  }
  // Desmos plots polygon(), but its expression row has no numeric area
  // readout. When the answer actually comes from a separate area formula,
  // showing the polygon first only adds setup to that simpler calculation.
  if (candidate.techniqueId === "polygon-area" && candidate.result.type === "numeric" &&
      /\barea\b/i.test(context.question) &&
      rows.some((row) => /\\operatorname\{polygon\}\s*\(/.test(row.latex))) {
    return reject("polygon-has-no-area-readout", "polygon() draws the shape but does not display its area. Use the numeric area formula as the calculator method.", "desmos_result");
  }
  // A caption Desmos cannot define (\text{area}=, \tan S=) on a row nothing
  // else references: the row's computation is its right side.
  rows.forEach((row, index) => {
    const uncaptioned = unwrapCaption(row.latex);
    if (!uncaptioned) return;
    const caption = row.latex.slice(0, row.latex.indexOf("=")).trim();
    if (rows.some((other, otherIndex) => otherIndex !== index && other.latex.includes(caption))) return;
    rows[index] = { ...row, latex: uncaptioned };
    repairs.push(`Removed the caption on line ${index + 1}, which Desmos cannot define; the line evaluates ${uncaptioned}.`);
  });
  if (context.representation && rows.length > 0) {
    return reject(
      "answers-different-question",
      "The question asks which equation or expression represents the situation; calculator rows solve or graph it instead of identifying the model.",
    );
  }
  if (context.integerFactorExtremum &&
      rows.some((row) => /\\sim(?![A-Za-z])|~/.test(row.latex)) &&
      !rows.some((row) => /\\operatorname\{(?:max|min)\}|\\(?:max|min)\b/.test(row.latex))) {
    return reject(
      "unproven-extremum",
      "A regression gives one factorization, not the greatest or least value. Enumerate the allowed integer factors and take max or min of every resulting coefficient.",
    );
  }
  if (context.universalSymbolicInteger &&
      rows.some((row) => /\\sim(?![A-Za-z])|~/.test(row.latex) &&
        context.integers.some(({ name }) => new RegExp(`(?<![A-Za-z])${name}(?![A-Za-z])`, "i").test(row.latex)))) {
    return reject(
      "unproven-universal",
      "A regression finds one set of integer parameters, which cannot prove this symbolic expression is an integer for every allowed set. Use an exact coefficient identity in a written method, or a complete finite enumeration when the question permits one.",
    );
  }
  if (context.universalSymbolicInteger && rows.length > 0 && candidate.result.answerFrom === "reasoning") {
    return reject(
      "unproven-universal",
      "The calculator rows leave the universal integer claim to an unstated reasoning step. Give the exact argument as a written method, or use a complete finite check with a decisive calculator readout.",
    );
  }
  // This only catches an explicit uncertainty marker in a claimed proof. It
  // does not verify the symbolic algebra; a later explanation can still need
  // mathematical review even when the answer choice is correct.
  if (context.universalSymbolicInteger && candidate.result.type === "written" && /[?？]/.test(candidate.result.detail)) {
    return reject(
      "uncertain-written-proof",
      "The written readout contains a question mark in its coefficient argument. State the exact equality confidently and check each algebraic step before presenting this as a universal proof.",
    );
  }
  const identityIssue = identityPlanIssue(question, rows, candidate.result.row, candidate.answer);
  if (identityIssue) return reject("identity-conditions", identityIssue);
  const proseRows = findProseRows(rows);
  if (proseRows.length) {
    return reject("row-fails-to-insert", `Line ${proseRows.join(", ")} contains prose instead of a Desmos expression.`, "desmos_syntax");
  }
  const listShapes = findListShapeViolations(rows);
  if (listShapes.length) {
    return reject(
      "list-shape",
      listShapes
        .map((violation) =>
          violation.kind === "singleton"
            ? `Line ${violation.row} (${violation.latex}) wraps a single value in a one-element list, so every expression using ${violation.name} becomes a list; write an unknown as a bare letter the regression leaves undefined, and a single sample input as a plain number (an identity needs degree+1 inputs anyway)`
            : `Line ${violation.row} puts a list inside a list (${violation.element}); Desmos has no nested lists, so the row errors and every row that depends on it errors too`,
        )
        .join("; "),
      "desmos_syntax",
    );
  }
  if (hasUnnecessaryCoefficientLists(rows, question)) {
    return reject(
      "coefficient-lists",
      "Unnecessary coefficient lists for a small system. Use direct bracket regression [left side 1,left side 2]~[right side 1,right side 2], copying the original equations.",
    );
  }
  if (candidate.techniqueId === "list-evaluation" && hasDisposableScalarList(rows)) {
    return reject(
      "disposable-scalar-list",
      "A short list stores given numbers only to read them back by fixed index. Enter the arithmetic directly.",
    );
  }
  if (hasUnprovenSingleSample(question, rows, candidate.result.row)) {
    return reject(
      "unproven-invariance",
      "The given equation permits many x,y pairs. Evaluating the requested expression at one convenient x does not show every pair gives the same value. Add a row such as E(x)-E(0) that visibly stays at zero, or show an exact identity in a written method.",
    );
  }
  const derived = findDerivedConstants(rows, question, choices);
  if (derived.length) {
    return reject(
      "hidden-derivation",
      `Line ${derived.map((item) => `${item.row} uses ${item.constants.join(", ")}`).join("; ")}: those numbers are not in the question, so the plan was derived by hand.`,
    );
  }
  const untranscribed = findUntranscribedListValues(rows, question, choices);
  if (untranscribed.length) {
    return reject(
      "hidden-derivation",
      `Line ${untranscribed.map((item) => `${item.row} lists ${item.constants.join(", ")}`).join("; ")}: a data list must hold the question's numbers exactly as printed; let a Desmos row compute anything derived from them.`,
    );
  }
  let result = candidate.result;
  if (result.type === "slider_condition" && result.row === null && candidate.answerState) {
    const sliderRow = rows.findIndex((row) => row.slider !== null &&
      row.latex.replace(/\s+/g, "").startsWith(`${candidate.answerState!.param}=`));
    if (sliderRow >= 0) {
      result = { ...result, row: sliderRow + 1 };
      repairs.push(`Read the condition from the existing ${candidate.answerState.param} slider on line ${sliderRow + 1}.`);
    }
  }
  let derivedDefinitions = findDerivedDefinitions(rows, question);
  let resultRow = result.row;
  if (resultRow !== null && candidate.result.answerFrom === "value" && derivedDefinitions.some(({ row }) => row === resultRow)) {
    const readout = rows[resultRow - 1] ? unwrapSyntheticResultAlias(rows[resultRow - 1].latex, question) : null;
    if (readout) {
      rows[resultRow - 1] = { ...rows[resultRow - 1], latex: readout };
      repairs.push(`Removed the synthetic result alias on line ${resultRow}; Desmos evaluates ${readout} directly.`);
      derivedDefinitions = findDerivedDefinitions(rows, question);
    }
  }
  if (context.linearTableIntercept && choices === null && candidate.answerState === null &&
      result.type === "numeric" && result.answerFrom === "value" && resultRow !== null &&
      derivedDefinitions.some(({ row }) => row === resultRow)) {
    const graphRow = plottedLinearTableInterceptRow(context.linearTableIntercept, rows, resultRow);
    if (graphRow !== null) {
      rows.pop();
      resultRow = graphRow;
      result = {
        ...result,
        type: "x_intercept",
        row: graphRow,
        detail: "x-coordinate of the fitted line's x-intercept",
      };
      derivedDefinitions = findDerivedDefinitions(rows, question);
      repairs.push("Read the fitted line's x-intercept on its graph instead of defining the intercept from its fitted parameters.");
    }
  }
  if (derivedDefinitions.length) {
    return reject(
      "hidden-derivation",
      `Line ${derivedDefinitions.map((item) => `${item.row} defines a value by a formula in the fitted parameter ${item.parameters.join(", ")}`).join("; ")}: that formula was derived by hand.`,
    );
  }
  const undefinedVariables = findUndefinedVariables(rows);
  if (undefinedVariables.length) {
    return reject(
      "row-fails-to-insert",
      undefinedVariables.map(({ row, variables }) => `Line ${row} uses undefined ${variables.join(", ")}`).join("; "),
      "desmos_syntax",
    );
  }
  const unsupported = findUnsupportedDesmosOperations(rows);
  if (unsupported.length) return reject("row-fails-to-insert", unsupported.map(item => `Line ${item.row}: ${item.reason}`).join("; "), "desmos_syntax");
  const integerViolations = findIntegerParameterViolations(rows, parameters, {
    fixedValuesAllowed: !DRAGGED_SLIDER_TECHNIQUES.has(candidate.techniqueId) && candidate.cost.manualIterations === 0,
    determinedValue: asksForDeterminedValue(question),
  });
  if (integerViolations.length) {
    return reject(
      "integer-not-encoded",
      integerViolations
        .map(({ row, param }) => `Line ${row} fits or drags ${param} as a continuous value, but ${param} must be an integer and the question asks which values could work or for an extreme one; use an integer list or an integer-step slider.`)
        .join("; "),
    );
  }
  const determinacy = findRegressionDeterminacyViolations(rows, { readoutRow: resultRow });
  if (determinacy.length) {
    return reject(
      "underdetermined-regression",
      determinacy
        .map((violation) =>
          violation.kind === "underdetermined"
            ? `Line ${violation.row} is an underdetermined regression: ${violation.freeParams} free parameters (${violation.params.join(", ")}) but only ${violation.constraints} data constraints, so its fitted values are not unique. ` +
              "If the question asks for a combination those conditions fix (x+y+z from two equations in x, y, and z), read it on a later line that computes exactly that combination, such as x_{1}+y_{1}+z, and set the result row to that line; the server checks the value is fixed."
            : violation.kind === "inconsistent"
              ? `Line ${violation.row} has contradictory affine conditions, so no exact fit satisfies every equation.`
              : `Line ${violation.row} fits lists of mismatched length (${Object.entries(violation.lengths).map(([name, length]) => `${name}: ${length}`).join(", ")}).`,
        )
        .join("; "),
    );
  }
  if (context.interval && samplesInterval(rows, context.interval)) {
    return reject(
      "discrete-sampling",
      `The domain ${context.interval.low} to ${context.interval.high} is continuous; sampling only integer inputs can miss the true value. Graph the function with the restriction instead.`,
    );
  }
  // result.detail is a short readout label; LaTeX there (\sqrt{...}) is a
  // formatting slip, not a method defect, so it gets a neutral label instead
  // of costing the student a valid technique. No LaTeX reaches the student.
  try {
    sanitizeProse(result.detail, "result.detail");
  } catch (error) {
    if (!(error instanceof ProseLatexError)) throw error;
    const label = result.row !== null ? `the output on line ${result.row}` : "the answer";
    repairs.push(`The readout label was LaTeX and was replaced with "${label}".`);
    result = { ...result, detail: label };
  }
  if (candidate.answerState) {
    try {
      validateAnswerState(rows, candidate.answerState);
      const discovery = sliderDiscoveryRows(rows, candidate.answerState);
      discovery.forEach((row, index) => {
        if (row.latex !== rows[index].latex) {
          rows[index] = row;
          repairs.push("Moved an answer-seeded slider to a neutral starting stop. The student must adjust it and observe the condition.");
        }
      });
    } catch (error) {
      if (error instanceof AnswerConsistencyError) return reject("answer-state", error.message, error.stage);
      throw error;
    }
  }
  let consistent;
  try {
    consistent = deriveConsistentSolution({
      choices,
      result,
      answer: candidate.answer,
      readAnswer: "",
      expressionCount: rows.length,
      expressions: rows,
      approximate: context.approximate,
      wholeNumber: context.wholeNumber,
    });
  } catch (error) {
    if (error instanceof AnswerConsistencyError) return reject("answer-consistency", error.message, error.stage);
    throw error;
  }
  // Validate a necessary AA relation only when the transcription explicitly
  // states every required incidence and angle fact. No solution is synthesized.
  const claimedLength = parseNumber(consistent.answer.replace(/^[A-Z][).:]\s*/, ""));
  const similarityConflict = claimedLength === null ? null : similarityReadoutConflict(question, claimedLength);
  if (similarityConflict) return reject("similarity-correspondence", similarityConflict, "answer_consistency");
  // A valid answer label cannot rescue a wrong graph (for example, graphing
  // only the left side and claiming the original equation's solution as its
  // zero). Reject a provable readout contradiction, leaving valid alternatives
  // eligible. Rounded/estimated tasks and unsupported graph syntax stay on
  // their existing validation path; never rewrite the question or graph.
  if (!context.approximate && !context.wholeNumber && "type" in consistent.result &&
      consistent.result.type === "x_intercept" && consistent.result.row !== null &&
      consistent.result.value !== null) {
    const graph = rows[consistent.result.row - 1];
    const root = graph ? scalarAffineXIntercept(graph.latex) : null;
    if (root !== null && !roundsTo(String(consistent.result.value), root)) {
      return reject(
        "affine-intercept-mismatch",
        `The graph on row ${consistent.result.row} has x-intercept ${root}, not ${consistent.result.value}. Check that the row includes both sides of the original equation.`,
        "answer_consistency",
      );
    }
  }
  const exactIntercept = context.linearTableIntercept;
  if (exactIntercept) {
    const stated = parseNumber(consistent.answer);
    const answerMatches = stated !== null && (numbersMatch(stated, exactIntercept.value) || roundsTo(consistent.answer, exactIntercept.value));
    const readoutMatches = consistent.result.value === null || numbersMatch(consistent.result.value, exactIntercept.value);
    if (!answerMatches || !readoutMatches) {
      // This line is fully determined by the printed table. Correct a mistaken
      // clicked intercept only when the rows really fit and graph those points;
      // a written calculation or a different graph must be regenerated.
      const repairable = choices === null && "type" in consistent.result && consistent.result.type === "x_intercept" &&
        consistent.result.answerFrom === "value" &&
        graphsExactLinearTableFit(exactIntercept, rows, consistent.result.row) &&
        Math.abs(Number(exactIntercept.value.toFixed(6)) - exactIntercept.value) <=
          1e-12 * Math.max(1, Math.abs(exactIntercept.value));
      if (!repairable) {
        return reject(
          "linear-table-intercept-mismatch",
          `The printed linear table has x-intercept ${exactIntercept.value}, but this candidate states ${consistent.answer}. Check the table pairs, the fitted line, and the x-intercept readout.`,
          "answer_consistency",
        );
      }
      const correctedAnswer = String(exactIntercept.value);
      try {
        consistent = deriveConsistentSolution({
          choices,
          result: { ...consistent.result, value: exactIntercept.value },
          answer: correctedAnswer,
          readAnswer: "",
          expressionCount: rows.length,
          expressions: rows,
          approximate: context.approximate,
          wholeNumber: context.wholeNumber,
        });
      } catch (error) {
        if (error instanceof AnswerConsistencyError) return reject("answer-consistency", error.message, error.stage);
        throw error;
      }
      repairs.push(`Corrected the x-intercept from ${candidate.answer} to ${correctedAnswer} using the exact printed table and the candidate's fitted-line graph.`);
    }
  }
  const exactProduct = context.quadraticProductTable;
  if (exactProduct) {
    const stated = parseNumber(consistent.answer);
    const answerMatches = stated !== null && (numbersMatch(stated, exactProduct.value) || roundsTo(consistent.answer, exactProduct.value));
    const readoutMatches = consistent.result.value === null || numbersMatch(consistent.result.value, exactProduct.value);
    if (!answerMatches || !readoutMatches) {
      // The zero-factor table cell is no evidence for f at that point. Three
      // other exact rows determine f; only a regression that actually enters
      // the printed pairs and the given product may have its readout repaired.
      const repairable = choices === null && "type" in consistent.result && consistent.result.type === "numeric" &&
        consistent.result.answerFrom === "value" &&
        fitsExactQuadraticProductTable(exactProduct, rows, consistent.result.row) &&
        Math.abs(Number(exactProduct.value.toFixed(6)) - exactProduct.value) <=
          1e-12 * Math.max(1, Math.abs(exactProduct.value));
      if (!repairable) {
        return reject(
          "quadratic-product-table-mismatch",
          `The printed g-table and g(x)=(x${exactProduct.factor < 0 ? "" : "+"}${exactProduct.factor})f(x) determine f(${exactProduct.input})=${exactProduct.value}, but this candidate states ${consistent.answer}. Fit the original g-values against the full product, then read f at the requested input.`,
          "answer_consistency",
        );
      }
      const correctedAnswer = String(exactProduct.value);
      try {
        consistent = deriveConsistentSolution({
          choices,
          result: { ...consistent.result, value: exactProduct.value },
          answer: correctedAnswer,
          readAnswer: "",
          expressionCount: rows.length,
          expressions: rows,
          approximate: context.approximate,
          wholeNumber: context.wholeNumber,
        });
      } catch (error) {
        if (error instanceof AnswerConsistencyError) return reject("answer-consistency", error.message, error.stage);
        throw error;
      }
      repairs.push(`Corrected f(${exactProduct.input}) from ${candidate.answer} to ${correctedAnswer} using the exact g-table and the candidate's quadratic regression.`);
    }
  }
  if (rows.length === 0 && "type" in consistent.result && consistent.result.type !== "written") {
    return reject("answer-consistency", "A technique without calculator rows must use the written result type.", "result_contract");
  }
  const condition = checkConditionCompleteness({
    conditionType,
    distinguishes: candidate.distinguishes,
    result: consistent.result,
    answerState: candidate.answerState,
    expressions: rows,
  });
  if (condition && "error" in condition) return reject("condition-incomplete", condition.error);
  let answer: string;
  try {
    answer = sanitizeProse(consistent.answer, "answer");
  } catch (error) {
    if (error instanceof ProseLatexError) return reject("prose-latex", error.message, "prose_text");
    throw error;
  }
  const bounds = candidate.graphBounds;
  const validBounds = bounds && bounds.left < bounds.right && bounds.bottom < bounds.top;
  // Definitional floors the model's own report cannot lower.
  let factFloor = 0;
  // A given-ratio question (infinitely many solutions, what is g/k?) reads the
  // ratio straight from the scale factor, as the condition rule above allows.
  if (rows.length === 0 && context.solutionCount && !isGivenInfiniteSolutionRatioQuestion(question)) {
    factFloor = 1;
    repairs.push("Counted one memorized fact: deciding how many solutions there are on paper needs a solution-count rule.");
  } else if (rows.some((row) => SLOPE_QUOTIENT.test(row.latex.replace(/\\left|\\right/g, "")))) {
    factFloor = 1;
    repairs.push("Counted one memorized fact: a row types the two-point slope formula over the given numbers.");
  } else if (rows.some((row) => TYPED_DISCRIMINANT.test(row.latex.replace(/\\left|\\right|\s/g, "")))) {
    factFloor = 1;
    repairs.push("Counted one memorized fact: a row types the quadratic formula's b^2-4ac over the given coefficients.");
  }
  let derivationFloor = constrainedRewriteBurden(question, rows);
  if (derivationFloor) repairs.push(`Counted at least ${derivationFloor} construction steps: this function replaces original unknowns with derived expressions before Desmos evaluates the target.`);
  // A fitted line does not make the root formula -intercept/slope a given.
  // Charge this construction even when its row is labeled ordinary evaluation.
  const readout = result.row ? rows[result.row - 1]?.latex.replace(/\\(?:left|right)/g, "").replace(/\s+/g, "") : "";
  const rootFormula = readout?.match(/^-(?:([a-z])\/([a-z])|\\frac\{([a-z])\}\{([a-z])\})$/);
  if (rootFormula && !question.replace(/\s+/g, "").includes(readout!)) {
    const intercept = rootFormula[1] ?? rootFormula[3], slope = rootFormula[2] ?? rootFormula[4];
    const fittedLine = rows.some(row => {
      const text = row.latex.replace(/\s+/g, "");
      return /=|~|\\sim/.test(text) && text.endsWith(`+${intercept}`) && text.includes(slope);
    });
    if (fittedLine) {
      derivationFloor = Math.max(derivationFloor, 1);
      repairs.push("Counted the root-formula construction from the line’s slope and intercept. A clicked graph root does not require that algebra.");
    }
  }
  const cofactorBurden = factorConstructionBurden(question, rows);
  if (cofactorBurden) {
    derivationFloor = Math.max(derivationFloor, cofactorBurden);
    repairs.push("Counted construction of a numeric cofactor not supplied by the factor statement. A fitted cofactor can outsource that derivation.");
  }
  const insight = identityInsightBurden(question, rows);
  if (insight) {
    derivationFloor = Math.max(derivationFloor, insight);
    repairs.push("Counted the mathematical insight of selecting an input or constructing an evaluation to reveal unknown identity coefficients.");
  }
  if (candidate.techniqueId === "answer-choice-list" &&
      (rows.some((row) => isLiteralArithmetic(row.latex)) || wrapsScalarArithmeticInChoiceList(rows))) {
    // A choice lookup does not make the computation it wraps free: the same
    // row alone is calculator arithmetic, which carries its setup step.
    derivationFloor = Math.max(derivationFloor, 1);
    repairs.push("Counted one derivation step: the list looks up a value its own row computes from the question's numbers, the setup calculator arithmetic carries.");
  }
  return {
    techniqueId: candidate.techniqueId,
    rung: candidate.rung,
    rows: rows.map(({ latex, slider }) => ({ latex, slider: slider ?? null })),
    answer,
    result: consistent.result as Method["result"],
    answerState: candidate.answerState,
    parameters,
    conditionType,
    distinguishes: condition ? condition.distinguishes : candidate.distinguishes,
    graphBounds: validBounds ? bounds : null,
    rawCost: candidate.cost,
    factFloor,
    derivationFloor,
    // The generated read instruction is replaced by the explanation call.
    repairs: [...repairs, ...consistent.repairs.filter((repair) => !repair.startsWith("The read instruction was missing"))],
  };
}

function scored(id: string, validated: Validated): Omit<Method, "badges" | "rejected"> {
  const derived = deriveCost(validated.rawCost, validated.rows.length, validated.techniqueId);
  const cost = {
    ...derived,
    manualIterations: Math.max(derived.manualIterations, validated.answerState && validated.rows.some(row => row.slider) ? 1 : 0),
    derivationSteps: Math.max(derived.derivationSteps, validated.derivationFloor),
    oneOffFacts: Math.max(derived.oneOffFacts, validated.factFloor),
  };
  const score = mathScore(cost);
  const { rawCost, factFloor, derivationFloor, ...rest } = validated;
  void rawCost;
  void factFloor;
  void derivationFloor;
  return {
    ...rest,
    id,
    name: techniqueName(validated.techniqueId),
    cost,
    total: totalCost(cost),
    mathScore: score,
    mathLevel: mathLevel(score),
    shape: describeShape({ techniqueId: validated.techniqueId, rows: validated.rows, cost }),
    family: methodFamily(validated.techniqueId, validated.rows),
    approach: planApproach(validated.techniqueId, validated.rows),
  };
}

function rejectedMethod(id: string, candidate: Candidate, rejection: Rejection): Method {
  const rows = candidate.rows.map(({ latex, slider }) => ({ latex, slider }));
  const cost = deriveCost(candidate.cost, rows.length, candidate.techniqueId);
  const score = mathScore(cost);
  return {
    id,
    techniqueId: candidate.techniqueId,
    name: techniqueName(candidate.techniqueId),
    rung: candidate.rung,
    rows,
    answer: candidate.answer,
    result: candidate.result,
    answerState: candidate.answerState,
    parameters: candidate.parameters,
    conditionType: candidate.conditionType,
    distinguishes: candidate.distinguishes,
    graphBounds: candidate.graphBounds,
    cost,
    total: totalCost(cost),
    mathScore: score,
    mathLevel: mathLevel(score),
    shape: describeShape({ techniqueId: candidate.techniqueId, rows, cost }),
    family: methodFamily(candidate.techniqueId, rows),
    approach: planApproach(candidate.techniqueId, rows),
    badges: [],
    rejected: { rule: rejection.rule, reason: rejection.reason },
    repairs: [],
  };
}

/**
 * Every math way after the first, in rank order: the list offers the Desmos
 * ways and ONE math way, never several algebra variants of the same idea.
 */
function extraMathWays<T extends Pick<Method, "techniqueId" | "approach" | "rows">>(ranked: readonly T[]): T[] {
  const math = ranked.filter(method => methodApproach(method) === "math");
  // When no native method survives, do not hide the only executable
  // calculator workflow just because paper arithmetic ranks one row cheaper.
  // This remains calculator-only coverage, not a claimed native shortcut.
  const calculator = ranked.some(method => methodApproach(method) === "desmos")
    ? null : math.find(method => method.rows.length > 0);
  const written = calculator ? math.find(method => method.rows.length === 0) : null;
  return math.slice(1).filter(method => method !== calculator && method !== written);
}

/** Prefer a written coefficient proof only when the printed factorization
 * independently implies the claimed equality. An arbitrary model-written
 * "choice = integer parameter" is not evidence of a valid identity. */
function isWrittenUniversalIdentity(
  method: Pick<Method, "rows" | "result">,
  context: CandidateContext,
): boolean {
  if (!context.universalSymbolicInteger || method.rows.length || method.result.type !== "written") return false;
  if (!["b", "c", "d"].every((name) => context.integers.some((parameter) => parameter.name === name))) return false;
  // The screenshot may render a choice as \frac{a+c}{b}, while the proof
  // writes (a+c)/b. Check the entire stated polynomial family: a rewrite is
  // an identity, whereas an equality at only one x would not justify this.
  const normalized = (value: string) => value
    .replace(/\\(?:dfrac|tfrac|frac)\{([^{}]+)\}\{([^{}]+)\}/g, (_match, numerator: string, denominator: string) =>
      `${/[+-]/.test(numerator) ? `(${numerator})` : numerator}/${denominator}`)
    .replace(/\\left|\\right|\s+|\$/g, "")
    .replace(/[−–]/g, "-");
  const targetChoices = context.choices?.filter(({ text }) => normalized(text) === "(a+c)/b");
  if (targetChoices?.length !== 1 || method.result.choiceLabel?.toUpperCase() !== targetChoices[0].label.toUpperCase()) return false;
  const questionStem = normalized(context.question).replace(/²/g, "^2").replace(/\^\{2\}/g, "^2");
  const family = questionStem.match(/^Theexpression([+-]?\d*)x\^2-ax([+-]\d+)(?:,whereaisaconstant,?)?canberewrittenas\(bx\+c\)\(x\+d\),whereb,c,(?:and)?dareintegerconstants\.Whichofthefollowingmustbeaninteger\?$/i);
  if (!family) return false;
  const leading = Number(family[1] === "" || family[1] === "+" ? "1" : family[1] === "-" ? "-1" : family[1]);
  const constant = Number(family[2]);
  if (!Number.isSafeInteger(leading) || leading === 0 || !Number.isSafeInteger(constant)) return false;
  // Coefficients of x² and x give b=L≠0 and -a=bd+c. Therefore the exact
  // target is -d for every allowed integer factorization, independently of K.
  // This preference certifies that equality, not the uniqueness of other choices.
  if (/\b(?:not|false|incorrect|invalid|cannot)\b/i.test(method.result.detail)) return false;
  const detail = normalized(method.result.detail);
  const equality = "(a+c)/b=-d";
  const at = detail.indexOf(equality);
  if (at < 0) return false;
  const before = detail.slice(0, at);
  const completeLeft = at === 0 || /[,;:.(]$/.test(before) || /(?:so|hence|therefore|gives|implies|shows|is)$/.test(before);
  return completeLeft && (at + equality.length === detail.length || /[,;.:)]/.test(detail[at + equality.length]));
}

/**
 * Applies every hard rejection, scores the survivors, and takes the argmin of
 * student-math burden before practical calculator effort. The model's stated preference never selects; it is only kept so
 * a disagreement can be logged. Throws when no candidate survives.
 */
export function selectMethods(response: CandidatesResponse): MethodSelection {
  if (response.status !== "solved") {
    throw new StrategySelectionError("Only a solved response has methods to select.");
  }
  if (!response.question.trim()) {
    throw new StrategySelectionError("A solved response needs the transcribed question.");
  }
  if (response.candidates.length === 0) {
    throw new StrategySelectionError("A solved response needs at least one candidate technique.");
  }
  let choices: AnswerChoice[] | null;
  try {
    choices = normalizeChoices(response.choices)?.map(({ label, text }) => ({ label, text })) ?? null;
  } catch (error) {
    if (error instanceof AnswerConsistencyError) throw new StrategySelectionError(error.message, error.stage);
    throw error;
  }
  // The transcription is call 1's prose, shown to the student: repaired here
  // (10\pi → 10π), where call 1 can still correct what does not repair, and
  // never left for the explanation call, which cannot change it.
  let question: string;
  let structure: string | null;
  try {
    question = sanitizeProse(response.question, "question");
    structure = response.structure.trim() ? sanitizeProse(response.structure.trim(), "structure") : null;
    choices?.forEach((choice) => sanitizeProse(choice.text, `choice ${choice.label}`));
  } catch (error) {
    if (error instanceof ProseLatexError) throw new StrategySelectionError(error.message, "prose_text");
    throw error;
  }
  const conflicts = findTranscriptionConflicts(question);
  if (conflicts.length) {
    throw new StrategySelectionError(
      `The transcription gives two different values for ${conflicts.map(({ name, input, values }) => `${name}(${input}) (${values.join(" and ")})`).join(", ")}. ` +
        "Transcribe each table cell once, exactly as printed under its header, and never add values you computed to the question text.",
      "transcription_conflict",
    );
  }
  const integers = questionIntegerParameters(question);
  const context: CandidateContext = {
    question,
    choices,
    representation: isRepresentationQuestion(question),
    interval: continuousInterval(question),
    condition: questionCondition(question),
    integers,
    integerFactorExtremum: isIntegerFactorExtremumQuestion(question),
    universalSymbolicInteger: isUniversalSymbolicIntegerQuestion(question, choices, integers),
    solutionCount: isSolutionCountCondition(question),
    approximate: isApproximationQuestion(question),
    wholeNumber: isWholeNumberQuestion(question),
    linearTableIntercept: choices === null ? exactLinearTableIntercept(question) : null,
    quadraticProductTable: choices === null ? exactQuadraticProductTable(question) : null,
    exactParallelSystem: choices === null ? exactNoSolutionParallelSystem(question) : null,
  };

  // Validate every candidate, then keep the best one per technique: two
  // candidates under one name (the model's, or one relabeled to it) list it
  // once, at its cheapest, rather than whichever came first.
  const outcomes = response.candidates.map((original, index) => {
    const vertexRepair = repairExactTangentVertex(original, question);
    const parallelRepair = repairExactParallelSlider(vertexRepair.candidate, context.exactParallelSystem);
    const { candidate, repair } = relabel(parallelRepair.candidate, context.representation, isInterpretationQuestion(question));
    const outcome = validateCandidate(candidate, context);
    return "rule" in outcome
      ? { index, candidate, rejection: outcome }
      : { index, candidate, method: scored(candidate.techniqueId,
        repair || vertexRepair.repair || parallelRepair.repair ? { ...outcome, repairs: [repair, vertexRepair.repair, parallelRepair.repair, ...outcome.repairs].filter((value): value is string => value !== null) } : outcome) };
  });
  const best = new Map<TechniqueId, Omit<Method, "badges" | "rejected">>();
  for (const { method } of outcomes) {
    if (!method) continue;
    const current = best.get(method.techniqueId);
    if (!current || compareMethods(method, current) < 0) best.set(method.techniqueId, method);
  }
  const eligible: Omit<Method, "badges" | "rejected">[] = [...best.values()];
  const rejected: (Method & { stage: string })[] = [];
  const named = new Set<TechniqueId>(best.keys());
  for (const { index, candidate, method, rejection } of outcomes) {
    if (method && best.get(method.techniqueId) === method) continue;
    // Ids stay unique: a later candidate under a listed technique's name is #n.
    const id = named.has(candidate.techniqueId) ? `${candidate.techniqueId}#${index + 1}` : candidate.techniqueId;
    named.add(candidate.techniqueId);
    if (method) {
      const duplicate = reject("duplicate-technique", `${techniqueName(candidate.techniqueId)} is already listed at lower cost; each candidate must be a distinct technique.`);
      rejected.push({ ...method, id, badges: [], rejected: { rule: duplicate.rule, reason: duplicate.reason }, stage: duplicate.stage });
    } else {
      rejected.push({ ...rejectedMethod(id, candidate, rejection!), stage: rejection!.stage });
    }
  }

  if (eligible.length === 0) {
    throw new StrategySelectionError(
      `Every candidate was rejected: ${rejected.map((method) => `${method.name} (${method.rejected!.rule}): ${method.rejected!.reason}`).join(" | ")}`,
      rejected[0]?.stage ?? "strategy_policy",
    );
  }

  // The same rows under a second technique name teach nothing new (a graph
  // of y=x^2-17x+60 listed as both "Graph both sides" and "Read the
  // intercepts"): only the cheaper listing stays.
  const ranked: typeof eligible = [];
  const signatures = new Map<string, string>();
  const rankForQuestion = (left: typeof eligible[number], right: typeof eligible[number]) => {
    const proofPreference = Number(isWrittenUniversalIdentity(right, context)) - Number(isWrittenUniversalIdentity(left, context));
    return proofPreference || compareMethods(left, right);
  };
  for (const method of [...eligible].sort(rankForQuestion)) {
    const signature = method.rows.length ? rowSignature(method.rows) : null;
    const first = signature ? signatures.get(signature) : undefined;
    if (first) {
      const rejection = reject("duplicate-rows", `${method.name} uses exactly the same calculator rows as ${first}; listing it again teaches nothing new.`);
      rejected.push({ ...method, badges: [], rejected: { rule: rejection.rule, reason: rejection.reason }, stage: rejection.stage });
      continue;
    }
    if (signature) signatures.set(signature, method.name);
    ranked.push(method);
  }
  for (const extra of extraMathWays(ranked)) {
    ranked.splice(ranked.indexOf(extra), 1);
    const rejection = reject("extra-math-way", `${extra.name} is a second math way; one math way is listed as the alternative to the Desmos ways.`);
    rejected.push({ ...extra, badges: [], rejected: { rule: rejection.rule, reason: rejection.reason }, stage: rejection.stage });
  }
  const badges = assignBadges(ranked);
  return {
    question,
    choices,
    structure,
    methods: [
      ...ranked.map((method) => ({ ...method, badges: badges.get(method.id) ?? [], rejected: null })),
      ...rejected.map(({ stage, ...method }) => {
        void stage;
        return method;
      }),
    ],
    winnerId: ranked[0].id,
    modelPreference: response.preferredTechniqueId,
  };
}

/**
 * Rejections that are contract slips in an otherwise sound Desmos technique:
 * a mislabeled readout, a row that will not insert, a list shape Desmos
 * refuses, a missing distinct-lines check. Answering a different question
 * (a representation question) and duplicates are not slips.
 */
export const RESCUABLE_RULES: ReadonlySet<string> = new Set([
  "answer-consistency",
  "answer-state",
  "row-fails-to-insert",
  "list-shape",
  "prose-latex",
  "condition-incomplete",
  "integer-not-encoded",
  "hidden-derivation",
  "underdetermined-regression",
  "coefficient-lists",
  "discrete-sampling",
  "unproven-extremum",
  "unproven-invariance",
]);

/** A default at or above this math score asks real algebra or memorization of the student. */
export const MATH_HEAVY_SCORE = 2;

export type RescueTarget = {
  /** The math way that would be the default as things stand. */
  winner: Method;
  /** Rejected Desmos techniques that would rank ahead of it had they passed (may be empty). */
  candidates: Method[];
};

/**
 * Whether one guided correction is worth a model call: the default is a math
 * way, so no Desmos way survived. Either the model proposed Desmos techniques
 * that were rejected for a fixable slip (the shared-zero slider on a factor
 * question, the clicked-root regression on an integer form), or it proposed
 * none. Translating the words is exempt: a representation or interpretation
 * question has no Desmos way to find.
 */
export function desmosRescueTarget(selection: MethodSelection): RescueTarget | null {
  const winner = selection.methods.find((method) => method.id === selection.winnerId);
  if (!winner || selection.methods.some(method => !method.rejected && methodApproach(method) === "desmos")) return null;
  if (isRepresentationQuestion(selection.question) || isInterpretationQuestion(selection.question)) return null;
  // A concise coefficient proof is the useful answer to a universal symbolic
  // integer claim. A single fitted example cannot replace it, so another
  // Desmos-search call would only add latency after the proof is ready.
  if (winner.rows.length === 0 && winner.result.type === "written" &&
      isUniversalSymbolicIntegerQuestion(selection.question, selection.choices, questionIntegerParameters(selection.question))) return null;
  const candidates = selection.methods.filter(
    (method) =>
      method.rejected !== null &&
      RESCUABLE_RULES.has(method.rejected.rule) &&
      method.rows.length > 0 &&
      getTechnique(method.techniqueId).source === "library" &&
      methodApproach(method) === "desmos",
  );
  // For a calculation explicitly printed in the question, a new graph is
  // usually a longer route to the same result. Only skip the speculative search
  // when no rejected Desmos method needs repair; answer consistency was checked
  // in selection, though this is not an independent arithmetic proof.
  if (candidates.length === 0 && winner.techniqueId === "calculator-arithmetic" &&
      winner.rows.length === 1 && isLiteralArithmetic(winner.rows[0].latex) &&
      isPrintedCalculation(selection.question, winner.rows[0].latex) &&
      winner.result.type === "numeric" && winner.result.row === 1 &&
      winner.result.answerFrom === "value" && Number.isFinite(winner.result.value) &&
      winner.cost.derivationSteps <= 1 && winner.cost.oneOffFacts === 0) return null;
  return { winner, candidates };
}

/** Server acceptance is not browser execution or a mathematical proof. */
export type DesmosCoverage = {
  status: "desmos-available" | "calculator-only" | "written-only";
  methodIds: string[];
  recommended: boolean;
  recoveryRequired: boolean;
  exemption: "representation" | "interpretation" | "universal-proof" | "literal-calculation" | null;
};

export function assessDesmosCoverage(selection: MethodSelection): DesmosCoverage {
  const methods = selection.methods.filter(method => !method.rejected);
  const native = methods.filter(method => method.rows.length > 0 && methodApproach(method) === "desmos");
  const winner = methods.find(method => method.id === selection.winnerId);
  const representation = isRepresentationQuestion(selection.question);
  const universal = !!winner && winner.rows.length === 0 && winner.result.type === "written" &&
    isUniversalSymbolicIntegerQuestion(selection.question, selection.choices, questionIntegerParameters(selection.question));
  const required = native.length === 0 && desmosRescueTarget(selection) !== null;
  return {
    status: native.length ? "desmos-available" : methods.some(method => method.rows.length) ? "calculator-only" : "written-only",
    methodIds: native.map(method => method.id),
    recommended: native.some(method => method.id === selection.winnerId),
    recoveryRequired: required,
    exemption: native.length || required ? null : representation ? "representation" : isInterpretationQuestion(selection.question) ? "interpretation" : universal ? "universal-proof" : "literal-calculation",
  };
}

/**
 * The guided-correction text: fix the rejected Desmos candidates, or, when the
 * model listed none, find one (`hints` names the library strategies the
 * question's wording points to). Every passing candidate is kept.
 */
export function rescueReason(target: RescueTarget, hints = ""): string {
  const problem = `the default would be ${target.winner.techniqueId} (${target.winner.name}), a math way that asks the student for ${target.winner.cost.derivationSteps} hand step(s) and ${target.winner.cost.oneOffFacts} memorized fact(s), because no Desmos way passed. `;
  const fix = target.candidates.length
    ? `${target.candidates.map((method) => `${method.techniqueId} (${method.name}) was rejected [${method.rejected!.rule}]: ${method.rejected!.reason}`).join(" | ")}. Correct those Desmos candidates so every rule passes (same technique, fixed rows or readout). If a rejected technique genuinely cannot solve this problem, drop it instead; never invent filler. `
    : `You listed no Desmos way. Search <gold_solutions> and the numbered library strategies for the Desmos angle on this structure${hints ? ` (${hints})` : ""}: graph the given relation and click a feature, regress an unknown against the givens or a clicked value, drag a slider until a condition appears, or filter a list. If the math way plugs the givens into a formula or rearranges one, graph that relationship with the unknown as x against the given value as a horizontal line and click where they meet. Add every Desmos way that genuinely solves it. `;
  return `${problem}${fix}Keep every candidate that already passed unchanged, including the math way.`;
}

/**
 * Combines the original selection with a corrected one: every eligible
 * technique from either (the cheaper version when both have it), re-ranked
 * and re-badged, so a correction can only add or improve methods, never
 * lose one that already passed.
 */
export function mergeSelections(primary: MethodSelection, secondary: MethodSelection): MethodSelection {
  const eligible = new Map<string, Method>();
  for (const method of [...primary.methods, ...secondary.methods]) {
    if (method.rejected) continue;
    const current = eligible.get(method.techniqueId);
    if (!current || compareMethods(method, current) < 0) eligible.set(method.techniqueId, method);
  }
  const sorted = [...eligible.values()].sort(compareMethods);
  const extras = new Set<Method>(extraMathWays(sorted));
  const ranked = sorted.filter((method) => !extras.has(method)).slice(0, MAX_CANDIDATES);
  const badges = assignBadges(ranked);
  const rejected = new Map<string, Method>();
  for (const method of [...primary.methods, ...secondary.methods]) {
    if (method.rejected && !eligible.has(method.techniqueId)) rejected.set(method.id, method);
  }
  return {
    ...primary,
    methods: [...ranked.map((method) => ({ ...method, badges: badges.get(method.id) ?? [] })), ...rejected.values()],
    winnerId: ranked[0]?.id ?? primary.winnerId,
  };
}
