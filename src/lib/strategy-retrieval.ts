import { constrainedPolynomial } from "./constrained-polynomial";
import type { GoldSolution } from "./gold-solutions";
import type { AnswerChoice } from "./solver-schema";
import { hasKnownRootCue, hasSimilarityCue } from "./geometry-grounding";
import { isTechniqueId, TECHNIQUE_ANNOTATION, type TechniqueId } from "./technique-vocabulary";

/** Bump when trigger recipes or hint generation change, even if library text does not. */
export const RETRIEVAL_VERSION = "structure-shortlist-v4-student-math";

/** Prompt-only discovery aid. Retrieval never certifies an answer or selects a winner. */
export const SHORTCUT_CHALLENGE_INSTRUCTIONS = `Before returning candidates, challenge the first workable method: can an original equation, graph feature, identity fit, shared zero, invariant, or choice list remove student algebra? Compare genuinely different representations internally. Compare each complete workflow: original-entry setup, hidden derivation, manual adjustments, visual interpretation, and direct readout. Do not rank families in a fixed order or count an answer-seeded slider as automatic discovery. Return 2–4 useful, distinct methods when available, not every vocabulary variation of the same setup; keep the reliable method requiring the least student mathematical reasoning and the optional simplest paper alternative. Do not pad. A fifth or sixth method is appropriate only when it teaches a materially different useful approach. Retain all correctness checks: a fitted branch, a few samples, or rounded residuals alone do not prove a universal claim. Do not report your internal exploration as extra explanation.
For polynomial identities with unknown coefficients, compare fitting the ORIGINAL sides over distinct inputs with choosing a special value to reveal the requested coefficient combination. The special-value insight is student math even if it saves rows. Prefer the original identity fit when it removes that insight; verify degree, identifiability, and the full original identity internally. A data list and final readout are useful work, not padding.
For constraints plus a target expression, compare fitting the ORIGINAL constraints and evaluating the ORIGINAL target against manually isolating a variable, substituting it repeatedly, or expanding. Prove the target is constant across the entire allowed solution space before using an underdetermined fit; RMSE=0 or a few samples cannot establish invariance. Count the algebra required to construct rows, not just the number of rows. Do not ask the student to derive an identity used internally for verification.
For a geometry diagram, preserve explicit point connections, point order, angle markings, and given lengths in the transcription; distinguish these from deductions. Before building a coordinate construction, investigate whether justified triangle similarity gives corresponding-side proportions that a scalar regression can solve (strategies 61/73). Establish the vertex correspondence first. Do not infer right angles or a circle from an unmarked crossing, or equal lengths/angles from visual appearance. For known roots and unknown polynomial coefficients, investigate bracketed zero-output constraints on the original polynomial; check identifiability and all stated domains before accepting a fitted value.`;

export type IndexedStrategy = {
  number: number;
  title: string;
  techniques: TechniqueId[];
  /** Exact curated source, including the strategy heading and annotations. */
  body: string;
  triggers: string[];
  prerequisites: string[];
  counterexamples: string[];
};

export type StrategyRetrievalIndex = {
  strategies: IndexedStrategy[];
  preamble: string;
  footer: string;
  fullLibrary: string;
  goldSolutions: readonly GoldSolution[];
};

const IDENTITY_PREREQUISITES = "For a degree-d polynomial identity use at least d+1 distinct valid inputs, and enough independent conditions to identify the requested quantity. Check the original identity exactly internally.";
const IDENTITY_COUNTEREXAMPLE = "A periodic function can have infinitely many zeros without being identically zero. Rounded RMSE=0, redundant parameters, and a few arbitrary samples are not proofs.";
const INVARIANT_PREREQUISITES = "An underdetermined fit may answer only a quantity proven constant across every allowed solution; prove that invariance exactly internally and respect all domains and constraints.";
const INVARIANT_COUNTEREXAMPLE = "One convenient fitted pair or one nonlinear branch cannot establish that the requested expression is invariant or unique.";
const ROOT_PREREQUISITES = "Fit both conjugate forms to both correctly ordered graph roots. Clicked root decimals and fitted constants are approximate; verify any claimed exact integers against the original equation.";
const ROOT_COUNTEREXAMPLE = "One clicked root does not identify two free parameters. Rounding fitted parameters is justified only by stated integer constraints and an independent exact check.";

