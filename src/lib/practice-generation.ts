import { randomInt, randomUUID } from "node:crypto";

import { normalizeDesmosExpressions } from "./desmos-latex";
import { solutionSchema, type DesmosExpression, type Solution } from "./solver-schema";
import { isTechniqueId, techniqueName, type TechniqueId } from "./technique-vocabulary";
import type { TutorContext } from "./tutor";
import type { PracticeExercise, PracticeGrade } from "./practice-types";
import { generateExtendedPractice } from "./practice-generators-extra";

/** This module is server-side. Do not import it into a client component. */
export type PracticeProblem = {
  exercise: PracticeExercise;
  answer: number;
  correctChoice: string | null;
  hint: string;
  feedback: string;
  solution: Solution;
};
export type PracticeDraft = {
  question: string; structure: string; answer: number; rows: DesmosExpression[];
  why: string; readAnswer: string; hint: string; feedback: string;
  graphBounds?: Solution["graphBounds"]; answerState?: Solution["answerState"];
  handMath?: string | null; forceChoices?: boolean;
};

type Random = (minimum: number, maximum: number) => number;
type Target = "a" | "b" | "c" | "m" | "evaluate";
export class UnsupportedPracticeError extends Error {
  constructor() { super("Practice for this particular method and question isn’t available yet. You can still use the original solution."); }
}

function normalized(value: string) {
  return value.toLowerCase().replace(/²/g, "^2").replace(/³/g, "^3").replace(/\^\{([23])\}/g, "^$1").replace(/[−–]/g, "-");
}
function questionOf(context: TutorContext) { return normalized(context.question); }
function rowsOf(context: TutorContext) { return normalized(context.rows.map(row => row.latex).join("\n")); }
function compact(value: string) {
  return normalized(value).replace(/\\(?:left|right)/g, "").replace(/\\sim/g, "~").replace(/\\(?:cdot|times)/g, "").replace(/[{}\s*]/g, "");
}
function numericPolynomial(expression: string, variables: string[], degree: 1 | 2) {
  const number = "(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
  const variable = `(?:${variables.join("|")})${degree === 2 ? "(?:\\^2)?" : ""}`;
  const term = `(?:${number}(?:${variable})?|${variable})`;
  return new RegExp(`^[+-]?${term}(?:[+-]${term})*$`).test(expression);
}
function approximately(a: number, b: number) { return Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(b)); }
function invariant(condition: boolean) { if (!condition) throw new Error("Practice verification failed"); }
function polynomial(a: number, b: number, c: number, variable = "x") {
  return `${a}${variable}^2${b < 0 ? "-" : "+"}${Math.abs(b)}${variable}${c < 0 ? "-" : "+"}${Math.abs(c)}`;
}
function line(m: number, b: number, variable = "x") { return `${m}${variable}${b < 0 ? "-" : "+"}${Math.abs(b)}`; }
function row(latex: string, purpose: string): DesmosExpression { return { latex, purpose }; }
function format(value: number) { return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(8))); }
function signed(rng: Random, low = 1, high = 8) { return rng(low, high) * (rng(0, 1) ? 1 : -1); }
function targetOf(context: TutorContext, available: Target[]): Target | null {
  const question = questionOf(context);
  const last = question.slice(Math.max(question.lastIndexOf("?", question.length - 2) + 1, 0));
  const targetText = /(?:what|find|determine|calculate)[^?]*\??\s*$/.exec(last)?.[0] ?? last;
  if (available.includes("evaluate") && /(?:f|g|h)\s*\(\s*-?\d+(?:\.\d+)?\s*\)/.test(targetText)) return "evaluate";
  if (available.includes("m") && /slope|rate of change/.test(targetText)) return "m";
  for (const target of available) {
    if (target === "evaluate") continue;
    if (new RegExp(`(?:value of|what is|find|determine|calculate)\\s+(?:the\\s+)?(?:coefficient\\s+)?${target}\\s*[?.]?$`).test(targetText)) return target;
  }
  if (available.includes("b") && /y.intercept/.test(targetText)) return "b";
  return null;
}

