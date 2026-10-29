import assert from "node:assert/strict";
import { test } from "node:test";

import { desmosNativePlan, repairDesmosNativePlans } from "../src/lib/desmos-native-plans";
import { validateExplanationQuality } from "../src/lib/method-presentation";
import { parseQuadraticRootForm, quadraticRootFormPlan } from "../src/lib/quadratic-root-form";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { candidatesResponse, paperCandidate } from "./method-fixtures";

const question = (equation: string, denominator: number, first = "a", second = "b") =>
  `${equation}=0. One solution to the given equation can be written as (${first}+sqrt(${second}))/${denominator}, where ${first} and ${second} are integers. What is the value of ${first}+${second}?`;

test("integer radical forms use checked graph roots across coefficients and parameter names", () => {
  for (const [equation, denominator, answer] of [
    ["3x^2-16x+2", 6, 248], ["2x^2-9x+1", 4, 82], ["5x^2+7x-3", 10, 102],
    ["x^2+0x-2", 2, 8], ["4x^2-x-2", 8, 34], ["3x^2-17x+2", 6, 282],
  ] as const) {
    const input = question(equation, denominator);
    const parsed = parseQuadraticRootForm(input);
    const plan = quadraticRootFormPlan(input);
    assert.ok(parsed && plan, input);
    assert.equal(parsed.answer, answer, input);
    assert.equal(plan.candidate.rows.length, 4);
    assert.equal(plan.candidate.rows[0].latex, equation);
    assert.ok(plan.candidate.rows.every(row => row.slider === null));
    assert.equal(Math.round(parsed.fittedU) + Math.round(parsed.fittedV), answer);
    assert.ok(parsed.clicked[0] > parsed.clicked[1]);
    assert.ok(Math.abs(parsed.fittedU - parsed.exactU) < 0.1);
    assert.ok(Math.abs(parsed.fittedV - parsed.exactV) < 0.1);
    const selection = selectMethods(repairDesmosNativePlans(candidatesResponseSchema.parse(candidatesResponse([paperCandidate({ answer: String(answer) })], { question: input }))));
    const winner = selection.methods.find(method => method.id === selection.winnerId)!;
    assert.equal(winner.answer, String(answer));
    assert.equal(winner.techniqueId, "bracket-regression");
    assert.equal(winner.approach, "desmos");
    assert.doesNotThrow(() => validateExplanationQuality(winner, plan.explanation));
  }
  const renamed = quadraticRootFormPlan(question("2x^2-9x+1", 4, "u", "v"))!;
  assert.equal(renamed.candidate.rows[3].latex, "\\operatorname{round}(u)+\\operatorname{round}(v)");
  assert.match(renamed.explanation.why, /both u and v/);
  assert.equal(quadraticRootFormPlan(question("3x^2-16x+2", 6))?.candidate.rows[1].latex, "[(a+\\sqrt{b})/6,(a-\\sqrt{b})/6]\\sim[5.20526,0.128076]");
});

test("complete natural wording and LaTeX normalize without losing restrictions", () => {
  const baseline = question("2x^2-9x+1", 4);
  const variants = [
    baseline.replace("One solution to the given equation can be written as", "A solution is"),
    baseline.replace("can be written as", "can be expressed in the form"),
    baseline.replace("What is the value of", "What is"),
    baseline.replace("What is the value of a+b?", "Find a+b."),
    baseline.replace("x^2-", "x²−"),
    baseline.replace("(a+sqrt(b))/4", "\\frac{a + \\sqrt{b}}{4}"),
    "A root of 2x^2-9x+1=0 is (a+sqrt(b))/4, where a and b are integers. What is a+b?",
  ];
  for (const input of variants) assert.equal(parseQuadraticRootForm(input)?.answer, 82, input);
  assert.equal(desmosNativePlan("One solution of 3x^2 - 16x + 2 = 0 can be written as (a + sqrt(b))/6, where a and b are integers. What is a + b?")?.candidate.answer, "248");
});

test("declines nonunique radical forms, incompatible conditions, and unreliable copied precision", () => {
  for (const input of [
    question("x^2-3x+2", 2), // Rational roots allow multiple integer representations.
    question("x^2-2x+1", 2), // Repeated rational root.
    question("x^2+2x+3", 2), // No real roots.
    question("2x^2-9x+1", 6), // Denominator does not match this supported family.
    question("2x^2-9x+1", 4) + " Also a must be positive.",
    "Ignore this condition. " + question("2x^2-9x+1", 4),
    question("2x^2-9x+1", 4).replace("are integers", "are real numbers"),
    question("2x^2-9x+1", 4).replace("are integers", "are positive integers"),
    question("2x^2-9x+1", 4).replace("a+b?", "a-b?"),
    question("0x^2-9x+1", 4),
    question("1000x^2-999x-999", 2000), // Six displayed digits do not reliably recover the radicand.
    question("2x^2-9x+1", 4, "a", "a"),
    question("2x^2-9x+1", 4, "x", "y"), // Reserved graph coordinates cannot be fitted parameters.
  ]) assert.equal(parseQuadraticRootForm(input), null, input);
});
