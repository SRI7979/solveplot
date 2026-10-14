/**
 * Exact affine forms over Desmos LaTeX, for the places the server must prove a
 * value is fixed instead of taking the model's word for it: Rule 2
 * (solver-rules.ts), where an underdetermined regression is still valid when
 * the line the student reads is fixed (two equations in x, y, and z fix
 * x+y+z), and the linear-system plan, which builds that regression itself.
 *
 * Arithmetic is exact (BigInt rationals), so "fixed" never rests on a
 * floating-point tolerance. The parser reads a deliberately small subset:
 * numbers, one-letter names with subscripts, + and -, juxtaposition, \cdot,
 * *, division by a constant, \frac, parentheses and braces, and integer
 * powers. Anything else, and any product of two unknowns, parses to null,
 * which callers treat as "cannot verify": the conservative answer.
 */

export type Rational = { readonly n: bigint; readonly d: bigint };

// The project compiles to ES2017, which has no 0n literal syntax; BigInt() itself is available.
const [ZERO_BIG, ONE_BIG, TWO_BIG, FIVE_BIG, NINE_BIG, TEN_BIG, MAX_EXPONENT] = [0, 1, 2, 5, 9, 10, 64].map(BigInt);

const absolute = (value: bigint) => (value < ZERO_BIG ? -value : value);

function gcd(left: bigint, right: bigint): bigint {
  let [a, b] = [absolute(left), absolute(right)];
  while (b) [a, b] = [b, a % b];
  return a;
}

export function rational(numerator: bigint, denominator = ONE_BIG): Rational {
  if (denominator === ZERO_BIG) throw new RangeError("A rational needs a nonzero denominator.");
  const sign = denominator < ZERO_BIG ? -ONE_BIG : ONE_BIG;
  const divisor = gcd(numerator, denominator) || ONE_BIG;
  return { n: (sign * numerator) / divisor, d: (sign * denominator) / divisor };
}

const ZERO = rational(ZERO_BIG);
const ONE = rational(ONE_BIG);
const plus = (a: Rational, b: Rational) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const minus = (a: Rational, b: Rational) => rational(a.n * b.d - b.n * a.d, a.d * b.d);
const times = (a: Rational, b: Rational) => rational(a.n * b.n, a.d * b.d);
const over = (a: Rational, b: Rational) => rational(a.n * b.d, a.d * b.n);
const isZero = (value: Rational) => value.n === ZERO_BIG;

/** "12.5" → 25/2 and ".5" → 1/2, exactly. */
export function parseDecimal(text: string): Rational {
  const [whole, fraction = ""] = text.replace(/^\+/, "").split(".");
  return rational(BigInt(`${whole}${fraction}` || "0"), TEN_BIG ** BigInt(fraction.length));
}

export function toNumber(value: Rational): number {
  return Number(value.n) / Number(value.d);
}

/** 8, 2.5, or 25/3: a terminating decimal as a decimal, a repeating one as a fraction. */
export function formatRational(value: Rational): string {
  if (value.d === ONE_BIG) return value.n.toString();
  let rest = value.d;
  while (rest % TWO_BIG === ZERO_BIG) rest /= TWO_BIG;
  while (rest % FIVE_BIG === ZERO_BIG) rest /= FIVE_BIG;
  return rest === ONE_BIG ? String(toNumber(value)) : `${value.n}/${value.d}`;
}

/** constant + Σ coefficient·name, with no zero coefficients. */
export type AffineForm = { readonly constant: Rational; readonly terms: ReadonlyMap<string, Rational> };

const constantForm = (value: Rational): AffineForm => ({ constant: value, terms: new Map() });

function combine(left: AffineForm, right: AffineForm, scale: Rational): AffineForm {
  const terms = new Map(left.terms);
  for (const [name, coefficient] of right.terms) {
    const sum = plus(terms.get(name) ?? ZERO, times(scale, coefficient));
    if (isZero(sum)) terms.delete(name);
    else terms.set(name, sum);
  }
  return { constant: plus(left.constant, times(scale, right.constant)), terms };
}

/** left - right: a condition left = right as one form that must equal zero. */
export function differenceForm(left: AffineForm, right: AffineForm): AffineForm {
  return combine(left, right, rational(-ONE_BIG));
}

function scaled(form: AffineForm, factor: Rational): AffineForm {
  return combine(constantForm(ZERO), form, factor);
}

/** What a name is to the parser: a known exact value, an unknown, or neither (unverifiable). */
export type NameRole = (name: string) => Rational | "variable" | null;