function finish(context: TutorContext, data: PracticeDraft, rng: Random): PracticeProblem {
  invariant(Number.isFinite(data.answer) && Math.abs(data.answer) <= 1e10);
  invariant(isTechniqueId(context.techniqueId ?? ""));
  const techniqueId = context.techniqueId as TechniqueId;
  const choices = context.choices?.length || data.forceChoices ? [data.answer, data.answer + 1, data.answer - 2, data.answer + 4]
    .map(value => ({ value, sort: rng(0, 1_000_000) })).sort((a, b) => a.sort - b.sort)
    .map(({ value }, index) => ({ label: "ABCD"[index], text: format(value) })) : null;
  const correctChoice = choices?.find(choice => Number(choice.text) === data.answer)?.label ?? null;
  const exercise: PracticeExercise = {
    id: randomUUID(), question: data.question, choices, techniqueId,
    techniqueName: techniqueName(techniqueId), structure: data.structure,
    answerFormat: choices ? "choice" : "numeric", calculatorUseful: true,
  };
  const solution = solutionSchema.parse({
    status: "solved", question: data.question, choices, structure: data.structure,
    trick: exercise.techniqueName, answer: format(data.answer), method: "desmos",
    why: data.why, handMath: data.handMath ?? null, steps: [], readAnswer: data.readAnswer,
    expressions: normalizeDesmosExpressions(data.rows), result: null,
    graphBounds: data.graphBounds ?? null, answerState: data.answerState ?? null, clarification: null,
  });
  return { exercise, answer: data.answer, correctChoice, hint: data.hint, feedback: data.feedback, solution };
}

