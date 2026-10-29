import type { Explanation } from "./solve-cache";
import type { Candidate } from "./strategy-selection";

/** Exact verification and a reproducible two-root fit for integer radical forms.
 * The coefficient arithmetic stays internal; students graph the original equation.
 * Nonsquare discriminants make the stated integer representation unique. */
function integerRoot(n: bigint): bigint | null {
  if (n < BigInt(0)) return null;
  if (n < BigInt(2)) return n;
  let lo = BigInt(0), hi = n;
  while (lo + BigInt(1) < hi) {
    const mid = (lo + hi) / BigInt(2);
    if (mid * mid <= n) lo = mid;
    else hi = mid;
  }
  return lo;
}
function normalize(question: string): string {
  return question.replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/²/g, '^2')
    .replace(/\^\{2\}/g, '^2').replace(/\\(?:left|right)/g, '')
    .replace(/\\sqrt\{([a-z])\}/g, 'sqrt($1)')
    .replace(/\\frac\{([a-z])\+sqrt\(([a-z])\)\}\{(\d+)\}/g, '($1+sqrt($2))/$3')
    .replace(/\$/g, '').replace(/\s+/g, '');
}
// Deliberately a closed grammar: do not silently discard extra assumptions.
const EQUATION = String.raw`(?<A>\d*)x\^2(?<B>[+-]\d*)x(?<C>[+-]\d+)=0`;
const FORM = String.raw`(?:canbe(?:written|expressed)(?:as|intheform)|is(?:(?:written|expressed)(?:as|intheform)|intheform)?)\((?<u>[a-df-hj-su-wz])\+sqrt\((?<v>[a-df-hj-su-wz])\)\)\/(?<den>[1-9]\d*),?where\k<u>and\k<v>areintegers\.(?:whatis(?:thevalueof)?|find)\k<u>\+\k<v>[?.]?`;
const GRAMMARS = [
  new RegExp(`^${EQUATION}\\.?(?:one|a)(?:solution|root)(?:(?:to|of)(?:the)?(?:given)?(?:quadratic)?equation)?${FORM}$`, "i"),
  new RegExp(`^(?:one|a)(?:solution|root)(?:of|to)${EQUATION}${FORM}$`, "i"),
];
const countDigits = (s: string) => s.replace(/^[+-]/, '').length;

export function parseQuadraticRootForm(question: string) {
  const text = normalize(question);
  const match = GRAMMARS.map(grammar => text.match(grammar)).find(Boolean);
  const g = match?.groups;
  if (!g || g.u === g.v) return null;
  const aText = g.A || '1';
  const bText = g.B === '+' ? '1' : g.B === '-' ? '-1' : g.B;
  // These bounds are numerical conditioning limits, not question coefficients.
  if ([aText, bText, g.C, g.den].some(s => countDigits(s) > 5)) return null;
  const ai = BigInt(aText), bi = BigInt(bText), ci = BigInt(g.C), deni = BigInt(g.den);
  if (ai <= BigInt(0) || ai > BigInt(1000) || bi < -BigInt(1000) || bi > BigInt(1000) || ci < -BigInt(1000) || ci > BigInt(1000) || deni !== BigInt(2) * ai) return null;
  const discriminant = bi * bi - BigInt(4) * ai * ci;
  const s = integerRoot(discriminant);
  if (s === null || discriminant <= BigInt(0) || s * s === discriminant) return null;
  const exactU = -bi, exactV = discriminant;
  // Independent coefficient reconstruction certifies the proposed integer form.
  // Since D is nonsquare, moving an integer into/out of sqrt(D) cannot yield another integer radicand.
  // Thus the stated integer representation is unique. Verify (d*x-u)^2-v = 4*A*(A*x^2+B*x+C).
  if (deni * deni !== BigInt(4) * ai * ai || -BigInt(2) * deni * exactU !== BigInt(4) * ai * bi || exactU * exactU - exactV !== BigInt(4) * ai * ci) return null;
  const A = Number(ai), B = Number(bi), C = Number(ci), denominator = Number(deni), D = Number(discriminant);
  // Stable quadratic roots; the formula is verification only, never a student row.
  const q = -0.5 * (B + (B < 0 ? -1 : 1) * Math.sqrt(D));
  const roots = [q / A, C / q].sort((a, b) => b - a);
  const clicked = roots.map(x => Number(x.toPrecision(6)));
  if (clicked.some(x => !Number.isFinite(x) || Math.abs(x) > 10000) || clicked[0] <= clicked[1]) return null;
  const fittedU = denominator * (clicked[0] + clicked[1]) / 2;
  const fittedV = (denominator * (clicked[0] - clicked[1]) / 2) ** 2;
  if (Math.abs(fittedU - Number(exactU)) >= 0.1 || Math.abs(fittedV - Number(exactV)) >= 0.1) return null;
  // The gap from the rounding boundary is much larger than floating-point error.
  if (Math.round(fittedU) !== Number(exactU) || Math.round(fittedV) !== Number(exactV)) return null;
  return { A, B, C, denominator, u: g.u, v: g.v, exactU: Number(exactU), exactV: Number(exactV), answer: Number(exactU + exactV), roots, clicked,
    originalPolynomial: `${g.A}x^2${g.B}x${g.C}`, fittedU, fittedV };
}

