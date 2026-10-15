import { parseNumber } from "./answer-consistency";
import { findTranscriptionConflicts, isIntegerFactorExtremumQuestion, StrategySelectionError, type CandidatesResponse, type Candidate } from "./strategy-selection";

type Pair = { x: number; y: number };

const TABLE_NUMBER = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)`;

function numbers(list: string): number[] | null {
  const text = list.trim().replace(/^\[|\]$/g, "").replace(/\.(?=\s*$)/, "").trim();
  // Empty cells must not become zero, and a prefix of a malformed cell must
  // never become valid data (for example "5?" or "7 + 2").
  const cells = text.includes("|") ? text.replace(/^\||\|$/g, "").split("|")
    : text.includes(",") ? text.split(",") : text.split(/\s+/);
  return cells.length && cells.every((cell) => new RegExp(`^${TABLE_NUMBER}$`).test(cell.trim()))
    ? cells.map((cell) => Number(cell.trim())) : null;
}

/**
 * The table, read from the transcription only. The model's own rows are never
 * a source of data: they may hold values it computed (f(1)=15 from g(1)=5).
 */
function questionPoints(question: string): Pair[] {
  // Retain row boundaries while converting presentation-only LaTeX/Markdown.
  // Headers still determine what a number means; candidate rows are never read.
  const text = question.replace(/[−–]/g, "-")
    .replace(/\\begin\{(?:array|[bpvV]?matrix|tabular)\}(?:\{[^}]*\})?/g, "\n")
    .replace(/\\end\{(?:array|[bpvV]?matrix|tabular)\}/g, "\n")
    .replace(/\\(?:hline|toprule|midrule|bottomrule|left|right)\b/g, "")
    .replace(/\\[()[\]]|[$`*]/g, "")
    .replace(/\\\\(?:\[[^\]]*\])?/g, "\n").replace(/&/g, "|");
  const points: Pair[] = [];
  const add = (x: number, y: number) => {
    const previous = points.find((point) => point.x === x);
    if (previous && previous.y !== y) {
      throw new StrategySelectionError(
        `The transcription gives two different values for g(${x}) (${previous.y} and ${y}). Recheck the original table and transcribe each cell once, without computed values.`,
        "transcription_conflict",
      );
    }
    if (!previous) points.push({ x, y });
  };
  const malformed = () => {
    throw new StrategySelectionError("The table's paired x and g(x) values are incomplete or malformed. Transcribe every table cell exactly as printed, with one g(x) value for each x.", "semantic_inputs");
  };
  const completeValue = String.raw`(?=\s*(?:$|[,;!?\n]|\.(?!\d)|\b(?:and|where|what|the)\b))`;
  for (const match of text.matchAll(new RegExp(String.raw`\bg\s*\(\s*(${TABLE_NUMBER})\s*\)\s*=\s*(${TABLE_NUMBER})${completeValue}`, "gi"))) {
    add(Number(match[1]), Number(match[2]));
  }
  for (const match of text.matchAll(new RegExp(String.raw`\bx\s*[:=]\s*(${TABLE_NUMBER})\s*(?:→|->|,|;|\|)\s*g\s*\(\s*x\s*\)\s*=\s*(${TABLE_NUMBER})${completeValue}`, "gi"))) {
    add(Number(match[1]), Number(match[2]));
  }

  const tableStart = text.search(/\b(?:table|g\s+passes\s+through)\b/i);
  if (tableStart < 0) return points;
  const table = text.slice(tableStart);
  // Coordinate pairs are accepted only when the transcription explicitly
  // identifies them as table data, not from f's separately stated intercept.
  const pairLabel = table.match(/\b(?:table\s*(?:below)?\s*[:=]|points\s*[:=])\s*(?=\()/i);
  if (pairLabel) {
    let remainder = table.slice(pairLabel.index! + pairLabel[0].length);
    const pairPattern = new RegExp(String.raw`^\(\s*(${TABLE_NUMBER})\s*,\s*(${TABLE_NUMBER})\s*\)`);
    for (let match = remainder.match(pairPattern); match; match = remainder.match(pairPattern)) {
      add(Number(match[1]), Number(match[2]));
      remainder = remainder.slice(match[0].length).replace(/^\s*(?:[,;]\s*)?(?:and\s+)?/, "");
    }
    if (remainder.startsWith("(")) malformed();
  }

  // Named columns/rows: x=[1,4]; g(x)=[5,7], or horizontal table rows
  // x | 1 | 4 / g(x) | 5 | 7. Parse complete cells, not numeric prefixes.
  const column = String.raw`(\[[^\]\n]*\]|${TABLE_NUMBER}(?:[\t ,|]+${TABLE_NUMBER})*[,|]?)`;
  const columns = new RegExp(String.raw`\bx\s*(?:values?)?\s*[:=|]\s*${column}\s*(?:and\s*|[;\n]\s*|\|?\s*)g\s*\(\s*x\s*\)\s*(?:values?)?\s*[:=|]\s*${column}`, "gi");
  for (const match of table.matchAll(columns)) {
    const xs = numbers(match[1]);
    const ys = numbers(match[2]);
    if (!xs || !ys || xs.length !== ys.length) malformed();
    const remainder = table.slice(match.index! + match[0].length);
    if (/^[^\s.;!\n]|^[\t ]*[+*/?=]|^[\t ]*-\s*\d/.test(remainder)) malformed();
    xs!.forEach((x, index) => add(x, ys![index]));
  }

  // Column headers establish row order for Markdown, plaintext and LaTeX
  // matrices. Whitespace-only inline tables follow the same printed order.
  const headers = /\bx[\t ]*(?:\||[\t ]+)[\t ]*g\s*\(\s*x\s*\)[\t ]*\|?/gi;
  for (const header of table.matchAll(headers)) {
    const body = table.slice(header.index! + header[0].length)
      .split(/\b(?:what|which|find|answer choices)\b/i)[0];
    for (const line of body.split(/[\n;]/)) {
      const row = line.trim().replace(/^[:=]\s*/, "");
      if (!row || /^[|:\s-]+$/.test(row)) continue;
      // A prose line ends this table; a partly numeric row is an error.
      if (!/^[|\s]*[+\-\d.]/.test(row)) {
        if (/^(?:[|?]|(?:NA|N\/A|undefined|blank|missing)\b)/i.test(row)) malformed();
        break;
      }
      const cells = numbers(row);
      if (!cells || cells.length % 2) malformed();
      for (let index = 0; index < cells!.length; index += 2) add(cells![index], cells![index + 1]);
    }
  }
  return points;
}

