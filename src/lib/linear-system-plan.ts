/**
 * A system in its own unknowns, 7x+4y+8z=61 and 4x+y+5z=37, asking for one
 * value or combination such as x+y+z (library strategy 79, gold 016). The
 * Desmos way copies the equations into one bracket regression and reads the
 * combination on the next line:
 *
 *   [7x_{1}+4y_{1}+8z,4x_{1}+y_{1}+5z]\sim[61,37]
 *   x_{1}+y_{1}+z
 *
 * Three unknowns cannot be graphed in the 2D calculator, and with fewer
 * equations than unknowns each value is free while the combination is not,
 * so the alternative is elimination or arithmetic by hand. The server builds
 * this plan whenever the structure is unambiguous and exact linear algebra
 * shows the requested value is fixed, so the Desmos way never depends on the
 * model noticing it. Two equations in two unknowns stay with the model: they
 * graph as two lines, and clicking the intersection is the simpler trick.
 */
import { repairProseText } from "./answer-consistency";
import { affineForm, determinedValue, differenceForm, formatRational, parseDecimal, toNumber, type AffineForm, type NameRole } from "./linear-forms";
import type { Explanation } from "./solve-cache";
import { asksForDeterminedValue, type Candidate } from "./strategy-selection";

const NUMBER = String.raw`\d+(?:\.\d+)?`;
// A lone letter: not part of a word, a command, a subscripted name, or a function call.
const UNKNOWN = String.raw`(?<![A-Za-z\\_])[a-z](?![A-Za-z_(])`;
const TERM = String.raw`(?:${NUMBER}\s*)?${UNKNOWN}|${NUMBER}(?![\d.]|\s*[A-Za-z(])`;
const SIDE = String.raw`[-+]?\s*(?:${TERM})(?:\s*[-+]\s*(?:${TERM}))*`;
// The match must not continue an expression on either side: \frac{1}{2}x+3y=7
// is not the equation 3y=7, and 61 + 2y is not the number 61.
const EQUATION = new RegExp(
  String.raw`(?<![\w.}\])\\^])(?<![-+*/^=({]\s*)(${SIDE})\s*=\s*(-?\s*${NUMBER})(?![A-Za-z\d(]|\.\d|\s*[-+*/^=(])`,
  "g",
);
const TARGET = /\bvalue\s+of\s+(?:the\s+expression\s+)?([^?]+?)\s*\?/i;
// e is Desmos's constant, i its imaginary unit, and t a parametric variable.
const RESERVED = /^[eit]$/;

export type LinearSystem = {
  equations: { left: string; right: string; condition: AffineForm }[];
  unknowns: string[];
};

function normalize(question: string): string {
  return question.replace(/[−–]/g, "-").replace(/\$/g, "").replace(/\\\\/g, "\n");
}

/**
 * The linear equations printed in the question, each "affine in one-letter
 * unknowns = number", or null when there are fewer than two, more than three,
 * or a letter Desmos reserves.
 */
export function parseLinearSystem(question: string): LinearSystem | null {
  const text = normalize(question);
  const letters = new Set<string>();
  const seen = new Set<string>();
  const equations: LinearSystem["equations"] = [];
  for (const match of text.matchAll(EQUATION)) {
    const left = match[1].replace(/\s+/g, "");
    const right = match[2].replace(/\s+/g, "");
    if (seen.has(`${left}=${right}`)) continue;
    seen.add(`${left}=${right}`);
    for (const letter of left.match(/[a-z]/g) ?? []) letters.add(letter);
    const form = affineForm(left, (name) => (/^[a-z]$/.test(name) ? "variable" : null));
    if (!form || form.terms.size === 0) return null;
    equations.push({ left, right, condition: differenceForm(form, { constant: parseDecimal(right), terms: new Map() }) });
  }
  const unknowns = [...letters].sort();
  if (equations.length < 2 || equations.length > 3 || unknowns.length < 2 || unknowns.some((name) => RESERVED.test(name))) return null;
  return { equations, unknowns };
}

/** Too many unknowns to graph in 2D, or more unknowns than the equations can fix one by one. */
export function needsSystemRegression(system: Pick<LinearSystem, "equations" | "unknowns">): boolean {
  return system.unknowns.length >= 3 || system.equations.length < system.unknowns.length;
}

/** x and y are the graph's axes in Desmos, so the system's own x and y are typed x_{1} and y_{1}. */
function desmosRow(text: string): string {
  return text.replace(/\s+/g, "").replace(/(?<![A-Za-z\\_])([xy])(?![A-Za-z_])/g, "$1_{1}");
}

