import { rational, type AffineForm, type NameRole, type Rational } from "./linear-forms";

/** A bounded polynomial proof, not a numerical test at a few chosen inputs.
 * The caller supplies the complete affine solution space from exact row
 * reduction. Substituting that space leaves a constant exactly when the
 * readout has the same value for every solution of the linear conditions. */
const LIMITS = { degree: 6, variables: 6, terms: 128, tokens: 512, text: 4096, coefficientBits: 512, operations: 50_000 };
const ZERO = rational(BigInt(0));
const ONE = rational(BigInt(1));
const NEGATIVE_ONE = rational(BigInt(-1));

// A monomial is its sorted variable names, repeated for each power. The empty
// key denotes the constant term; legal one-letter/subscripted names never use *.
type Polynomial = Map<string, Rational>;
type Token =
  | { kind: "number"; value: Rational; raw: string }
  | { kind: "name"; name: string }
  | { kind: "op"; value: string }
  | { kind: "open"; close: string }
  | { kind: "close"; value: string }
  | { kind: "frac" };

class Unverifiable extends Error {}
const fail = (): never => { throw new Unverifiable(); };
const factors = (monomial: string) => monomial ? monomial.split("*") : [];
const zero = (value: Rational) => value.n === BigInt(0);
const constant = (value: Rational): Polynomial => zero(value) ? new Map() : new Map([["", value]]);

function tokenize(latex: string): Token[] {
  if (!latex || latex.length > LIMITS.text) return fail();
  const text = latex.replace(/[−–]/g, "-")
    .replace(/[·×]|\\(?:cdot|times)(?![A-Za-z])/g, "*")
    .replace(/\\(?:left|right)(?![A-Za-z])/g, "");
  const pattern = /\s+|(\d+(?:\.\d+)?|\.\d+)|([A-Za-z])(?:_\{([A-Za-z0-9]+)\}|_([A-Za-z0-9]))?|([-+*/^])|([({])|([)}])|\\frac(?![A-Za-z])/y;
  const tokens: Token[] = [];
  while (pattern.lastIndex < text.length) {
    const match = pattern.exec(text);
    if (!match) return fail();
    const [whole, number, letter, braced, bare, op, open, close] = match;
    if (/^\s+$/.test(whole)) continue;
    if (tokens.length >= LIMITS.tokens) return fail();
    if (number) {
      if (number.length > 64) return fail();
      const [integer, decimal = ""] = number.split(".");
      tokens.push({ kind: "number", value: rational(BigInt(`${integer}${decimal}`), BigInt(10) ** BigInt(decimal.length)), raw: number });
    } else if (letter) {
      const subscript = braced ?? bare;
      if (subscript && subscript.length > 16) return fail();
      tokens.push({ kind: "name", name: subscript === undefined ? letter : `${letter}_{${subscript}}` });
    } else if (op) tokens.push({ kind: "op", value: op });
    else if (open) tokens.push({ kind: "open", close: open === "(" ? ")" : "}" });
    else if (close) tokens.push({ kind: "close", value: close });
    else tokens.push({ kind: "frac" });
  }
  return tokens;
}

/** Returns null for unknown syntax, exceeded bounds, a nonconstant readout,
 * or an inconsistent affine system (represented by a null solution space).
 * Division is allowed only by a constant, nonzero polynomial before fitting;
 * a variable denominator is never canceled using a fitted value. */
export function polynomialReadoutValue(
  latex: string,
  role: NameRole,
  solutionSpace: ReadonlyMap<string, AffineForm> | null,
): Rational | null {
  return analyzePolynomial(latex, role, solutionSpace, false);
}

/** Shape recognition only: this expression is a bounded scalar polynomial in
 * known scalar names, never a data list, function call, or broadcast value.
 * This does not claim its value or fitted parameters are determined. */
export function isScalarPolynomial(latex: string, role: NameRole): boolean {
  return analyzePolynomial(latex, role, null, true) !== null;
}

/** Exact bounded coefficients for identity checks. Keys are sorted products of
 * variable names; an empty key is the constant. No floating sample fitting. */
export function polynomialTerms(latex: string, role: NameRole): ReadonlyMap<string, Rational> | null {
  let result: ReadonlyMap<string, Rational> | null = null;
  analyzePolynomial(latex, role, null, true, terms => { result = terms; });
  return result;
}