/**
 * The prose contract forbids LaTeX control sequences. A complete numeric
 * x/g(x) table is presentation, so convert only its verified array/matrix
 * wrapper to plain rows. Preserve every printed cell and surrounding word;
 * unknown commands or malformed matrices remain subject to strict rejection.
 */
function plainQuestionTableLayout(question: string): string {
  const tableStart = question.search(/\b(?:table|g\s+passes\s+through)\b/i);
  if (tableStart < 0) return question;
  return question.replace(
    /\\begin\{(array|[bpvV]?matrix|tabular)\}(\{[clr|\s]+\})?([\s\S]*?)\\end\{\1\}/g,
    (source: string, kind: string, columns: string | undefined, body: string, offset: number) => {
      if (offset < tableStart || ((kind === "array" || kind === "tabular") && !columns)) return source;
      const rows = body.replace(/\\(?:hline|toprule|midrule|bottomrule)\b/g, "")
        .split(/\\\\/).map((row) => row.trim()).filter(Boolean);
      const cells = rows.map((row) => row.split("&").map((cell) => cell.trim()));
      if (cells.length < 3 || cells.some((row) => row.length !== 2)) return source;
      if (cells[0][0] !== "x" || !/^g\s*\(\s*x\s*\)$/.test(cells[0][1])) return source;
      if (cells.slice(1).some((row) => row.some((cell) => !new RegExp(`^${TABLE_NUMBER}$`).test(cell.replace(/[−–]/g, "-"))))) return source;
      return `${cells.map((row) => row.join(" | ")).join("\n")}\n`;
    },
  );
}

