import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { assessDesmosCoverage, candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { repairDesmosNativePlans, desmosNativePlan } from "../src/lib/desmos-native-plans";
import { createMemorySolveCache } from "../src/lib/solve-cache";
import { createTrace, solveProblem, type PipelineDeps } from "../src/lib/solve-pipeline";
import { candidatesResponse, explanation, graphCandidate, mockModel, paperCandidate } from "./method-fixtures";

const gold = JSON.parse(readFileSync("evals/problems/095-root-minimum-regression.json", "utf8"));
afterEach(() => mock.restoreAll());

test("a paper derivation mislabeled translation cannot suppress the Desmos search", async () => {
  const mislabeled = paperCandidate({ techniqueId: "translate-the-words" });
  const selection = selectMethods(candidatesResponseSchema.parse(candidatesResponse([mislabeled])));
  assert.equal(selection.winnerId, "direct-arithmetic");
  assert.equal(assessDesmosCoverage(selection).recoveryRequired, true);
  const { requests } = mockModel({
    candidates: (_body: Record<string, unknown>, call: number) => candidatesResponse(call === 1 ? [mislabeled] : [graphCandidate(), mislabeled]),
    explanation: explanation(1),
  });
  const trace = createTrace();
  const deps: PipelineDeps = { trace, client: new OpenAI({ apiKey: "unit-test-key", maxRetries: 0 }), cache: createMemorySolveCache(), context: { model: "test", candidateInstructions: "test", version: "test" }, diagnosticId: "coverage-test", tier: { priorityUnavailable: false } };
  const result = await solveProblem(deps, { kind: "text", problem: selection.question, choices: null });
  assert.equal(result.kind, "solved");
  assert.equal(requests.candidates.length, 2);
  assert.equal(trace.coverage?.beforeRecovery?.status, "written-only");
  assert.equal(trace.coverage?.final.status, "desmos-available");
  assert.equal(trace.coverage?.recovery, "applied");
});

test("failed targeted recovery preserves the correct paper method and records missing coverage", async () => {
  const { requests } = mockModel({ candidates: candidatesResponse([paperCandidate()]), explanation: explanation(0) });
  const trace = createTrace();
  const result = await solveProblem({ trace, client: new OpenAI({ apiKey: "unit-test-key", maxRetries: 0 }), cache: createMemorySolveCache(), context: { model: "test", candidateInstructions: "test", version: "test" }, diagnosticId: "coverage-unresolved", tier: { priorityUnavailable: false } }, { kind: "text", problem: "What is the positive solution to x² = 9?", choices: null });
  assert.equal(result.kind, "solved");
  assert.equal(requests.candidates.length, 2, "only one targeted recovery");
  assert.equal(trace.coverage?.final.status, "written-only");
  assert.equal(trace.coverage?.final.recoveryRequired, true);
  assert.equal(trace.coverage?.recovery, "kept");
});

test("valid native alternatives survive root repair, while regression is recommended without hidden factoring", () => {
  const functionWay = graphCandidate({ techniqueId: "function-evaluation", answer: "14", rows: ["a=2", "f(x)=a(x-1)(x+7)", "f(1)-f(0)"].map(latex => ({ latex, slider: null, copiesRow: null })), result: { type: "numeric", row: 3, relatedRows: [], value: 14, listIndex: null, answerFrom: "value", choiceLabel: null, detail: "a+b" }, graphBounds: null });
  const parsed = candidatesResponseSchema.parse(candidatesResponse([functionWay, paperCandidate({answer:"14"})], {question:gold.problem}));
  const result = selectMethods(repairDesmosNativePlans(parsed));
  assert.equal(result.winnerId, "bracket-regression");
  assert.ok(result.methods.some(method => !method.rejected && method.techniqueId === "function-evaluation"));
  assert.deepEqual(desmosNativePlan(gold.problem)?.candidate.rows.map(row=>row.latex),gold.goldRows);
  assert.equal(assessDesmosCoverage(result).recoveryRequired,false);
});

test("repeated exact choices do not defeat root family matching or discard extra conditions", () => {
  const item = JSON.parse(readFileSync("evals/problems/009-integer-list-coefficient-read.json", "utf8"));
  const choices = item.choices.map((text:string, i:number)=>({label:"ABCD"[i],text}));
  const suffix = choices.map((choice:{label:string;text:string})=>`${choice.label}) ${choice.text}`).join(", ");
  for(const label of [" "," Answer choices: "]) {
    assert.equal(desmosNativePlan(item.problem+label+suffix,choices)?.candidate.techniqueId,"integer-list-filter");
    assert.equal(desmosNativePlan(item.problem+" Also b>0."+label+suffix,choices),null);
    assert.equal(desmosNativePlan(item.problem+label+suffix.replace("-15","-16"),choices),null);
  }
});

test("a paper fallback cannot remove the only executable arithmetic alternative", () => {
  const arithmetic = graphCandidate({ techniqueId: "calculator-arithmetic", rows: [{latex:"3",slider:null,copiesRow:null}], result: {type:"numeric",row:1,relatedRows:[],value:3,listIndex:null,answerFrom:"value",choiceLabel:null,detail:"answer"} });
  const result = selectMethods(candidatesResponseSchema.parse(candidatesResponse([paperCandidate({techniqueId:"direct-arithmetic"}),arithmetic])));
  assert.equal(result.methods.filter(method=>!method.rejected).length,2);
  assert.equal(assessDesmosCoverage(result).status,"calculator-only");
  assert.equal(assessDesmosCoverage(result).recommended,false,"arithmetic is not relabeled a native shortcut");
});

test("a written answer cannot acquire Desmos coverage by using a regression technique name", () => {
  const result=selectMethods(candidatesResponseSchema.parse(candidatesResponse([paperCandidate({techniqueId:"bracket-regression"})])));
  assert.equal(result.methods[0].approach,"math");
  assert.equal(assessDesmosCoverage(result).recoveryRequired,true);
  assert.equal(assessDesmosCoverage(result).status,"written-only");
});

test("conceptual interpretation remains exempt without trusting a model's technique label", () => {
  const result=selectMethods(candidatesResponseSchema.parse(candidatesResponse([paperCandidate({techniqueId:"translate-the-words",answer:"B",result:{type:"written",row:null,relatedRows:[],value:null,listIndex:null,answerFrom:"reasoning",choiceLabel:"B",detail:"fixed fee"}})],{question:"A taxi fare is c=3x+2. What does the constant 2 represent?",choices:[{label:"A",text:"price per mile"},{label:"B",text:"fixed fee"}]})));
  assert.equal(result.winnerId,"translate-the-words");
  assert.equal(assessDesmosCoverage(result).exemption,"interpretation");
  assert.equal(assessDesmosCoverage(result).recoveryRequired,false);
});