/** Fit the same model and request the same kind of parameter/readout. */
function regression(context: TutorContext, rng: Random): PracticeProblem {
  const id = context.techniqueId;
  const inputRows = rowsOf(context);
  const fits = context.rows.map(item => compact(item.latex)).filter(item => item.includes("~"));
  const isQuadratic = id === "three-point-regression";
  const isExponential = id === "exponential-regression";
  const linearCoefficient = fits[0]?.includes("~ax_1") ? "a" : "m";
  const target = targetOf(context, isQuadratic ? ["a", "b", "c", "evaluate"] : isExponential ? ["a", "b", "evaluate"] : [linearCoefficient, "b", "evaluate"]);
  if (!target || !/\\sim|~/.test(inputRows)) throw new UnsupportedPracticeError();
  // A quadratic curve fit is not interchangeable with a linear, power, or other model.
  const expected = isQuadratic ? "y_1~ax_1^2+bx_1+c" : isExponential ? "y_1~ab^x_1" : `y_1~${linearCoefficient}x_1+b`;
  if (fits.length !== 1 || fits[0] !== expected) throw new UnsupportedPracticeError();
  const a = rng(1, isExponential ? 12 : 5), b = isExponential ? rng(2, 5) : signed(rng), c = signed(rng, 1, 12);
  const xs = isExponential ? [0, 1, 2] : [1, 2, rng(3, 5)];
  const evaluate = (x: number) => isQuadratic ? a * x * x + b * x + c : isExponential ? a * b ** x : a * x + b;
  const ys = xs.map(evaluate);
  const at = rng(6, 10);
  const answer = target === "evaluate" ? evaluate(at) : target === "m" || target === "a" ? a : target === "b" ? b : c;
  // Recover parameters independently from the data that the student receives.
  if (isQuadratic) {
    const s12 = (ys[1] - ys[0]) / (xs[1] - xs[0]);
    const s23 = (ys[2] - ys[1]) / (xs[2] - xs[1]);
    const recoveredA = (s23 - s12) / (xs[2] - xs[0]);
    const recoveredB = s12 - recoveredA * (xs[0] + xs[1]);
    invariant(approximately(recoveredA, a) && approximately(recoveredB, b) && approximately(ys[0] - recoveredA * xs[0] ** 2 - recoveredB * xs[0], c));
  } else if (isExponential) {
    invariant(ys[0] > 0 && ys[1] / ys[0] === b && ys[2] / ys[1] === b && ys[0] === a);
  } else invariant((ys[1] - ys[0]) / (xs[1] - xs[0]) === a && ys.every((y, index) => y - a * xs[index] === b));
  const model = isQuadratic ? "ax^2+bx+c" : isExponential ? "ab^x" : `${linearCoefficient}x+b`;
  const fit = isQuadratic ? "ax_{1}^2+bx_{1}+c" : isExponential ? "ab^{x_{1}}" : `${linearCoefficient}x_{1}+b`;
  const requested = target === "evaluate" ? `f(${at})` : target;
  const rows = [
    row(`x_{1}=[${xs.join(",")}]`, "Enter the x-values in the order shown."),
    row(`y_{1}=[${ys.join(",")}]`, "Enter each matching function value in the same position."),
    row(`y_{1}\\sim ${fit}`, `Fit the ${isQuadratic ? "quadratic" : isExponential ? "exponential" : "linear"} model to these points. Desmos reports the coefficients.`),
  ];
  if (target === "evaluate") rows.push(row(`f(x)=${model}`, "Define the function using the fitted coefficients."), row(`f(${at})`, "Evaluate the function at the requested input."));
  return finish(context, {
    question: `The ${isQuadratic ? "quadratic" : isExponential ? "exponential" : "linear"} function f(x) = ${model} satisfies ${xs.map((x, i) => `f(${x}) = ${ys[i]}`).join(", ")}. What is ${requested}?`,
    structure: `${isQuadratic ? "Three points on a quadratic" : isExponential ? "Values of an exponential function" : "Points on a line"}, asked for ${target === "evaluate" ? "another function value" : `coefficient ${target}`}.`,
    answer, rows, why: `The points determine the coefficients of this ${isQuadratic ? "quadratic" : isExponential ? "exponential" : "linear"} model. Fit them with the same regression technique as the original question.`,
    readAnswer: `Read ${requested}: ${format(answer)}.`,
    hint: `Put the inputs and outputs in matching lists. Use ~ to fit the ${isQuadratic ? "quadratic" : isExponential ? "exponential" : "linear"} model, then ${target === "evaluate" ? "define f(x) with those coefficients and evaluate the requested input" : `read ${target} from the regression results`}.`,
    feedback: `Check that both lists have matching positions and that the regression uses ${isQuadratic ? "a quadratic" : isExponential ? "an exponential" : "a linear"} model. ${target === "evaluate" ? "The question asks for a function value, not a fitted coefficient." : `The requested coefficient is ${target}.`}`,
  }, rng);
}