function parseProblem(question: string) {
  let text = question.replace(/[−–]/g, "-").replace(/\s+/g, " ");
  text = text.replace(/\\frac\s*\{\s*f\s*\(\s*x\s*\)\s*\}\s*\{\s*x\s*([+-])\s*(\d+(?:\.\d+)?)\s*\}/i, "f(x)/(x $1 $2)");
  if (!/\bf\b[^.?!]{0,160}\bquadratic\b/i.test(text) && !/\bquadratic\b[^.?!]{0,160}\bf\b/i.test(text)) return null;
  const denominator = text.match(/\bg\s*\(\s*x\s*\)\s*=\s*f\s*\(\s*x\s*\)\s*\/\s*\(\s*x\s*([+-])\s*(\d+(?:\.\d+)?)\s*\)/i);
  const intercept = text.match(/y[- ]intercept[^.?!]{0,180}?\bf\b[^.?!]{0,100}?\(\s*0\s*,\s*(-?\d+(?:\.\d+)?)\s*\)/i)
    ?? text.match(/\bf\s*\(\s*0\s*\)\s*=\s*(-?\d+(?:\.\d+)?)/i);
  const target = text.match(/\bwhat\s+is\s+(?:the\s+value\s+of\s+)?g\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/i);
  if (!denominator || !intercept || !target) return null;
  const signedShift = Number(denominator[2]) * (denominator[1] === "-" ? -1 : 1);
  return { shift: signedShift, intercept: Number(intercept[1]), target: Number(target[1]) };
}

/**
 * The model can confuse a stated intercept of f with a table value of g.
 * When the question and candidate rows expose this exact structure, rebuild
 * the regression from the actual g-pairs and keep the intercept as f(0).
 */
export function repairQuadraticRationalIntercept(response: CandidatesResponse): CandidatesResponse {
  if (response.status !== "solved") return response;
  const problem = parseProblem(response.question);
  if (!problem) return response;

  const conflicts = findTranscriptionConflicts(response.question);
  if (conflicts.length) {
    throw new StrategySelectionError(
      `The transcription gives two different values for ${conflicts.map(({ name, input, values }) => `${name}(${input}) (${values.join(" and ")})`).join(", ")}. Transcribe each table cell once, exactly as printed under its header, and never add values you computed to the question text.`,
      "transcription_conflict",
    );
  }
  const points = questionPoints(response.question);
  if (points.length < 2) {
    throw new StrategySelectionError(
      "The table's paired x and g(x) values were not transcribed. Include every table row in question, then provide a Desmos regression method.",
      "semantic_inputs",
    );
  }
  let pair: [Pair, Pair] | null = null;
  for (let left = 0; left < points.length && !pair; left += 1) {
    for (let right = left + 1; right < points.length; right += 1) {
      const determinant = points[left].x ** 2 * points[right].x - points[right].x ** 2 * points[left].x;
      if (Math.abs(determinant) >= 1e-12) {
        pair = [points[left], points[right]];
        break;
      }
    }
  }
  if (!pair) throw new StrategySelectionError("The table does not provide two independent inputs for the quadratic fit.", "semantic_inputs");
  const [p1, p2] = pair;
  const determinant = p1.x ** 2 * p2.x - p2.x ** 2 * p1.x;

  const u1 = p1.y * (p1.x + problem.shift) - problem.intercept;
  const u2 = p2.y * (p2.x + problem.shift) - problem.intercept;
  const a = (u1 * p2.x - u2 * p1.x) / determinant;
  const b = (p1.x ** 2 * u2 - p2.x ** 2 * u1) / determinant;
  if (points.some(({ x, y }) => !Number.isFinite((a * x ** 2 + b * x + problem.intercept) / (x + problem.shift)) || Math.abs((a * x ** 2 + b * x + problem.intercept) / (x + problem.shift) - y) > 1e-7)) {
    throw new StrategySelectionError("The transcribed table values disagree with the stated quadratic rational function; recheck the image and table rows.", "semantic_inputs");
  }
  const resultValue = (a * problem.target ** 2 + b * problem.target + problem.intercept) / (problem.target + problem.shift);
  if (!Number.isFinite(resultValue)) {
    throw new StrategySelectionError("The requested input makes g undefined; recheck the denominator and requested value.", "semantic_inputs");
  }
  const interceptTerm = problem.intercept < 0 ? `${problem.intercept}` : `+${problem.intercept}`;
  const denominator = (x: number | string) => problem.shift < 0 ? `${x}${problem.shift}` : `${x}+${problem.shift}`;

  const candidate: Candidate = {
    techniqueId: "parameter-regression",
    strategy: null,
    rung: 4,
    rows: [
      { latex: `g(x)=\\frac{a x^{2}+b x${interceptTerm}}{${denominator("x")}}`, slider: null, copiesRow: null },
      {
        latex: `[${points.map(({ x }) => `g(${x})`).join(",")}]\\sim[${points.map(({ y }) => y).join(",")}]`,
        slider: null,
        copiesRow: null,
      },
      {
        latex: `g(${problem.target})`,
        slider: null,
        copiesRow: null,
      },
    ],
    answer: resultValue.toPrecision(12).replace(/\.?0+$/, ""),
    result: {
      type: "numeric",
      row: 3,
      value: resultValue,
      listIndex: null,
      answerFrom: "value",
      choiceLabel: null,
      detail: `g(${problem.target}) from the fitted quadratic`,
      relatedRows: [],
    },
    answerState: null,
    parameters: [],
    conditionType: null,
    distinguishes: null,
    graphBounds: null,
    cost: { derivationSteps: 0, newPrimitives: 0, oneOffFacts: 0, setupConstructions: 0, manualIterations: 0 },
  };

  const alternatives = response.candidates
    .filter((other) => {
      if (other.techniqueId === candidate.techniqueId) return false;
      const answer = parseNumber(other.answer);
      return answer !== null && Math.abs(answer - resultValue) <= 1e-8 * Math.max(1, Math.abs(resultValue));
    })
    .map((other) => other.rows.length === 0
      ? { ...other, cost: { ...other.cost, derivationSteps: Math.max(4, other.cost.derivationSteps) } }
      : other);
  if (alternatives.every((other) => other.rows.length > 0) && !alternatives.some((other) => other.techniqueId === "substitution")) {
    alternatives.push({
      techniqueId: "substitution",
      strategy: null,
      rung: 2,
      rows: [],
      answer: candidate.answer,
      result: {
        type: "written", row: null, relatedRows: [], value: null, listIndex: null,
        answerFrom: "reasoning", choiceLabel: null,
        detail: `the value after solving for the quadratic and evaluating g(${problem.target})`,
      },
      answerState: null,
      parameters: [],
      conditionType: null,
      distinguishes: null,
      graphBounds: null,
      cost: { derivationSteps: 4, newPrimitives: 0, oneOffFacts: 0, setupConstructions: 0, manualIterations: 0 },
    });
  }
  alternatives.sort((left, right) => Number(left.rows.length > 0) - Number(right.rows.length > 0));
  // Numeric cells are never rewritten or inferred; only complete table
  // presentation may be flattened to satisfy the existing plain-prose schema.
  return { ...response, question: plainQuestionTableLayout(response.question), candidates: [candidate, ...alternatives].slice(0, 6), preferredTechniqueId: candidate.techniqueId };
}