export function quadraticRootFormPlan(question: string): {
  candidate: Candidate; explanation: Explanation; structure: string;
  supportsChoices: true; discard: Candidate["techniqueId"][];
} | null {
  const data = parseQuadraticRootForm(question);
  if (!data) return null;
  const { A, denominator, u, v, exactU, exactV, answer, clicked, originalPolynomial } = data;
  const upper = String(clicked[0]), lower = String(clicked[1]);
  const rows = [originalPolynomial,
    `[(${u}+\\sqrt{${v}})/${denominator},(${u}-\\sqrt{${v}})/${denominator}]\\sim[${upper},${lower}]`,
    `${u}+${v}`, `\\operatorname{round}(${u})+\\operatorname{round}(${v})`];
  const span = data.roots[0] - data.roots[1], margin = Math.max(1, span * 0.15), vertexY = -exactV / (4 * A);
  return {
    candidate: {
      techniqueId: 'bracket-regression', strategy: null, rung: 4,
      rows: rows.map(latex => ({ latex, slider: null, copiesRow: null })),
      answer: String(answer), result: { type: 'numeric', row: 4, relatedRows: [1, 2], value: answer, listIndex: null, answerFrom: 'value', choiceLabel: null, detail: 'Sum of the fitted integer parameters; rounding removes copied-root precision error' },
      answerState: null, parameters: [], conditionType: null, distinguishes: null,
      graphBounds: { left: data.roots[1] - margin, right: data.roots[0] + margin, bottom: vertexY * 1.2 - 1, top: Math.max(1, -vertexY * 0.15) },
      cost: { derivationSteps: 0, oneOffFacts: 0, newPrimitives: 0, setupConstructions: 0, manualIterations: 0 },
    },
    // A graph supplies approximate roots, not the requested integer radical
    // parameters. A graph-only alternative must not win by hiding the missing
    // fit in its prose. The complete, checked two-root fit is retained above.
    supportsChoices: true, discard: ['parameter-regression', 'slider-condition', 'graph-raw', 'graph-both-sides', 'intercept-read'],
    structure: 'Graph both roots and fit the two conjugate radical forms together, determining both integer parameters.',
    explanation: {
      why: `Graph the printed quadratic and click both x-intercepts. Match the plus form to the larger root and the minus form to the smaller root in one bracket regression. The two matches determine both ${u} and ${v} without manually finding either coefficient. The copied roots are approximate, so the fit gives values near ${u}=${exactU} and ${v}=${exactV}. The question requires integers; row 4 rounds each fitted parameter before adding.`,
      handMath: 'Copy both clicked root coordinates in matching order. Read the nearby integers; the last row performs the rounding and addition.',
      readAnswer: `Click both x-intercepts of row 1: approximately ${upper} and ${lower}. Row 2 fits ${u}≈${exactU} and ${v}≈${exactV}. Row 3 shows the approximate sum. Row 4 gives ${u}+${v}=${answer} after rounding each fitted integer parameter.`,
      steps: [], purposes: [
        `Graphs the equation as printed. Copy both x-intercepts: approximately ${upper} and ${lower}.`,
        `Fits both conjugate forms to the two copied roots together. Leave ${u} and ${v} undefined so Desmos fits them; do not add fixed-value sliders.`,
        `Displays the approximate fitted ${u}+${v}; small decimal tails come from the copied roots.`,
        'Rounds each fitted integer parameter, as required by the question, then adds them. This is explicit rounding of an approximate fit, not an integer-constrained regression.',
      ],
    },
  };
}