function radicalRoots(context: TutorContext, rng: Random): PracticeProblem {
  const q = questionOf(context), originalRows = rowsOf(context);
  if (!/sqrt|√|\\sqrt/.test(q + originalRows) || !/a\s*\+\s*b/.test(q) || !/\^2/.test(originalRows) || !/\\sim|~/.test(originalRows)) throw new UnsupportedPracticeError();
  const a = rng(2, 4), positiveB = rng(10, 19);
  let c = rng(1, 4), discriminant = positiveB ** 2 - 4 * a * c;
  for (let attempt = 0; attempt < 4 && (discriminant <= 0 || Number.isInteger(Math.sqrt(discriminant))); attempt++) {
    c = c % 4 + 1;
    discriminant = positiveB ** 2 - 4 * a * c;
  }
  invariant(discriminant > 0 && !Number.isInteger(Math.sqrt(discriminant)));
  const denominator = 2 * a;
  const high = (positiveB + Math.sqrt(discriminant)) / denominator;
  const low = (positiveB - Math.sqrt(discriminant)) / denominator;
  invariant(approximately(a * high * high - positiveB * high + c, 0));
  invariant(approximately(a * low * low - positiveB * low + c, 0));
  const shownHigh = Number(high.toFixed(9)), shownLow = Number(low.toFixed(9));
  invariant(Math.round(denominator * (shownHigh + shownLow) / 2) === positiveB);
  invariant(Math.round((denominator * (shownHigh - shownLow) / 2) ** 2) === discriminant);
  const answer = positiveB + discriminant;
  return finish(context, {
    question: `One solution of ${polynomial(a, -positiveB, c)} = 0 is (a + sqrt(b))/${denominator}, where a and b are integers. What is a + b?`,
    structure: "A quadratic root written with two unknown integers; match both root forms to the intercepts.", answer,
    rows: [row(`y=${polynomial(a, -positiveB, c)}`, `Graph the quadratic and click both x-intercepts. Their x-values are about ${shownHigh} and ${shownLow}.`),
      row(`[(a+\\sqrt{b})/${denominator},(a-\\sqrt{b})/${denominator}]\\sim[${shownHigh},${shownLow}]`, "Match the two root forms to the two intercepts together. Desmos fits a and b."),
      row("\\operatorname{round}(a)+\\operatorname{round}(b)", "Both parameters are integers. Round away the small error from the clicked intercept values, then add them.")],
    why: "Each x-intercept is one root. Fitting both root forms at once determines both integers without recalling the quadratic formula.",
    readAnswer: `The regression gives a ≈ ${positiveB} and b ≈ ${discriminant}. Their integer sum is ${answer}.`,
    hint: "Graph the quadratic and click both x-intercepts. Match the plus and minus root forms to those two x-values in one bracket regression.",
    feedback: "Use both roots in the same regression. Match the plus form to the larger intercept and the minus form to the smaller one; add the rounded integer parameters.",
    graphBounds: { left: -1, right: high + 1, bottom: -(positiveB ** 2) / (4 * a) + c - 3, top: c + 4 },
  }, rng);
}

function linearSystem(context: TutorContext, rng: Random): PracticeProblem {
  const q = questionOf(context), originalRows = rowsOf(context);
  if (/\^|sqrt|√|\\sqrt|\\sin|\\cos/.test(originalRows) || !/system|equations|intersection|intersect|meet/.test(q + " " + context.structure)) throw new UnsupportedPracticeError();
  if (context.rows.length < 2 && context.techniqueId !== "bracket-regression") throw new UnsupportedPracticeError();
  if (/\bz\b|x\s*\+\s*y\s*[+-]/.test(q)) throw new UnsupportedPracticeError();
  const compactRows = context.rows.map(item => compact(item.latex));
  if (context.techniqueId === "bracket-regression") {
    const fits = compactRows.filter(item => item.includes("~"));
    const fit = fits[0] && /^\[([^\[\]]+)\]~\[([^\[\]]+)\]$/.exec(fits[0]);
    if (fits.length !== 1 || !fit) throw new UnsupportedPracticeError();
    const left = fit[1].split(","), right = fit[2].split(",");
    if (left.length !== 2 || right.length !== 2 || ![...left, ...right].every(part => numericPolynomial(part, ["a", "b", "x_1", "y_1"], 1))) throw new UnsupportedPracticeError();
  } else {
    if (compactRows.length !== 2 || !compactRows.every(item => {
      const parts = item.split("=");
      return parts.length === 2 && parts.every(part => numericPolynomial(part, ["x", "y"], 1));
    })) throw new UnsupportedPracticeError();
  }
  const asked = /(?:what|find|determine)[^?]*\??\s*$/.exec(q)?.[0] ?? "";
  const target = /x\s*\+\s*y/.test(asked) ? "sum" : /(?:value of|coordinate|find|what is)\s*(?:the\s+)?y\b|y.coordinate/.test(asked) ? "y" : /(?:value of|coordinate|find|what is)\s*(?:the\s+)?x\b|x.coordinate/.test(asked) ? "x" : null;
  if (!target) throw new UnsupportedPracticeError();
  const x = rng(2, 9), y = rng(2, 15), m1 = rng(1, 4), m2 = -rng(1, 4);
  const b1 = y - m1 * x, b2 = y - m2 * x;
  const recoveredX = (b2 - b1) / (m1 - m2), recoveredY = m1 * recoveredX + b1;
  invariant(recoveredX === x && recoveredY === y && m1 !== m2);
  const requested = target === "sum" ? "x + y" : target;
  const answer = target === "sum" ? x + y : target === "x" ? x : y;
  const bracket = context.techniqueId === "bracket-regression";
  return finish(context, {
    question: `The equations y = ${line(m1, b1)} and y = ${line(m2, b2)} form a system. What is the value of ${requested} in its solution?`,
    structure: `Two intersecting lines, asked for ${requested} in their shared solution.`, answer,
    rows: bracket ? [row(`[${line(m1, b1, "a")},${line(m2, b2, "a")}]\\sim[b,b]`, "Use a for x and b for y so Desmos can fit both unknowns. The two entries represent the two complete equations."),
      row(target === "sum" ? "a+b" : target === "x" ? "a" : "b", `Read ${requested} using the fitted values.`)] : [row(`y=${line(m1, b1)}`, "Graph the first equation."), row(`y=${line(m2, b2)}`, "Graph the second equation and click the intersection.")],
    why: bracket ? "The bracket regression fits both complete equations at once. The fitted parameters give the shared solution." : "The intersection lies on both lines, so its coordinates satisfy both equations.",
    readAnswer: `The shared point is (${x}, ${y}). ${requested} = ${answer}.`,
    hint: bracket ? `Put the two equations into a bracket regression with a for x and b for y. Read ${requested} from the fitted values.` : `Graph both equations and click the intersection. ${target === "sum" ? "Add its two coordinates." : `Read the ${target}-coordinate.`}`,
    feedback: `Check both equations were entered exactly. ${target === "sum" ? "The question asks for the sum of the two coordinates." : `Read the ${target}-coordinate of the shared point.`}`,
    graphBounds: { left: -2, right: x + 4, bottom: -2, top: y + 6 },
  }, rng);
}