function safeguards(techniques: readonly TechniqueId[], number: number) {
  const prerequisites: string[] = [];
  const counterexamples: string[] = [];
  if (techniques.includes("identity-regression")) {
    prerequisites.push(IDENTITY_PREREQUISITES);
    counterexamples.push(IDENTITY_COUNTEREXAMPLE);
  }
  if (techniques.includes("bracket-regression") || number === 79) {
    prerequisites.push(INVARIANT_PREREQUISITES);
    counterexamples.push(INVARIANT_COUNTEREXAMPLE);
  }
  if (number === 78) {
    prerequisites.push(ROOT_PREREQUISITES);
    counterexamples.push(ROOT_COUNTEREXAMPLE);
  }
  return { prerequisites, counterexamples };
}

/** Numbered instructions inside an example or the routing footer are not strategies. */
export function buildRetrievalIndex(library: string, goldSolutions: readonly GoldSolution[] = []): StrategyRetrievalIndex {
  const lines = library.split("\n");
  const starts: { number: number; title: string; line: number }[] = [];
  for (let line = 0; line < lines.length; line++) {
    const heading = lines[line].match(/^(\d+)\. (\S.*)$/);
    if (heading && Number(heading[1]) === starts.length + 1 && TECHNIQUE_ANNOTATION.test(lines[line + 1] ?? "")) {
      starts.push({ number: Number(heading[1]), title: heading[2].trim(), line });
    }
  }
  // These cross-cutting rules follow the last strategy and must survive every subset.
  const lastStart = starts.at(-1)?.line ?? lines.length;
  const footerStart = lines.findIndex((line, i) => i > lastStart && /^(?:REGRESSION SAFETY|DESMOS-FIRST ROUTING|WRITTEN FALLBACKS|OUTPUT CONTRACT|SYNTAX SAFETY)$/.test(line));
  const bodyEnd = footerStart < 0 ? lines.length : footerStart;
  const strategies = starts.map((start, index): IndexedStrategy => {
    const body = lines.slice(start.line, starts[index + 1]?.line ?? bodyEnd).join("\n");
    const techniques = [...new Set(body.split("\n").flatMap(line => {
      const match = line.match(TECHNIQUE_ANNOTATION);
      return match && isTechniqueId(match[1]) ? [match[1]] : [];
    }))];
    const paragraphs = body.split(/\n\s*\n/).map(text => text.replace(/\s+/g, " ").trim());
    const triggers = paragraphs.filter(text => /^(?:High-priority trigger:|Trigger:|Use when:?|If the SAT|If a |When the )/i.test(text));
    const rules = safeguards(techniques, start.number);
    return {
      number: start.number, title: start.title, techniques, body, triggers,
      prerequisites: [...rules.prerequisites, ...paragraphs.filter(text => /^(?:Use at least|Before accepting|Report the requested)/i.test(text))],
      counterexamples: [...rules.counterexamples, ...paragraphs.filter(text => /^(?:Do NOT:|BAD,|Never |Do not present|Avoid )/i.test(text))],
    };
  });
  return {
    strategies, preamble: lines.slice(0, starts[0]?.line ?? lines.length).join("\n"),
    footer: footerStart < 0 ? "" : lines.slice(footerStart).join("\n"), fullLibrary: library,
    goldSolutions: goldSolutions.filter(solution => !solution.needs_review),
  };
}

