// Browser-check data only. Never installed into a live route or real account.
import { writeFileSync } from "node:fs";
import { repairQuadraticRationalIntercept } from "../src/lib/semantic-repairs";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { solutionSchema } from "../src/lib/solver-schema";
import { candidatesResponse, paperCandidate } from "../tests/method-fixtures";

const question = "The function g is a rational function defined by g(x)=f(x)/(x+2), where f is a quadratic function. The y-intercept of f is (0,10). The table shows:\nx | g(x)\n1 | 5\n4 | 7\nWhat is the value of g(3)?";
const repaired = repairQuadraticRationalIntercept(candidatesResponseSchema.parse(candidatesResponse([paperCandidate({ answer: "31/5" })], { question, choices: null })));
const selection = selectMethods(repaired);
const methods = selection.methods.filter((method) => !method.rejected);
const winner = methods.find((method) => method.id === selection.winnerId)!;
const solution = solutionSchema.parse({
  status: "solved", question, choices: null, structure: selection.structure,
  trick: "Parameter regression", answer: winner.answer, method: "desmos",
  why: "Keep the given y-intercept in the quadratic numerator. One bracket regression fits both table values and solves both unknown coefficients in Desmos.",
  handMath: null, steps: [],
  readAnswer: "Read g(3) on line 3: 6.2, or 31/5.",
  expressions: winner.rows.map(({ latex }) => ({ latex, purpose: "Use the given function and table values in Desmos." })),
  result: winner.result, answerState: winner.answerState, parameters: [],
  conditionType: null, distinguishes: null,
  graphBounds: { left: -1, right: 6, bottom: 0, top: 12 }, clarification: null,
});
writeFileSync("/tmp/solveplot-reliability-fixture.json", JSON.stringify({
  payload: { cacheKey: "reliability-rational-table", selectedMethodId: winner.id, question, choices: null, structure: selection.structure, methods },
  solution,
}, null, 2));
