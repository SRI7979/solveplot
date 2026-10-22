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
  why: "Fit the three points, then use f(10) to read the answer.",
  handMath: null, steps: [],
  readAnswer: "The last line shows f(10) = 143.",
  expressions: [
    { latex: "x_1=[1,2,4]", purpose: "Copy the three x-values in their original order." },
    { latex: "y_1=[8,15,35]", purpose: "Copy the matching function values in the same order." },
    { latex: "(x_1,y_1)", purpose: "Plot the three given points." },
    { latex: "y_1\\sim ax_1^2+bx_1+c", purpose: "Fit a quadratic. Desmos finds a, b, and c." },
    { latex: "f(x)=ax^2+bx+c", purpose: "Name the fitted curve f(x)." },
    { latex: "f(10)", purpose: "Enter f(10). Desmos gives 143." },
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
writeFileSync("/tmp/solveplot-auto-solve-fixture.json", JSON.stringify({
  payload: { cacheKey: "recording-quadratic-regression", selectedMethodId: selection.winnerId, question, choices: null, structure: solution.structure, methods },
  solution,
}, null, 2));