type Recipe = { id: string; strategies: readonly number[]; matches: (question: string) => boolean; hypothesis?: boolean; guidance?: string };
// IDs point to curated methods, never to benchmark cases, coefficient values, or answers.
const RECIPES: readonly Recipe[] = [
  {
    id: "similarity-proportions", strategies: [61, 73, 79, 3, 4, 17], hypothesis: true,
    matches: hasSimilarityCue,
    guidance: "Search hypothesis: similar triangles -> corresponding sides -> a proportion -> a scalar regression. First establish similarity from the stated angle markings, collinearity, parallel lines, or other givens. Name the vertex correspondence in order; then keep corresponding lengths in the same order on both sides of the proportion. Fit the requested positive length directly instead of cross-multiplying by hand or reconstructing every point. Equal-looking angles alone do not prove similarity. A crossing is not a right angle; intersecting segments do not imply a circle or a chord theorem. If correspondence is genuinely unreadable, identify the missing fact. Never invent it. Use a non-coordinate fitted variable, not bare x or y.",
  },
  {
    id: "known-roots-coefficients", strategies: [61, 79, 73, 17, 9, 75], hypothesis: true,
    matches: hasKnownRootCue,
    guidance: "Search hypothesis: known roots supply zero-output constraints on the ORIGINAL polynomial. Compare a bracket regression of those conditions with factoring. Count independent constraints and free coefficients: two roots alone do not identify three coefficients. Encode any integer/bound conditions and justify a requested minimum over the entire allowed domain; do not call an arbitrary fitted branch unique or prove a minimum by a few slider trials.",
  },
  { id: "polynomial-identity", strategies: [59, 60, 72, 73, 61, 74], matches: q => /\b(?:identity|equivalent|true for (?:all|every)|for (?:all|every) (?:real )?(?:numbers?|values|x)|infinitely many solutions)\b/i.test(q) && !/\b(?:sin|cos|tan|periodic)\b/i.test(q) },
  { id: "radical-root-form", strategies: [78, 61, 73, 9, 3, 17], matches: q => /\b(?:root|solution|zero)s?\b/i.test(q) && /(?:written|in the form|of the form)/i.test(q) && /(?:sqrt|\\sqrt|√)/.test(q) },
  { id: "factor-shared-zero", strategies: [75, 72, 59, 65, 57, 22, 9], matches: q => /\b(?:is|as|has) a factor(?: of)?\b|\bfactors of\b/i.test(q) },
  { id: "solution-count", strategies: [57, 76, 61, 8, 13, 73, 79], matches: q => /\b(?:no solutions?|exactly one (?:real )?(?:solution|point)|parallel|tangent)\b/i.test(q) },
  { id: "simultaneous-equations", strategies: [79, 61, 73, 5, 1, 2], matches: q => (q.match(/=/g)?.length ?? 0) >= 2 && /\b(?:system|equations|solution|constants)\b/i.test(q) },
  { id: "invariant-target", strategies: [79, 73, 61, 59, 60, 74], matches: q => /\b(?:invariant|regardless|same value|every solution|fixed value)\b/i.test(q) },
  {
    id: "constrained-target", strategies: [79, 73, 61, 59, 60, 74], hypothesis: true,
    matches: q => constrainedPolynomial(q) !== null,
    guidance: "Search hypothesis only: original affine constraints plus a polynomial target. First prove the target is determined for every allowed solution. Then fit the original equations directly (bracket matching sides for multiple equations) and evaluate the unchanged target with safe fitted variable names. Compare this with rearrangement, repeated substitution and expansion, including their construction and typing burden. It may vary; two valid pairs with different targets disprove uniqueness. Do not assert an invariant from this match, a fitted pair or RMSE=0.",
  },
  { id: "exponential-data", strategies: [16, 41, 61, 17, 24, 40], matches: q => /\bexponential\b/i.test(q) && /\b(?:table|points?|values?|model|function)\b/i.test(q) },
  { id: "quadratic-data", strategies: [15, 18, 17, 61, 24, 73], matches: q => /\bquadratic\b/i.test(q) && /\b(?:table|points?|values)\b/i.test(q) },
  { id: "linear-data", strategies: [14, 30, 32, 24, 61, 17], matches: q => /\b(?:linear|line of best fit)\b/i.test(q) && /\b(?:table|points?|values?|data)\b/i.test(q) },
  { id: "bounded-extremum", strategies: [12, 10, 71, 24, 58, 77], matches: q => /\b(?:maximum|minimum|greatest|least)\b/i.test(q) && /\b(?:function|graph|interval|domain)\b/i.test(q) },
  { id: "integer-search", strategies: [65, 22, 20, 21, 56, 67], matches: q => /\b(?:integer solutions?|how many (?:positive |negative )?integers?|greatest (?:possible )?integer|least (?:possible )?integer)\b/i.test(q) },
  { id: "statistics", strategies: [45, 46, 47, 48, 66, 23, 77], matches: q => /\b(?:mean|median|standard deviation|frequency)\b/i.test(q) },
  { id: "inequality", strategies: [27, 28, 29, 20, 21, 65], matches: q => /\b(?:inequality|inequalities)\b/i.test(q) },
  { id: "circle", strategies: [35, 36, 37, 7, 49, 50, 52], matches: q => /\bcircle\b/i.test(q) },
  { id: "direct-equation", strategies: [3, 4, 2, 1, 62, 21, 77], matches: q => /\b(?:solve|solution|value of x)\b/i.test(q) && /=/.test(q) && !/\b(?:identity|constants?|parameter|system|integer|infinitely|no solution|exactly one|satisfy|obey)\b/i.test(q) },
];