type FactorExtremum = { leading: number; constant: number; exponent: number; kind: "max" | "min" };

/** Only recognize the complete two-binomial pattern; other factoring questions
 * should keep their model candidates rather than receive a guessed formula. */
function parseIntegerFactorExtremum(question: string): FactorExtremum | null {
  if (!isIntegerFactorExtremumQuestion(question)) return null;
  const superscripts = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const compact = question
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (digits) => `^${[...digits].map((digit) => superscripts.indexOf(digit)).join("")}`)
    .replace(/\^\{(\d+)\}|\^\((\d+)\)/g, (_all, braces: string | undefined, parens: string | undefined) => `^${braces ?? parens}`)
    .replace(/\\(?:left|right|cdot)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
  const polynomial = compact.match(/(\d+)x\^(\d+)\+kx\^(\d+)\+(\d+)/);
  if (!polynomial) return null;
  const [, leadingText, highPowerText, exponentText, constantText] = polynomial;
  const [leading, highPower, exponent, constant] = [leadingText, highPowerText, exponentText, constantText].map(Number);
  if (!Number.isSafeInteger(leading) || !Number.isSafeInteger(constant) ||
      leading < 1 || constant < 1 || leading > 10000 || constant > 10000 ||
      !Number.isInteger(exponent) || exponent < 1 || highPower !== 2 * exponent ||
      !compact.includes(`ax^${exponent}+b`) || !compact.includes(`cx^${exponent}+d`)) return null;
  const kind = /\b(?:minimum|least)\b/i.test(question) ? "min" : "max";
  return { leading, constant, exponent, kind };
}

function signedDivisors(value: number): number[] {
  const result: number[] = [];
  for (let divisor = 1; divisor <= value; divisor += 1) {
    if (value % divisor === 0) result.push(-divisor, divisor);
  }
  return result;
}

