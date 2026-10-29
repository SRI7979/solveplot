import assert from "node:assert/strict";
import { test } from "node:test";

import { exactLinearTableIntercept, graphsExactLinearTableFit, plottedLinearTableInterceptRow } from "../src/lib/linear-table-intercept";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { candidatesResponse, graphCandidate, paperCandidate, zeroCost } from "./method-fixtures";

const question = `The table shows three values of x and their corresponding values of f(x) for the linear function f.
x | f(x)
-4 | 11
1 | 1
6 | -9
The graph of y = f(x) in the xy-plane crosses the x-axis at the point (r, 0). What is the value of r?`;

const rows = ["x_{1}=[-4,1,6]", "y_{1}=[11,1,-9]", "y_{1}\\sim mx_{1}+b", "y=mx+b"]
  .map((latex) => ({ latex, slider: null, copiesRow: null }));

function regression(answer: string, value: number, overrideRows = rows) {
  return graphCandidate({
    techniqueId: "linear-regression",
    rung: 4,
    rows: overrideRows,
    answer,
    result: {
      type: "x_intercept",
      row: 4,
      relatedRows: [],
      value,
      listIndex: null,
      answerFrom: "value",
      choiceLabel: null,
      detail: "x-coordinate of the graph's x-intercept",
    },
    graphBounds: { left: -5, right: 7, bottom: -11, top: 13 },
    cost: { ...zeroCost },
  });
}

test("only an exact linear table and an explicit x-intercept question produce a deterministic check", () => {
  const table = exactLinearTableIntercept(question);
  assert.equal(table?.value, 1.5);
  assert.equal(graphsExactLinearTableFit(table!, rows, 4), true);
  assert.equal(exactLinearTableIntercept(question.replace("6 | -9", "6 | -8")), null, "scattered data is not an exact line");
  assert.equal(exactLinearTableIntercept(question.replace("x-axis", "y-axis")), null);
  assert.equal(exactLinearTableIntercept(question.replace("linear function", "line of best fit")), null);
  assert.equal(graphsExactLinearTableFit(table!, rows.map((row, index) =>
    index === 1 ? { ...row, latex: "y_{1}=[11,2,-9]" } : row), 4), false, "the listed point pairs must be the printed data");
});

test("captured wrong regression readout is corrected before methods-ready; unsupported wrong proof is rejected", () => {
  const wrongPaper = paperCandidate({
    techniqueId: "direct-arithmetic",
    answer: "1",
    result: { ...paperCandidate().result, detail: "the zero occurs at x=1" },
  });
  const selection = selectMethods(candidatesResponseSchema.parse(
    candidatesResponse([regression("1", 1), wrongPaper], { question }),
  ));
  const winner = selection.methods.find((method) => method.id === selection.winnerId)!;
  assert.equal(winner.techniqueId, "linear-regression");
  assert.equal(winner.answer, "1.5");
  assert.equal(winner.result.value, 1.5);
  assert.match(winner.repairs.join(" "), /Corrected the x-intercept from 1 to 1.5/);
  assert.equal(selection.methods.find((method) => method.techniqueId === "direct-arithmetic")?.rejected?.rule,
    "linear-table-intercept-mismatch");
});

test("a correct fraction remains unchanged; a wrong answer on an unverified graph is never repaired", () => {
  const correct = selectMethods(candidatesResponseSchema.parse(candidatesResponse([regression("3/2", 1.5)], { question })));
  assert.equal(correct.methods[0].answer, "3/2");
  assert.doesNotMatch(correct.methods[0].repairs.join(" "), /Corrected the x-intercept/);

  const wrongGraph = rows.map((row, index) => index === 3 ? { ...row, latex: "y=mx+2b" } : row);
  assert.throws(
    () => selectMethods(candidatesResponseSchema.parse(candidatesResponse([regression("1", 1, wrongGraph)], { question }))),
    /linear-table-intercept-mismatch/,
  );
});

test("a fitted table line can replace a derived intercept formula with a graph click", () => {
  const fittedRows = [...rows.slice(0, 3), { ...rows[3], latex: "f(x)=mx+b" }, { ...rows[3], latex: "r=-b/m" }];
  const table = exactLinearTableIntercept(question)!;
  assert.equal(plottedLinearTableInterceptRow(table, fittedRows, 5), 4);
  const fitted = graphCandidate({
    techniqueId: "linear-regression",
    rows: fittedRows,
    answer: "1",
    result: {
      type: "numeric", row: 5, relatedRows: [1, 2, 3, 4], value: 1,
      listIndex: null, answerFrom: "value", choiceLabel: null, detail: "r=-b/m",
    },
  });
  const paper = paperCandidate({ techniqueId: "direct-arithmetic", answer: "3/2" });
  const selection = selectMethods(candidatesResponseSchema.parse(candidatesResponse([fitted, paper], { question })));
  const winner = selection.methods.find((method) => method.id === selection.winnerId)!;
  assert.equal(winner.techniqueId, "linear-regression");
  assert.equal(winner.result.type, "x_intercept");
  assert.equal(winner.result.row, 4);
  assert.equal(winner.answer, "1.5", "the corrected answer must come from the exact table, not the wrong model readout");
  assert.deepEqual(winner.rows.map(({ latex }) => latex), fittedRows.slice(0, 4).map(({ latex }) => latex));
  assert.match(winner.repairs.join(" "), /Read the fitted line's x-intercept/);
});

test("the graph-click repair refuses a mismatched fit, graph, or derived formula", () => {
  const table = exactLinearTableIntercept(question)!;
  const fittedRows = [...rows.slice(0, 3), { ...rows[3], latex: "f(x)=mx+b" }, { ...rows[3], latex: "r=-b/m" }];
  assert.equal(plottedLinearTableInterceptRow(table, fittedRows.map((row, index) =>
    index === 1 ? { ...row, latex: "y_{1}=[11,2,-9]" } : row), 5), null);
  assert.equal(plottedLinearTableInterceptRow(table, fittedRows.map((row, index) =>
    index === 3 ? { ...row, latex: "f(x)=mx+2b" } : row), 5), null);
  assert.equal(plottedLinearTableInterceptRow(table, fittedRows.map((row, index) =>
    index === 4 ? { ...row, latex: "r=b/m" } : row), 5), null);
  assert.equal(plottedLinearTableInterceptRow(table, fittedRows.slice(0, 4), 4), null);
});
