/**
 * Exact check for a quadratic f hidden behind a stated linear multiplier g.
 * The multiplier vanishes at the requested input, so reading that table cell
 * cannot reveal f there; three other rows determine the quadratic instead.
 */
export type QuadraticProductTable = {
  factor: number;
  input: number;
  value: number;
  points: ReadonlyArray<readonly [number, number]>;
};

const NUMBER = /^-?(?:\d+(?:\.\d*)?|\.\d+)$/;
const NUMBER_SOURCE = String.raw`-?(?:\d+(?:\.\d*)?|\.\d+)`;

function sameNumber(left: number, right: number): boolean {
  return Math.abs(left - right) <= 1e-9 * Math.max(1, Math.abs(left), Math.abs(right));
}

function quadraticAt(points: ReadonlyArray<readonly [number, number]>, x: number): number {
  return points.reduce((sum, [xi, yi], i) => {
    const basis = points.reduce((product, [xj], j) => i === j ? product : product * (x - xj) / (xi - xj), 1);
    return sum + yi * basis;
  }, 0);
}

export function exactQuadraticProductTable(question: string): QuadraticProductTable | null {
  const text = question.replace(/[−–]/g, "-");
  const definition = text.match(/\bg\s+is\s+defined\s+by\s+g\s*\(\s*x\s*\)\s*=\s*\(\s*x\s*([+-])\s*(\d+(?:\.\d+)?)\s*\)\s*f\s*\(\s*x\s*\)\s*,?\s*where\s+f\s+is\s+a\s+quadratic\s+function\b/i);
  const target = text.match(new RegExp(String.raw`\b(?:what\s+is\s+the\s+value\s+of|find|determine)\s+f\s*\(\s*(${NUMBER_SOURCE})\s*\)\s*\?`, "i"));
  if (!definition || !target) return null;
  const factor = Number(`${definition[1] === "-" ? "-" : ""}${definition[2]}`);
  const input = Number(target[1]);
  // This is the distinctive zero-factor question. Other f(t) questions need
  // no special guard and could be more efficiently evaluated in other ways.
  if (!Number.isFinite(factor) || !sameNumber(input, -factor)) return null;

  const lines = text.split(/\r?\n/);
  const header = lines.findIndex((line) => /^\s*x\s*\|\s*g\s*\(\s*x\s*\)\s*$/i.test(line));
  if (header < 0) return null;
  const points: Array<readonly [number, number]> = [];
  for (const line of lines.slice(header + 1)) {
    const cells = line.split("|").map((cell) => cell.trim());
    if (cells.length !== 2 || !cells.every((cell) => NUMBER.test(cell))) break;
    const pair: readonly [number, number] = [Number(cells[0]), Number(cells[1])];
    if (!pair.every((number) => Number.isFinite(number) && Math.abs(number) <= 1e6)) return null;
    if (points.some(([x]) => sameNumber(x, pair[0]))) return null;
    points.push(pair);
  }
  const usable = points.filter(([x]) => !sameNumber(x, input));
  if (usable.length < 3 || !points.every(([x, y]) => !sameNumber(x, input) || sameNumber(y, 0))) return null;
  const defining = usable.slice(0, 3).map(([x, g]) => [x, g / (x + factor)] as const);
  if (!defining.every(([, value]) => Number.isFinite(value))) return null;
  if (!usable.every(([x, g]) => sameNumber(quadraticAt(defining, x) * (x + factor), g))) return null;
  const value = quadraticAt(defining, input);
  return Number.isFinite(value) ? { factor, input, value, points } : null;
}

const LIST_ROW = /^([xy])_\{?1\}?=\[([^\[\]]+)\]$/;

/**
 * A wrong reported value is repairable only if the calculator rows actually
 * fit the printed g-values to the stated quadratic product (or show each
 * division by its nonzero factor in the expressions list) and then read f.
 * This excludes a mere technique label, a transcribed/altered table, and a
 * paper derivation whose steps the server cannot independently inspect.
 */
export function fitsExactQuadraticProductTable(
  table: QuadraticProductTable,
  rows: ReadonlyArray<{ latex: string }>,
  resultRow: number | null,
): boolean {
  if (resultRow === null || resultRow < 1 || resultRow > rows.length) return false;
  const compact = rows.map(({ latex }) => latex.replace(/\s+|\\left|\\right/g, "").replace(/\^\{2\}/g, "^2"));
  if (compact[resultRow - 1] !== `f(${table.input})`) return false;
  if (!compact.includes("f(x)=ax^2+bx+c")) return false;
  const factorRow = `g(x)=(x${table.factor < 0 ? "" : "+"}${table.factor})f(x)`;
  if (compact.some((row) => row.startsWith("g(x)=")) && !compact.includes(factorRow)) return false;

  const lists = new Map<string, string[]>();
  for (const row of compact) {
    const match = row.match(LIST_ROW);
    if (!match) continue;
    const parts = match[2].split(",");
    lists.set(match[1], parts);
  }
  const xParts = lists.get("x");
  const yParts = lists.get("y");
  if (!xParts || !yParts || xParts.length !== yParts.length || !xParts.every((part) => NUMBER.test(part))) return false;
  const xs = xParts.map(Number);
  if (compact.includes(factorRow) && compact.some((row) => /^y_\{?1\}?\\simg\(x_\{?1\}?\)$/.test(row))) {
    if (xs.length !== table.points.length || !yParts.every((part) => NUMBER.test(part))) return false;
    return xs.every((x, index) => table.points.some(([givenX, givenY]) =>
      sameNumber(x, givenX) && sameNumber(Number(yParts[index]), givenY)));
  }

  // Dividing the nonzero table outputs inside Desmos is another valid fit.
  // Require every informative row and each literal fraction's numerator and
  // denominator to match the printed pair and its stated multiplier exactly.
  if (!compact.some((row) => /^y_\{?1\}?\\simax_\{?1\}?\^2\+bx_\{?1\}?\+c$/.test(row))) return false;
  const usable = table.points.filter(([x]) => !sameNumber(x, table.input));
  if (xs.length !== usable.length || new Set(xs).size !== xs.length) return false;
  return xs.every((x, index) => {
    const given = usable.find(([givenX]) => sameNumber(givenX, x));
    const parts = yParts[index].split("/");
    return given !== undefined && parts.length === 2 && parts.every((part) => NUMBER.test(part)) &&
      sameNumber(Number(parts[0]), given[1]) && sameNumber(Number(parts[1]), x + table.factor);
  });
}