function intercept(context: TutorContext, rng: Random): PracticeProblem {
  const q = questionOf(context), rows = rowsOf(context);
  if (!/\^2/.test(rows) || /\^3|\\sim|~|sqrt|\\sqrt/.test(rows)) throw new UnsupportedPracticeError();
  if (context.rows.length !== 1 || !numericPolynomial(compact(context.rows[0].latex).replace(/^(?:y|[fgh]\(x\))=/, ""), ["x"], 2)) throw new UnsupportedPracticeError();
  const targetText = /(?:what|find|determine|calculate)[^?]*\??\s*$/.exec(q)?.[0] ?? q;
  const target = /positive|greater|larger|greatest|largest/.test(targetText) ? "larger" : /negative|smaller|least|smallest/.test(targetText) ? "smaller" : null;
  if (!target || !/solution|root|zero|intercept/.test(q)) throw new UnsupportedPracticeError();
  const low = -rng(1, 9), high = rng(1, 9), a = rng(1, 4);
  const b = -a * (low + high), c = a * low * high;
  invariant(a * low ** 2 + b * low + c === 0 && a * high ** 2 + b * high + c === 0);
  const answer = target === "larger" ? high : low;
  return finish(context, {
    question: `What is the ${target === "larger" ? "positive" : "negative"} solution of ${polynomial(a, b, c)} = 0?`,
    structure: `A quadratic equation, asked for its ${target === "larger" ? "positive" : "negative"} root.`, answer,
    rows: [row(`y=${polynomial(a, b, c)}`, "Graph the left side. Click its x-intercepts, where the expression equals zero.")],
    why: "An x-intercept has y = 0, so its x-coordinate solves the equation.",
    readAnswer: `The intercepts are (${low}, 0) and (${high}, 0). The requested solution is ${answer}.`,
    hint: `Graph the left side as y. Click the x-intercept on the ${target === "larger" ? "positive" : "negative"} side of the x-axis.`,
    feedback: `Use an x-intercept, not the vertex or y-intercept. This question asks for the ${target === "larger" ? "positive" : "negative"} solution.`,
    graphBounds: { left: low - 2, right: high + 2, bottom: a * (low + high) ** 2 / 4 + b * (low + high) / 2 + c - 3, top: 8 },
  }, rng);
}

