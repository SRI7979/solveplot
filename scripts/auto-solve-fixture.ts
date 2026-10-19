// Recording data only: the recorder intercepts network requests. This file does
// not install a fixture in the live API or write a solve to a real account.
import { writeFileSync } from "node:fs";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { solutionSchema } from "../src/lib/solver-schema";

const question = "A quadratic function f has values f(1) = 8, f(2) = 15, and f(4) = 35. What is f(10)?";
const solution = solutionSchema.parse({
  status: "solved", question, choices: null,
  structure: "Three points of a quadratic function; find its value at another input",
  trick: "Three-point regression", answer: "143", method: "desmos",
  why: "Use the three given points to fit a quadratic in Desmos. The regression finds a, b, and c, so you can evaluate the function at 10 without solving equations by hand.",
  handMath: null, steps: [],
  readAnswer: "Desmos fits a = 1, b = 4, c = 3. The last line evaluates the fitted quadratic at 10 and displays 143.",
  expressions: [
    { latex: "x_1=[1,2,4]", purpose: "Copy the three x-values in their original order." },
    { latex: "y_1=[8,15,35]", purpose: "Copy the matching function values in the same order." },
    { latex: "y_1\\sim ax_1^2+bx_1+c", purpose: "Fit a quadratic to the three data pairs. Desmos solves for a, b, and c." },
    { latex: "y=ax^2+bx+c", purpose: "Graph the fitted quadratic." },
    { latex: "(x_1,y_1)", purpose: "Plot the three given points to see that the curve passes through them." },
    { latex: "a(10)^2+b(10)+c", purpose: "Evaluate the fitted quadratic at 10. This is f(10)." },
  ],
  result: { type: "numeric", row: 6, relatedRows: [], value: 143, listIndex: null, answerFrom: "value", choiceLabel: null, detail: "Read the last row: f(10) = 143" },
  answerState: null, parameters: [], conditionType: null, distinguishes: null,
  graphBounds: { left: -1, right: 11.5, bottom: -5, top: 160 }, clarification: null,
});
const candidate = {
  techniqueId: "three-point-regression", rung: 1,
  rows: solution.expressions.map(({ latex }) => ({ latex, slider: null })),
  answer: solution.answer, result: solution.result, graphBounds: solution.graphBounds,
  cost: { derivationSteps: 0, oneOffFacts: 0, newPrimitives: 0, setupConstructions: 0, manualIterations: 0 },
};
const selection = selectMethods(candidatesResponseSchema.parse({
  status: "solved", question, structure: solution.structure, choices: null,
  clarification: null, candidates: [candidate], preferredTechniqueId: null,
}));
const methods = selection.methods.filter(method => !method.rejected).map(method => ({ ...method, verified: true }));
if (methods.length !== 1) throw new Error("Recording regression must pass production strategy validation");
writeFileSync("/tmp/desmo-auto-solve-fixture.json", JSON.stringify({
  payload: { cacheKey: "recording-quadratic-regression", selectedMethodId: selection.winnerId, question, choices: null, structure: solution.structure, methods },
  solution,
}, null, 2));
