import assert from "node:assert/strict";
import { test } from "node:test";

import { exactQuadraticProductTable, fitsExactQuadraticProductTable } from "../src/lib/quadratic-product-table";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { candidatesResponse, graphCandidate, paperCandidate, zeroCost } from "./method-fixtures";

const question = `The function g is defined by g(x) = (x + 1)f(x), where f is a quadratic function. The table shows four values of x and their corresponding values of g(x).
x | g(x)
-1 | 0
0 | -4
1 | -2
2 | 18
What is the value of f(-1)?`;

const rows = [
  "f(x)=ax^2+bx+c",
  "g(x)=(x+1)f(x)",
  "x_{1}=[-1,0,1,2]",
  "y_{1}=[0,-4,-2,18]",
  "y_{1}\\sim g(x_{1})",
  "f(-1)",
].map((latex) => ({ latex, slider: null, copiesRow: null }));
const quotientRows = [
  "f(x)=ax^2+bx+c",
  "x_{1}=[0,1,2]",
  "y_{1}=[-4/1,-2/2,18/3]",
  "y_{1}\\sim ax_{1}^2+bx_{1}+c",
  "f(-1)",
].map((latex) => ({ latex, slider: null, copiesRow: null }));

function regression(answer: string, value: number, overrideRows = rows) {
  return graphCandidate({
    techniqueId: "bracket-regression",
    rung: 4,
    rows: overrideRows,
    answer,
    result: {
      type: "numeric",
      row: 6,
      relatedRows: [],
      value,
      listIndex: null,
      answerFrom: "value",
      choiceLabel: null,
      detail: "f(-1)",
    },
    graphBounds: null,
    cost: { ...zeroCost },
  });
}

test("a zero-factor quadratic table determines f at its otherwise hidden input", () => {
  const table = exactQuadraticProductTable(question);
  assert.equal(table?.value, -3);
  assert.equal(fitsExactQuadraticProductTable(table!, rows, 6), true);
  assert.equal(fitsExactQuadraticProductTable(table!, quotientRows, 5), true);
  assert.equal(exactQuadraticProductTable(question.replace("-1 | 0", "-1 | 1")), null, "the zero-factor row must be zero");
  assert.equal(exactQuadraticProductTable(question.replace("quadratic function", "cubic function")), null);
  assert.equal(exactQuadraticProductTable(question.replace("f(-1)?", "f(0)?")), null);
});

test("all printed rows must agree with the same quadratic; calculator rows must fit those rows", () => {
  assert.equal(exactQuadraticProductTable(question.replace("2 | 18", "2 | 18\n3 | 68"))?.value, -3);
  assert.equal(exactQuadraticProductTable(question.replace("2 | 18", "2 | 18\n3 | 69")), null);
  const table = exactQuadraticProductTable(question)!;
  assert.equal(fitsExactQuadraticProductTable(table, rows.map((row, index) =>
    index === 3 ? { ...row, latex: "y_{1}=[0,-4,-2,19]" } : row), 6), false);
  assert.equal(fitsExactQuadraticProductTable(table, rows.map((row, index) =>
    index === 4 ? { ...row, latex: "y_{1}\\sim f(x_{1})" } : row), 6), false);
  assert.equal(fitsExactQuadraticProductTable(table, rows, 5), false);
  assert.equal(fitsExactQuadraticProductTable(table, quotientRows.map((row, index) =>
    index === 2 ? { ...row, latex: "y_{1}=[-4/1,-2/2,18/2]" } : row), 5), false);
});

test("the check handles a different zero factor and refuses an inconsistent fourth point", () => {
  const shifted = `The function g is defined by g(x) = (x - 2)f(x), where f is a quadratic function. The table gives g(x).
x | g(x)
0 | 2
1 | -2
2 | 0
3 | 14
4 | 46
What is the value of f(2)?`;
  assert.equal(exactQuadraticProductTable(shifted)?.value, 7);
  assert.equal(exactQuadraticProductTable(shifted.replace("4 | 46", "4 | 47")), null);
  assert.equal(exactQuadraticProductTable(shifted.replace("2 | 0", "2 | 1")), null);
});

test("captured wrong model readout is repaired, unsupported written answer rejected", () => {
  const wrongPaper = paperCandidate({
    techniqueId: "elimination",
    answer: "-6",
    result: { ...paperCandidate().result, detail: "f(-1) after determining the quadratic from the table" },
  });
  const selected = selectMethods(candidatesResponseSchema.parse(
    candidatesResponse([regression("-6", -6), wrongPaper], { question }),
  ));
  const winner = selected.methods.find((method) => method.id === selected.winnerId)!;
  assert.equal(winner.techniqueId, "bracket-regression");
  assert.equal(winner.answer, "-3");
  assert.equal(winner.result.value, -3);
  assert.match(winner.repairs.join(" "), /Corrected f\(-1\) from -6 to -3/);
  assert.equal(selected.methods.find((method) => method.techniqueId === "elimination")?.rejected?.rule,
    "quadratic-product-table-mismatch");
});

test("the correct value is untouched; an unsupported wrong regression is rejected", () => {
  const selected = selectMethods(candidatesResponseSchema.parse(candidatesResponse([regression("-3", -3)], { question })));
  assert.equal(selected.methods[0].answer, "-3");
  assert.doesNotMatch(selected.methods[0].repairs.join(" "), /Corrected f/);
  const wrongRows = rows.map((row, index) => index === 3 ? { ...row, latex: "y_{1}=[0,-4,-2,0]" } : row);
  assert.throws(() => selectMethods(candidatesResponseSchema.parse(candidatesResponse([
    regression("-6", -6, wrongRows),
  ], { question }))), /quadratic-product-table-mismatch/);
});