type Token =
  | { kind: "number"; value: Rational }
  | { kind: "name"; name: string }
  | { kind: "op"; op: "+" | "-" | "*" | "/" | "^" }
  | { kind: "open"; close: ")" | "}" }
  | { kind: "close"; char: ")" | "}" }
  | { kind: "frac" };

const TOKEN = /\s+|(\d+(?:\.\d+)?|\.\d+)|([A-Za-z])(?:_\{([A-Za-z0-9]+)\}|_([A-Za-z0-9]))?|([-+*/^])|([({])|([)}])|\\frac(?![A-Za-z])/y;

/** The canonical spelling solver-rules and desmos-latex use: x_1 and x_{1} are both x_{1}. */
function tokenize(latex: string): Token[] | null {
  const text = latex
    .replace(/[−–]/g, "-")
    .replace(/[·×]|\\(?:cdot|times)(?![A-Za-z])/g, "*")
    .replace(/\\(?:left|right)(?![A-Za-z])/g, "");
  const tokens: Token[] = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < text.length) {
    const match = TOKEN.exec(text);
    if (!match) return null;
    const [whole, number, letter, braced, bare, op, open, close] = match;
    if (/^\s+$/.test(whole)) continue;
    if (number) tokens.push({ kind: "number", value: parseDecimal(number) });
    else if (letter) {
      const subscript = braced ?? bare;
      tokens.push({ kind: "name", name: subscript === undefined ? letter : `${letter}_{${subscript}}` });
    } else if (op) tokens.push({ kind: "op", op: op as "+" | "-" | "*" | "/" | "^" });
    else if (open) tokens.push({ kind: "open", close: open === "(" ? ")" : "}" });
    else if (close) tokens.push({ kind: "close", char: close as ")" | "}" });
    else tokens.push({ kind: "frac" });
  }
  return tokens;
}

class Unverifiable extends Error {}

/**
 * The expression as an exact affine form in the names `role` calls variables,
 * or null when it is outside the subset, uses a name `role` does not know, or
 * is not affine (x_{1}y_{1}, a^{2}, division by an unknown).
 */
export function affineForm(latex: string, role: NameRole): AffineForm | null {
  const parsed = tokenize(latex);
  if (!parsed || parsed.length === 0) return null;
  const tokens: Token[] = parsed;
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const fail = (): never => {
    throw new Unverifiable();
  };
  const expectClose = (char: ")" | "}") => {
    const token = take();
    if (token?.kind !== "close" || token.char !== char) fail();
  };
  const startsFactor = (token: Token | undefined) =>
    token !== undefined && (token.kind === "number" || token.kind === "name" || token.kind === "open" || token.kind === "frac");

  const multiply = (left: AffineForm, right: AffineForm): AffineForm => {
    if (left.terms.size === 0) return scaled(right, left.constant);
    if (right.terms.size === 0) return scaled(left, right.constant);
    return fail();
  };
  const divide = (left: AffineForm, right: AffineForm): AffineForm =>
    right.terms.size > 0 || isZero(right.constant) ? fail() : scaled(left, over(ONE, right.constant));

  function atom(): AffineForm {
    const token = take();
    if (!token) return fail();
    if (token.kind === "number") return constantForm(token.value);
    if (token.kind === "name") {
      const value = role(token.name);
      if (value === null) return fail();
      return value === "variable" ? { constant: ZERO, terms: new Map([[token.name, ONE]]) } : constantForm(value);
    }
    if (token.kind === "open") {
      const inner = expression();
      expectClose(token.close);
      return inner;
    }
    if (token.kind === "frac") {
      const numerator = braced();
      return divide(numerator, braced());
    }
    return fail();
  }

  function braced(): AffineForm {
    const token = take();
    if (token?.kind !== "open" || token.close !== "}") return fail();
    const inner = expression();
    expectClose("}");
    return inner;
  }

  /** The integer after ^: one digit, or a braced or parenthesized constant. */
  function exponent(): bigint {
    const token = take();
    let form: AffineForm;
    if (token?.kind === "number") {
      // LaTeX takes one character after ^ unless braced: x^23 is x^2 times 3.
      if (token.value.d !== ONE_BIG || token.value.n > NINE_BIG) return fail();
      form = constantForm(token.value);
    } else if (token?.kind === "open") {
      form = expression();
      expectClose(token.close);
    } else {
      return fail();
    }
    if (form.terms.size > 0 || form.constant.d !== ONE_BIG) return fail();
    return form.constant.n;
  }

  function power(): AffineForm {
    const base = atom();
    const next = peek();
    if (next?.kind !== "op" || next.op !== "^") return base;
    take();
    const k = exponent();
    if (k === ONE_BIG) return base;
    if (base.terms.size > 0 || absolute(k) > MAX_EXPONENT) return fail();
    if (k < ZERO_BIG && isZero(base.constant)) return fail();
    let result = ONE;
    for (let index = ZERO_BIG; index < absolute(k); index++) result = times(result, base.constant);
    return constantForm(k < ZERO_BIG ? over(ONE, result) : result);
  }

  function term(): AffineForm {
    let form = power();
    let lastWasNumber = tokens[position - 1]?.kind === "number";
    for (;;) {
      const next = peek();
      if (next?.kind === "op" && next.op === "*") {
        take();
        form = multiply(form, power());
      } else if (next?.kind === "op" && next.op === "/") {
        take();
        form = divide(form, power());
        // a/2x is read differently by different parsers; never guess.
        if (startsFactor(peek())) return fail();
      } else if (startsFactor(next)) {
        // "2 3" is not a product Desmos writes; 2x and 2(x+1) are.
        if (lastWasNumber && next!.kind === "number") return fail();
        form = multiply(form, power());
      } else {
        return form;
      }
      lastWasNumber = tokens[position - 1]?.kind === "number";
    }
  }

  function expression(): AffineForm {
    const sign = peek();
    let negate = false;
    if (sign?.kind === "op" && (sign.op === "+" || sign.op === "-")) {
      take();
      negate = sign.op === "-";
    }
    let form = term();
    if (negate) form = scaled(form, rational(-ONE_BIG));
    for (;;) {
      const next = peek();
      if (next?.kind !== "op" || (next.op !== "+" && next.op !== "-")) return form;
      take();
      const right = term();
      form = combine(form, right, rational(next.op === "+" ? ONE_BIG : -ONE_BIG));
    }
  }

  try {
    const form = expression();
    return position === tokens.length ? form : null;
  } catch (error) {
    if (error instanceof Unverifiable || error instanceof RangeError) return null;
    throw error;
  }
}