function analyzePolynomial(
  latex: string,
  role: NameRole,
  solutionSpace: ReadonlyMap<string, AffineForm> | null,
  syntaxOnly: boolean,
  parsed?: (terms: ReadonlyMap<string, Rational>) => void,
): Rational | null {
  if (!syntaxOnly && (!solutionSpace || solutionSpace.size > LIMITS.variables)) return null;
  let operations = 0;
  const knownNames = new Set<string>();
  const spend = () => { if (++operations > LIMITS.operations) fail(); };
  const bounded = (value: Rational): Rational => {
    if (value.n.toString(2).replace("-", "").length > LIMITS.coefficientBits ||
        value.d.toString(2).length > LIMITS.coefficientBits) return fail();
    return value;
  };
  const plus = (a: Rational, b: Rational) => { spend(); return bounded(rational(a.n * b.d + b.n * a.d, a.d * b.d)); };
  const times = (a: Rational, b: Rational) => { spend(); return bounded(rational(a.n * b.n, a.d * b.d)); };
  const add = (left: Polynomial, right: Polynomial, scale = ONE): Polynomial => {
    const result = new Map(left);
    for (const [key, coefficient] of right) {
      const value = plus(result.get(key) ?? ZERO, times(coefficient, scale));
      if (zero(value)) result.delete(key);
      else result.set(key, value);
      if (result.size > LIMITS.terms) return fail();
    }
    return result;
  };
  const multiply = (left: Polynomial, right: Polynomial): Polynomial => {
    const result: Polynomial = new Map();
    for (const [a, av] of left) for (const [b, bv] of right) {
      const names = [...factors(a), ...factors(b)].sort();
      if (names.length > LIMITS.degree) return fail();
      const key = names.join("*");
      const value = plus(result.get(key) ?? ZERO, times(av, bv));
      if (zero(value)) result.delete(key);
      else result.set(key, value);
      if (result.size > LIMITS.terms) return fail();
    }
    return result;
  };
  const scalar = (form: Polynomial): Rational | null => form.size === 0 ? ZERO : form.size === 1 && form.has("") ? form.get("")! : null;
  const divide = (left: Polynomial, right: Polynomial): Polynomial => {
    const denominator = scalar(right);
    if (!denominator || zero(denominator)) return fail();
    return multiply(left, constant(bounded(rational(denominator.d, denominator.n))));
  };

  try {
    const tokens = tokenize(latex);
    let position = 0;
    const peek = () => tokens[position];
    const take = () => tokens[position++];
    const startsFactor = (token: Token | undefined) => token && ["number", "name", "open", "frac"].includes(token.kind);
    const close = (character: string) => {
      const token = take();
      if (token?.kind !== "close" || token.value !== character) fail();
    };
    function braced(): Polynomial {
      const token = take();
      if (token?.kind !== "open" || token.close !== "}") return fail();
      const result = expression();
      close("}");
      return result;
    }
    function atom(): Polynomial {
      const token = take();
      if (!token) return fail();
      if (token.kind === "number") return constant(bounded(token.value));
      if (token.kind === "name") {
        const value = role(token.name);
        if (value === null) return fail();
        if (value !== "variable") return constant(bounded(value));
        knownNames.add(token.name);
        if (knownNames.size > LIMITS.variables) return fail();
        return new Map([[token.name, ONE]]);
      }
      if (token.kind === "open") {
        const result = expression();
        close(token.close);
        return result;
      }
      if (token.kind === "frac") return divide(braced(), braced());
      return fail();
    }
    function power(): Polynomial {
      const base = atom();
      const next = peek();
      if (next?.kind !== "op" || next.value !== "^") return base;
      take();
      const exponent = take();
      let value: Rational | null;
      if (exponent?.kind === "number") {
        // LaTeX consumes one character after an unbraced ^. Numeric reduction
        // must not turn ^02 or ^2.0 into ^2: Desmos evaluates different rows.
        if (!/^[0-6]$/.test(exponent.raw)) return fail();
        value = exponent.value;
      } else if (exponent?.kind === "open" && exponent.close === "}") {
        value = scalar(expression());
        close(exponent.close);
      } else return fail();
      if (!value || value.d !== BigInt(1) || value.n < BigInt(0) || value.n > BigInt(LIMITS.degree)) return fail();
      let result = constant(ONE);
      for (let count = 0; count < Number(value.n); count++) result = multiply(result, base);
      return result;
    }
    function term(): Polynomial {
      let result = power();
      let lastWasNumber = tokens[position - 1]?.kind === "number";
      for (;;) {
        const next = peek();
        if (next?.kind === "op" && next.value === "*") { take(); result = multiply(result, power()); }
        else if (next?.kind === "op" && next.value === "/") {
          take(); result = divide(result, power());
          if (startsFactor(peek())) return fail();
        } else if (startsFactor(next)) {
          if (lastWasNumber && next?.kind === "number") return fail();
          result = multiply(result, power());
        } else return result;
        lastWasNumber = tokens[position - 1]?.kind === "number";
      }
    }
    function expression(): Polynomial {
      const sign = peek();
      let scale = ONE;
      if (sign?.kind === "op" && ["+", "-"].includes(sign.value)) {
        take();
        if (sign.value === "-") scale = NEGATIVE_ONE;
      }
      let result = multiply(constant(scale), term());
      for (;;) {
        const next = peek();
        if (next?.kind !== "op" || !["+", "-"].includes(next.value)) return result;
        take();
        result = add(result, term(), next.value === "-" ? NEGATIVE_ONE : ONE);
      }
    }
    const target = expression();
    if (position !== tokens.length) return null;
    if (syntaxOnly) { parsed?.(target); return ZERO; }
    if (!solutionSpace) return null;
    const substitutions = new Map<string, Polynomial>();
    for (const name of knownNames) {
      const affine = solutionSpace.get(name);
      if (!affine || affine.terms.size > LIMITS.variables) return null;
      const form = constant(bounded(affine.constant));
      for (const [free, coefficient] of affine.terms) {
        if (!solutionSpace.has(free) || !/^[A-Za-z](?:_\{[A-Za-z0-9]{1,16}\})?$/.test(free)) return null;
        if (!zero(coefficient)) form.set(free, bounded(coefficient));
      }
      substitutions.set(name, form);
    }
    let reduced: Polynomial = new Map();
    for (const [monomial, coefficient] of target) {
      let term = constant(coefficient);
      for (const name of factors(monomial)) term = multiply(term, substitutions.get(name) ?? fail());
      reduced = add(reduced, term);
    }
    return scalar(reduced);
  } catch (error) {
    if (error instanceof Unverifiable || error instanceof RangeError) return null;
    throw error;
  }
}