/** The same rename as plain text for the explanation: x_1, not x_{1}. */
function proseNames(text: string): string {
  return text.replace(/(?<![A-Za-z\\_])([xy])(?![A-Za-z_])/g, "$1_1");
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six"];
const word = (count: number) => WORDS[count] ?? String(count);

function series(names: readonly string[]): string {
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}

export type LinearSystemPlan = { candidate: Candidate; explanation: Explanation; structure: string; supportsChoices: true };

export function linearSystemPlan(question: string): LinearSystemPlan | null {
  const system = parseLinearSystem(question);
  if (!system || !needsSystemRegression(system) || !asksForDeterminedValue(question)) return null;
  const targetText = normalize(question).match(TARGET)?.[1]?.trim();
  if (!targetText) return null;
  const unknowns = new Set(system.unknowns);
  const role: NameRole = (name) => (unknowns.has(name) ? "variable" : null);
  const target = affineForm(targetText, role);
  if (!target || target.terms.size === 0) return null;
  const value = determinedValue(system.equations.map((equation) => equation.condition), target);
  if (!value) return null;

  const count = system.equations.length;
  const fewer = count < system.unknowns.length;
  const answer = formatRational(value);
  const asked = repairProseText(targetText).replace(/\s+/g, " ");
  const fitted = series(system.unknowns.map(proseNames));
  const renamed = system.unknowns.filter((name) => name === "x" || name === "y");
  const kept = system.unknowns.filter((name) => name !== "x" && name !== "y");
  const rows = [
    `[${system.equations.map((equation) => desmosRow(equation.left)).join(",")}]\\sim[${system.equations.map((equation) => equation.right).join(",")}]`,
    desmosRow(targetText),
  ];
  const candidate: Candidate = {
    techniqueId: "bracket-regression",
    strategy: 79,
    rung: 4,
    rows: rows.map((latex) => ({ latex, slider: null, copiesRow: null })),
    answer,
    result: {
      type: "numeric",
      row: 2,
      relatedRows: [1],
      value: toNumber(value),
      listIndex: null,
      answerFrom: "value",
      choiceLabel: null,
      detail: fewer ? `the value of ${asked}, the same for every solution of the system` : `the value of ${asked}`,
    },
    answerState: null,
    parameters: [],
    conditionType: null,
    distinguishes: null,
    graphBounds: null,
    cost: { derivationSteps: 0, newPrimitives: 0, oneOffFacts: 0, setupConstructions: 0, manualIterations: 0 },
  };
  const renameNote = renamed.length
    ? `Desmos uses x and y for the graph's axes, so ${series(renamed)} ${renamed.length === 1 ? "is" : "are"} typed as ${series(renamed.map((name) => `${name}_1`))}${kept.length ? `; ${series(kept)} ${kept.length === 1 ? "stays" : "stay"} as printed` : ""}. `
    : "";
  const explanation: Explanation = {
    why:
      `Desmos can solve several equations at once with one regression. Put the left sides of the ${word(count)} equations in one list and their right sides in another, in the same order, and join the lists with ~: Desmos adjusts ${series(system.unknowns)} until every equation holds. ` +
      (system.unknowns.length >= 3 ? `${word(system.unknowns.length).replace(/^./, (letter) => letter.toUpperCase())} unknowns cannot be graphed in the 2D calculator, so this regression takes the place of clicking an intersection. ` : "") +
      (fewer
        ? `With fewer equations than unknowns, ${series(system.unknowns)} are not each fixed, and Desmos settles on just one of the many solutions. Every solution gives the same ${asked}, so the next line computes it from the fitted values, with no elimination by hand.`
        : `The equations fix every unknown, so the next line computes ${asked} from the fitted values, with no elimination by hand.`),
    handMath: null,
    readAnswer: fewer
      ? `Read line 2: ${asked} = ${answer}. The separate values Desmos lists under line 1 are only one of the many solutions, so read the answer from line 2, not from them.`
      : `Read line 2: ${asked} = ${answer}.`,
    steps: [],
    purposes: [
      `Copies the ${word(count)} equations into one regression: each left side goes in the first list and its right side in the same position in the second. ${renameNote}Desmos adjusts ${fitted} until the two lists match, which makes every equation true.`,
      fewer
        ? `Computes ${proseNames(asked)} from the fitted values. Every solution of the system gives this same value, so it is the answer even though the fitted values on their own are not unique.`
        : `Computes ${proseNames(asked)} from the fitted values: the quantity the question asks for.`,
    ],
  };
  const structure = fewer
    ? `${word(count).replace(/^./, (letter) => letter.toUpperCase())} linear equations in ${word(system.unknowns.length)} unknowns: more unknowns than equations, asking for one combination every solution shares.`
    : `${word(count).replace(/^./, (letter) => letter.toUpperCase())} linear equations in ${word(system.unknowns.length)} unknowns, too many to graph in 2D, asking for one value.`;
  return { candidate, explanation, structure, supportsChoices: true };
}
