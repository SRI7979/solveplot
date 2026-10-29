/** A small exact check for a stated linear function printed as a two-column table. */
export type LinearTableIntercept = {
  value: number;
  points: ReadonlyArray<readonly [number, number]>;
};

const NUMBER = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

/**
 * Only exact, collinear tables qualify. In particular, a line of best fit
 * through scattered data cannot be checked by taking two of its points.
 */
export function exactLinearTableIntercept(question: string): LinearTableIntercept | null {
  if (!/\blinear function\b/i.test(question) || /\b(?:best fit|approximately)\b/i.test(question)) return null;
  const asksForZero = /\b(?:crosses|intersects)\s+the\s+x[- ]axis\s+at\s+(?:the\s+)?point\s*\(\s*[a-z]\s*,\s*0\s*\)/i.test(question) ||
    /\b(?:what|find|determine)\b[^?]{0,100}\bx[- ]intercept\b/i.test(question);
  if (!asksForZero) return null;

  const lines = question.replace(/[−–]/g, "-").split(/\r?\n/);
  const header = lines.findIndex((line) => /^\s*x\s*\|\s*(?:f\(\s*x\s*\)|y)\s*$/i.test(line));
  if (header < 0) return null;
  const points: Array<readonly [number, number]> = [];
  for (const line of lines.slice(header + 1)) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length !== 2 || !cells.every((cell) => NUMBER.test(cell))) break;
    points.push([Number(cells[0]), Number(cells[1])]);
  }
  if (points.length < 2) return null;
  const second = points.find(([x]) => !sameNumber(x, points[0][0]));
  if (!second) return null;
  const slope = (second[1] - points[0][1]) / (second[0] - points[0][0]);
  if (!Number.isFinite(slope) || sameNumber(slope, 0)) return null;
  const intercept = points[0][1] - slope * points[0][0];
  if (!points.every(([x, y]) => sameNumber(slope * x + intercept, y))) return null;
  const value = -intercept / slope;
  return Number.isFinite(value) ? { value, points } : null;
}

const LIST_ROW = /^([xy])_(?:\{1\}|1)=\[([^\[\]]+)\]$/;
const FIT_ROW = /^y_(?:\{1\}|1)(?:\\sim|~)([a-z])x_(?:\{1\}|1)([+-])([a-z])$/i;
const PLOT_ROW = /^(?:y|[a-z]\(x\))=([a-z])x([+-])([a-z])$/i;

function compactRows(rows: ReadonlyArray<{ latex: string }>): string[] {
  return rows.map(({ latex }) => latex.replace(/\s+|\\left|\\right/g, ""));
}

function fittedLineForGraph(
  rows: readonly string[],
  graphRow: number,
): { slope: string; sign: string; intercept: string } | null {
  const graph = rows[graphRow - 1]?.match(PLOT_ROW);
  if (!graph) return null;
  for (const row of rows.slice(0, graphRow - 1)) {
    const fit = row.match(FIT_ROW);
    if (fit && fit[1] === graph[1] && fit[2] === graph[2] && fit[3] === graph[3]) {
      return { slope: fit[1], sign: fit[2], intercept: fit[3] };
    }
  }
  return null;
}

/**
 * A wrong graph readout is repairable only when the displayed regression uses
 * at least two actual table pairs and its plotted line uses those same fitted
 * parameters. The check does not infer a method from a mere technique label.
 */
export function graphsExactLinearTableFit(
  table: LinearTableIntercept,
  rows: ReadonlyArray<{ latex: string }>,
  resultRow: number | null,
): boolean {
  if (resultRow === null || resultRow < 1 || resultRow > rows.length) return false;
  const compact = compactRows(rows);
  const lists = new Map<string, number[]>();
  for (const row of compact) {
    const match = row.match(LIST_ROW);
    if (!match) continue;
    const parts = match[2].split(",");
    if (parts.length < 2 || !parts.every((part) => NUMBER.test(part))) continue;
    lists.set(match[1], parts.map(Number));
  }
  const xValues = lists.get("x");
  const yValues = lists.get("y");
  if (!xValues || !yValues || xValues.length !== yValues.length) return false;
  const pairsAreFromTable = xValues.every((x, index) =>
    table.points.some(([givenX, givenY]) => sameNumber(x, givenX) && sameNumber(yValues[index], givenY)));
  if (!pairsAreFromTable || !xValues.some((x) => !sameNumber(x, xValues[0]))) return false;

  return fittedLineForGraph(compact, resultRow) !== null;
}

/**
 * Some candidate calls append r=-b/m after plotting a fitted line. That is a
 * hand-derived formula, even when Desmos evaluates it. If the same candidate
 * has entered the exact printed pairs and plotted its fit, the student can
 * instead click the graph's x-intercept. No expression or answer is invented.
 */
export function plottedLinearTableInterceptRow(
  table: LinearTableIntercept,
  rows: ReadonlyArray<{ latex: string }>,
  resultRow: number | null,
): number | null {
  if (resultRow === null || resultRow !== rows.length || resultRow < 5) return null;
  const compact = compactRows(rows);
  const alias = compact[resultRow - 1].match(/^([a-z])=(-?)([a-z])\/([a-z])$/i);
  if (!alias) return null;
  for (let graphRow = 4; graphRow < resultRow; graphRow += 1) {
    if (!graphsExactLinearTableFit(table, rows, graphRow)) continue;
    const fit = fittedLineForGraph(compact, graphRow)!;
    const expectedSign = fit.sign === "+" ? "-" : "";
    if (alias[2] === expectedSign && alias[3] === fit.intercept && alias[4] === fit.slope) {
      return graphRow;
    }
  }
  return null;
}