function vertex(context: TutorContext, rng: Random): PracticeProblem {
  const q = questionOf(context), rows = rowsOf(context);
  if (!/\^2/.test(rows) || /\^3|\{|restriction|domain|interval/.test(q) || /\\left\\\{|\\\{/.test(rows)) throw new UnsupportedPracticeError();
  if (context.rows.length !== 1 || !numericPolynomial(compact(context.rows[0].latex).replace(/^(?:y|[fgh]\(x\))=/, ""), ["x"], 2)) throw new UnsupportedPracticeError();
  const maximum = /maximum/.test(q), minimum = /minimum/.test(q);
  if (!maximum && !minimum) throw new UnsupportedPracticeError();
  const asksX = /(?:value of x|x.coordinate|at what|which value of x)/.test(q);
  const h = rng(1, 8), k = signed(rng, 2, 15), a = (maximum ? -1 : 1) * rng(1, 3), b = -2 * a * h, c = a * h ** 2 + k;
  invariant(-b / (2 * a) === h && a * h * h + b * h + c === k);
  const answer = asksX ? h : k;
  return finish(context, {
    question: asksX ? `For what value of x does f(x) = ${polynomial(a, b, c)} reach its ${maximum ? "maximum" : "minimum"}?` : `What is the ${maximum ? "maximum" : "minimum"} value of f(x) = ${polynomial(a, b, c)}?`,
    structure: `A quadratic function, asked for the ${asksX ? "input at its" : "value of its"} ${maximum ? "maximum" : "minimum"}.`, answer,
    rows: [row(`y=${polynomial(a, b, c)}`, `Graph the parabola and click its ${maximum ? "highest" : "lowest"} point.`)],
    why: `The vertex is the ${maximum ? "highest" : "lowest"} point of this parabola.`,
    readAnswer: `The vertex is (${h}, ${k}). Read its ${asksX ? "x" : "y"}-coordinate: ${answer}.`,
    hint: `Click the ${maximum ? "highest" : "lowest"} point on the parabola. The question asks for its ${asksX ? "x" : "y"}-coordinate.`,
    feedback: `Check which coordinate is requested. ${asksX ? "The input where the extreme occurs is the x-coordinate." : "The extreme function value is the y-coordinate."}`,
    graphBounds: { left: h - 5, right: h + 5, bottom: k - (maximum ? 20 : 4), top: k + (maximum ? 4 : 20) },
  }, rng);
}

function functionEvaluation(context: TutorContext, rng: Random): PracticeProblem {
  const rows = rowsOf(context), target = targetOf(context, ["evaluate"]);
  if (!target || /\\sim|~|\\frac|sqrt|\\sqrt|\^3|sin|cos|tan/.test(rows) || !/(?:f|g|h)\(x\)\s*=/.test(rows)) throw new UnsupportedPracticeError();
  const definitions = context.rows.map(item => compact(item.latex)).filter(item => /^(?:f|g|h)\(x\)=/.test(item));
  if (definitions.length !== 1 || !numericPolynomial(definitions[0].split("=")[1], ["x"], 2)) throw new UnsupportedPracticeError();
  const quadratic = /\^2/.test(rows), a = rng(1, 5), b = signed(rng), c = signed(rng), at = rng(2, 9);
  const expression = quadratic ? polynomial(a, b, c) : line(a, b);
  const answer = quadratic ? a * at ** 2 + b * at + c : a * at + b;
  const independent = quadratic ? at * (a * at + b) + c : b + at * a;
  invariant(answer === independent);
  return finish(context, {
    question: `The function f is defined by f(x) = ${expression}. What is f(${at})?`, structure: `A ${quadratic ? "quadratic" : "linear"} function, asked for its value at a specified input.`, answer,
    rows: [row(`f(x)=${expression}`, "Define the function exactly as given."), row(`f(${at})`, "Enter the requested input and read the output.")],
    why: "Desmos evaluates the defined function at the requested input.", readAnswer: `Read f(${at}) = ${answer}.`,
    hint: "Define f(x) as given, then enter f with the requested number inside the parentheses.",
    feedback: "Enter the requested number as the function input. Read the output of that evaluation, not a coefficient from the definition.",
  }, rng);
}

function statistics(context: TutorContext, rng: Random): PracticeProblem {
  const q = questionOf(context), rows = rowsOf(context);
  const asked = /(?:what|find|determine|calculate)[^?]*\??\s*$/.exec(q)?.[0] ?? q;
  const statistic = /median/.test(asked) && !/mean/.test(asked) ? "median" : /mean/.test(asked) && !/median/.test(asked) ? "mean" : null;
  if (statistic && !rows.includes(statistic)) throw new UnsupportedPracticeError();
  if (!statistic || /frequency|weighted|added|removed|replace|combined|missing|unknown/.test(q)) throw new UnsupportedPracticeError();
  const values = Array.from({ length: 5 }, () => rng(2, 30));
  const sorted = [...values].sort((a, b) => a - b), sum = values.reduce((a, b) => a + b, 0);
  const answer = statistic === "median" ? sorted[2] : sum / values.length;
  invariant(statistic === "median" ? sorted[1] <= answer && sorted[3] >= answer : approximately(answer * 5, sum));
  return finish(context, {
    question: `The data set is ${values.join(", ")}. What is its ${statistic}?`, structure: `A list of observations, asked for its ${statistic}.`, answer,
    rows: [row(`\\operatorname{${statistic}}([${values.join(",")}])`, `Put the observations inside a list and use the ${statistic} built-in.`)],
    why: `Desmos has a built-in function for the ${statistic} of a list.`, readAnswer: `The ${statistic} is ${format(answer)}.`,
    hint: `Use the ${statistic} built-in with all observations inside square brackets.`,
    feedback: `Check every value is present, including repeats. The question asks for the ${statistic}, ${statistic === "mean" ? "which uses all values" : "which is the middle value after ordering"}.`,
  }, rng);
}

function coordinates(context: TutorContext, rng: Random): PracticeProblem {
  const q = questionOf(context), distance = context.techniqueId === "distance-builtin";
  const targetText = /(?:what|find|determine|calculate)[^?]*\??\s*$/.exec(q)?.[0] ?? q;
  const target = /x.coordinate/.test(targetText) ? "x" : /y.coordinate/.test(targetText) ? "y" : null;
  const number = "[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)";
  const directCall = new RegExp(`^(?:distance|midpoint)\\(\\(${number},${number}\\),\\(${number},${number}\\)\\)$`);
  if (context.rows.length !== 1 || !directCall.test(compact(context.rows[0].latex).replace(/\\operatorname/g, ""))) throw new UnsupportedPracticeError();
  if (distance ? !/distance|length/.test(targetText) || /diameter|circumference|area/.test(targetText) : !/[xy].coordinate of (?:the )?midpoint/.test(targetText) || !target) throw new UnsupportedPracticeError();
  const x = signed(rng), y = signed(rng), scale = rng(1, 4), dx = 3 * scale, dy = 4 * scale;
  const x2 = x + dx, y2 = y + dy;
  const answer = distance ? 5 * scale : target === "x" ? (x + x2) / 2 : (y + y2) / 2;
  invariant(distance ? answer ** 2 === dx ** 2 + dy ** 2 : target === "x" ? 2 * answer - x === x2 : 2 * answer - y === y2);
  return finish(context, {
    question: distance ? `What is the distance between (${x}, ${y}) and (${x2}, ${y2})?` : `What is the ${target}-coordinate of the midpoint of the segment with endpoints (${x}, ${y}) and (${x2}, ${y2})?`,
    structure: `Two points, asked for ${distance ? "their distance" : "a coordinate of their midpoint"}.`, answer,
    rows: [row(`\\operatorname{${distance ? "distance" : "midpoint"}}((${x},${y}),(${x2},${y2}))`, `Use the two ordered pairs in the ${distance ? "distance" : "midpoint"} built-in.`)],
    why: `The ${distance ? "distance" : "midpoint"} built-in handles the coordinate calculation directly.`,
    readAnswer: distance ? `The distance is ${answer}.` : `The midpoint is (${(x + x2) / 2}, ${(y + y2) / 2}). Read its ${target}-coordinate: ${answer}.`,
    hint: `Use ${distance ? "distance" : "midpoint"} with the two ordered pairs. ${distance ? "Read the number it returns." : `Read the ${target}-coordinate of the returned point.`}`,
    feedback: `Keep each point’s x and y together. ${distance ? "Use distance between the two complete points." : `The question asks for the midpoint’s ${target}-coordinate.`}`,
  }, rng);
}

/** Strict matching: an unsupported shape never falls back to a different SAT problem. */
export function generatePracticeProblem(context: TutorContext, options: { random?: Random; previousQuestion?: string } = {}): PracticeProblem {
  const rng: Random = options.random ?? ((min, max) => randomInt(min, max + 1));
  const generate = () => {
    const extra = generateExtendedPractice(context, rng, data => finish(context, data, rng));
    if (extra) return extra;
    switch (context.techniqueId) {
      case "linear-regression": case "three-point-regression": case "exponential-regression": return regression(context, rng);
      case "bracket-regression": return /sqrt|√|\\sqrt/.test(questionOf(context) + rowsOf(context)) ? radicalRoots(context, rng) : linearSystem(context, rng);
      case "graph-both-sides": return linearSystem(context, rng);
      case "intercept-read": return intercept(context, rng);
      case "vertex-read": return vertex(context, rng);
      case "function-evaluation": return functionEvaluation(context, rng);
      case "statistics-builtin": return statistics(context, rng);
      case "distance-builtin": case "midpoint-builtin": return coordinates(context, rng);
      default: throw new UnsupportedPracticeError();
    }
  };
  for (let attempt = 0; attempt < 12; attempt++) {
    const generated = generate();
    if (normalized(generated.exercise.question) !== normalized(context.question) && generated.exercise.question !== options.previousQuestion) return generated;
  }
  throw new Error("A fresh practice problem could not be prepared. Try again.");
}

/** Numbers/fractions only: deliberately no eval, expression parser, or units guessing. */
export function parsePracticeNumber(input: string): number | null {
  const text = input.trim().replace(/[−–]/g, "-").replace(/⁄|÷/g, "/");
  const decimal = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
  const fraction = new RegExp(`^(${decimal})\\s*/\\s*(${decimal})$`).exec(text);
  if (fraction) {
    const numerator = Number(fraction[1]), denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    const value = numerator / denominator;
    return Number.isFinite(value) ? value : null;
  }
  if (!new RegExp(`^${decimal}$`).test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function gradePracticeAnswer(problem: PracticeProblem, input: string): PracticeGrade | null {
  const choice = input.trim().toUpperCase().replace(/^\(([A-D])\)$/, "$1");
  let correct: boolean;
  if (problem.correctChoice && /^[A-D]$/.test(choice)) {
    correct = choice === problem.correctChoice;
  } else {
    const value = parsePracticeNumber(input);
    if (value === null) return null;
    // All generated answers are exact integers or terminating halves/fifths;
    // this tiny tolerance covers representation error, not nearby guesses.
    correct = Math.abs(value - problem.answer) <= 1e-9 * Math.max(1, Math.abs(problem.answer));
  }
  return { correct, feedback: correct ? "That’s correct. You can view the calculator steps or try another question using this technique." : problem.feedback };
}