/**
 * The single value every exact solution of `conditions` (each a form that
 * must equal zero) gives `readout`, or null when there is no such value: the
 * conditions contradict each other, or the readout still moves along the
 * solution set. Fixed means the readout's coefficients are a combination of
 * the conditions' coefficients, checked by exact row reduction.
 */
export function determinedValue(conditions: readonly AffineForm[], readout: AffineForm): Rational | null {
  const names = [...new Set([...conditions.flatMap((form) => [...form.terms.keys()]), ...readout.terms.keys()])].sort();
  type Row = { coefficients: Rational[]; rhs: Rational };
  let remaining: Row[] = conditions.map((form) => ({
    coefficients: names.map((name) => form.terms.get(name) ?? ZERO),
    rhs: times(rational(-ONE_BIG), form.constant),
  }));
  const pivots: { column: number; row: Row }[] = [];
  names.forEach((_name, column) => {
    const index = remaining.findIndex((row) => !isZero(row.coefficients[column]));
    if (index === -1) return;
    const [chosen] = remaining.splice(index, 1);
    const lead = chosen.coefficients[column];
    const row = { coefficients: chosen.coefficients.map((value) => over(value, lead)), rhs: over(chosen.rhs, lead) };
    const eliminate = (other: Row): Row => {
      const factor = other.coefficients[column];
      if (isZero(factor)) return other;
      return {
        coefficients: other.coefficients.map((value, at) => minus(value, times(factor, row.coefficients[at]))),
        rhs: minus(other.rhs, times(factor, row.rhs)),
      };
    };
    remaining = remaining.map(eliminate);
    for (const pivot of pivots) pivot.row = eliminate(pivot.row);
    pivots.push({ column, row });
  });
  // A row left with no pivot reads 0 = rhs: a contradiction unless rhs is 0.
  if (remaining.some((row) => !isZero(row.rhs))) return null;
  let coefficients = names.map((name) => readout.terms.get(name) ?? ZERO);
  let value = readout.constant;
  for (const { column, row } of pivots) {
    const factor = coefficients[column];
    if (isZero(factor)) continue;
    coefficients = coefficients.map((entry, at) => minus(entry, times(factor, row.coefficients[at])));
    value = plus(value, times(factor, row.rhs));
  }
  return coefficients.every(isZero) ? value : null;
}