const STOP_WORDS = new Set("a an and are as at be by can could do does find for from given has have how if in is it its of on one or question should than that the their then there these they this to two use value values what when where which with x y".split(" "));
function keywords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z]{3,}/g) ?? []).filter(word => !STOP_WORDS.has(word)).map(word => word.replace(/s$/, "")));
}
function overlap(query: ReadonlySet<string>, text: string): number {
  return [...keywords(text)].reduce((score, word) => score + Number(query.has(word)), 0);
}

export type StrategyRetrieval = {
  strategyIds: number[];
  techniques: TechniqueId[];
  structures: string[];
  confidence: "high" | "medium" | "low";
  fallback: boolean;
  focusHint: string;
  focusedLibrary: string;
  selectedGoldPrompt: string;
};

export function retrieveStrategies(index: StrategyRetrievalIndex, question: string, choices: readonly AnswerChoice[] | null = null): StrategyRetrieval {
  const normalized = question.replace(/[−–]/g, "-");
  const recipes = RECIPES.filter(recipe => recipe.matches(normalized));
  const query = keywords(`${normalized} ${choices?.map(choice => choice.text).join(" ") ?? ""}`);
  const scores = index.strategies.map(strategy => ({
    strategy,
    score: recipes.reduce((total, recipe) => {
      const rank = recipe.strategies.indexOf(strategy.number);
      return total + (rank < 0 ? 0 : 30 - rank * 2);
    }, 0) + Math.min(8, overlap(query, `${strategy.title} ${strategy.triggers.join(" ")}`)),
  })).sort((a, b) => b.score - a.score || a.strategy.number - b.strategy.number);
  // A negated trigger or several unrelated families make a narrow subset unsafe.
  const negatedTrigger = /\b(?:not|never)\s+(?:an?\s+)?(?:identity|equivalent|factor)\b/i.test(normalized);
  const fallback = recipes.length === 0 || recipes.length > 3 || negatedTrigger || index.strategies.length < 5;
  const confidence: StrategyRetrieval["confidence"] = fallback ? "low" : recipes.length > 1 || recipes.some(recipe => recipe.hypothesis) ? "medium" : "high";
  const relevant = scores.filter(item => item.score > 0);
  const count = Math.min(10, Math.max(5, recipes.length === 1 ? 7 : 9));
  const selected = (relevant.length >= 5 ? relevant : scores).slice(0, count).map(item => item.strategy).sort((a, b) => a.number - b.number);
  const strategyIds = selected.map(strategy => strategy.number);
  const techniques = [...new Set(selected.flatMap(strategy => strategy.techniques))];
  const structures = recipes.map(recipe => recipe.id);
  const relevantGold = index.goldSolutions.map(solution => ({ solution, score: Number(techniques.includes(solution.techniqueId)) * 20 + Math.min(10, overlap(query, `${solution.trigger_pattern} ${solution.question}`)) }))
    .filter(item => item.score >= 20).sort((a, b) => b.score - a.score || a.solution.id.localeCompare(b.solution.id)).slice(0, 3).map(item => item.solution);
  const formatGold = (solutions: readonly GoldSolution[]) => JSON.stringify(solutions.map(solution => ({ ...solution, desmos_steps: solution.desmos_steps.map(step => step.replace(/\b([A-Za-z])_(\d+)\b/g, "$1_{$2}")) })), null, 2);
  const rules = [...new Set(selected.flatMap(strategy => [...strategy.prerequisites, ...strategy.counterexamples]))];
  const focusHint = [
    fallback ? "Retrieval confidence is low: the complete curated library remains available. The following are suggestions, not exclusions." : "Start by comparing these curated strategies against the recognized structure. Retrieval is a shortlist, not a correctness verdict; do not force a suggested technique when its prerequisites fail.",
    `Recognized structures: ${structures.join(", ") || "no confident structural match"}.`,
    ...recipes.flatMap(recipe => recipe.guidance ? [recipe.guidance] : []),
    `Suggested strategy IDs: ${strategyIds.join(", ")}.`,
    ...selected.map(strategy => `${strategy.number}. ${strategy.title}`),
    ...rules.map(rule => `Guard: ${rule}`),
    "If none provides a reliable Desmos method, report why in the library search; do not invent a fit or suppress a valid alternative.",
  ].join("\n");
  return {
    strategyIds, techniques, structures, confidence, fallback, focusHint,
    focusedLibrary: fallback ? index.fullLibrary : [index.preamble, ...selected.map(strategy => strategy.body), index.footer].filter(Boolean).join("\n\n"),
    selectedGoldPrompt: formatGold(fallback ? index.goldSolutions : relevantGold),
  };
}