/** Independent answer check for Desmos-retry candidates, whose rows may use
 * a different method after the canonical list method failed in the browser. */
export function expectedIntegerFactorExtremumAnswer(question: string): number | null {
  const problem = parseIntegerFactorExtremum(question);
  if (!problem) return null;
  const { leading, constant, kind } = problem;
  const constantDivisors = signedDivisors(constant);
  const coefficients = signedDivisors(leading).flatMap((a) =>
    constantDivisors.map((b) => (a + b) * (leading / a + constant / b) - leading - constant),
  );
  const answer = kind === "max" ? Math.max(...coefficients) : Math.min(...coefficients);
  return Number.isSafeInteger(answer) ? answer : null;
}

/**
 * An identity regression can return any exact factorization, even when the
 * question asks for the greatest/least middle coefficient. Enumerate every
 * signed integer divisor pair instead. Evaluating both sides at x^n=1 gives
 * k=(a+b)(c+d)-leading-constant; Desmos performs the enumeration and max/min.
 */
export function repairIntegerFactorExtremum(response: CandidatesResponse): CandidatesResponse {
  if (response.status !== "solved") return response;
  const problem = parseIntegerFactorExtremum(response.question);
  if (!problem) {
    // In screenshot questions, the polynomial is often printed above the
    // prose. A model can infer its coefficients for an answer while leaving
    // that entire line out of `question`. In that case neither the semantic
    // check nor the student can verify the work. The pipeline retries with
    // the original image; a second omission fails instead of caching a guess.
    const refersToDisplayedExpression = /\b(?:expression|polynomial|equation)\s+(?:above|shown)\b/i.test(response.question);
    const transcribedMiddleTerm = /\bk\s*(?:\\cdot\s*|\*\s*)?x\s*(?:\^|[⁰¹²³⁴⁵⁶⁷⁸⁹])/i.test(response.question);
    if (isIntegerFactorExtremumQuestion(response.question) && refersToDisplayedExpression && !transcribedMiddleTerm) {
      throw new StrategySelectionError(
        "The transcription refers to an expression above but omits the polynomial containing k. Read the original image again and copy the complete polynomial, including every coefficient and exponent, into question exactly as printed. Do not infer missing terms from a candidate answer or explanation.",
        "semantic_inputs",
      );
    }
    return response;
  }
  const { leading, constant, kind } = problem;
  const answer = expectedIntegerFactorExtremumAnswer(response.question);
  if (answer === null) return response;

  const candidate: Candidate = {
    techniqueId: "integer-list-filter",
    strategy: null,
    rung: 4,
    rows: [
      { latex: `a_{1}=\\operatorname{join}([-${leading}...-1],[1...${leading}])`, slider: null, copiesRow: null },
      { latex: `b_{1}=\\operatorname{join}([-${constant}...-1],[1...${constant}])`, slider: null, copiesRow: null },
      { latex: `a_{2}=a_{1}[\\operatorname{mod}(${leading},a_{1})=0]`, slider: null, copiesRow: null },
      { latex: `b_{2}=b_{1}[\\operatorname{mod}(${constant},b_{1})=0]`, slider: null, copiesRow: null },
      {
        latex: `k_{1}=\\left((p+q)\\left(\\frac{${leading}}{p}+\\frac{${constant}}{q}\\right)-${leading}-${constant}\\right)\\operatorname{for}p=a_{2},q=b_{2}`,
        slider: null,
        copiesRow: null,
      },
      { latex: `\\operatorname{${kind}}(k_{1})`, slider: null, copiesRow: null },
    ],
    answer: String(answer),
    result: {
      type: "numeric", row: 6, relatedRows: [], value: answer, listIndex: null,
      answerFrom: "value", choiceLabel: null,
      detail: `the ${kind === "max" ? "greatest" : "least"} coefficient from every integer factor pair`,
    },
    answerState: null,
    parameters: [],
    conditionType: null,
    distinguishes: null,
    graphBounds: null,
    cost: { derivationSteps: 1, newPrimitives: 0, oneOffFacts: 0, setupConstructions: 0, manualIterations: 0 },
  };
  return {
    ...response,
    structure: `Two integer binomial factors of a quadratic in x^${problem.exponent}; compare every integer factorization.`,
    candidates: [candidate],
    preferredTechniqueId: candidate.techniqueId,
  };
}
