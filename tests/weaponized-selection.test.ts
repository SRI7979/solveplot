import assert from "node:assert/strict";
import { test } from "node:test";
import { compareMethods, deriveCost, mathScore, totalCost, type Rankable } from "../src/lib/method-scoring";
import { identityInsightBurden, identityPlanIssue, polynomialIdentity } from "../src/lib/polynomial-identity";
import { candidatesResponseSchema, selectMethods, mergeSelections } from "../src/lib/strategy-selection";
import { candidatesResponse, graphCandidate, paperCandidate, zeroCost } from "./method-fixtures";
import { identityCases, identityCandidate, specialInputCandidate } from "./weaponized-fixtures";

test("original identity fits beat strategic evaluation repeatedly without deleting the alternative", () => {
  for (const item of identityCases) {
    const proof = polynomialIdentity(item.question);
    assert.ok(proof, item.id);
    assert.equal(Number(proof.value.n) / Number(proof.value.d), item.answer);
    const fit = identityCandidate(item);
    const shortcut = specialInputCandidate(item);
    assert.equal(identityInsightBurden(item.question, shortcut.rows), 1);
    assert.equal(identityInsightBurden(item.question, fit.rows), 0);
    assert.equal(identityPlanIssue(item.question, fit.rows, 3, String(item.answer)), null);
    for (let repeat = 0; repeat < 20; repeat++) {
      const list = repeat % 2 ? [fit, shortcut] : [shortcut, fit];
      const selected = selectMethods(candidatesResponseSchema.parse(candidatesResponse(list, {question: item.question})));
      assert.equal(selected.winnerId, "identity-regression", item.id);
      assert.ok(selected.methods.some(m => m.techniqueId === "function-evaluation" && !m.rejected));
    }
    const first = selectMethods(candidatesResponseSchema.parse(candidatesResponse([shortcut], {question: item.question})));
    const second = selectMethods(candidatesResponseSchema.parse(candidatesResponse([fit], {question: item.question})));
    assert.equal(mergeSelections(first, second).winnerId, "identity-regression");
  }
});

test("identity checks prove coefficient constraints and reject too few distinct samples or altered source", () => {
  const item = identityCases[0];
  const candidate = identityCandidate(item);
  const issue = (rows: string[], answer = "18") => identityPlanIssue(item.question, rows.map(latex => ({latex})), 3, answer);
  const rows = candidate.rows.map(r => r.latex);
  assert.match(issue(["x_{1}=[0,0,1]", rows[1], rows[2]])!, /distinct/);
  assert.match(issue(["x_{1}=[0,1]", rows[1], rows[2]])!, /distinct/);
  assert.match(issue([rows[0], rows[1].replace("3x_{1}-2", "3x_{1}+2"), rows[2]])!, /original/);
  assert.match(issue([rows[0], rows[1], "a+b"])!, /readout/);
  assert.match(issue(rows, "19")!, /answer/);
  const random = [rows[1], "x_{1}=\\operatorname{random}(10)", rows[2]];
  assert.equal(issue(random), null, "the user's original random-list order remains supported");
  const rejected = selectMethods(candidatesResponseSchema.parse(candidatesResponse([
    {...candidate, rows: ["x_{1}=[0,0,1]", rows[1], rows[2]].map(latex => ({latex,slider:null,copiesRow:null}))},
    specialInputCandidate(item),
  ], {question:item.question})));
  assert.notEqual(rejected.winnerId, "identity-regression");
  assert.match(rejected.methods.find(m=>m.techniqueId==='identity-regression')!.rejected!.reason, /distinct/);
  for (const q of [
    item.question.replace('For every real number x', 'For x=1'),
    item.question.replace('are constants.', 'are positive constants.'),
    item.question.replace('(a/3)x^2','(a*b/3)x^2'),
    item.question.replace('c/3=', 'c/(x-1)='),
    item.question.replace('What is a+b+c?', 'What is a+b+c, if a>0?'),
  ]) assert.equal(polynomialIdentity(q), null, q);
});

test("row savings cannot purchase more student math across native technique families", () => {
  const families = ["identity-regression", "bracket-regression", "parameter-regression", "integer-list-filter", "shared-zero", "graph-both-sides", "three-point-regression", "restricted-extremum"] as const;
  for (const techniqueId of families) {
    const make = (id: typeof techniqueId | 'function-evaluation', rowCount:number, derivationSteps:number): Rankable => {
      const cost=deriveCost({...zeroCost,derivationSteps},rowCount,id);
      return {id,techniqueId:id,rung:id==='function-evaluation'?0:4,cost,mathScore:mathScore(cost),total:totalCost(cost)};
    };
    const long = make(techniqueId, 6, 0);
    const short = make('function-evaluation',1,1);
    assert.ok(long.total > short.total, "weighted sum would prefer the short method");
    assert.ok(compareMethods(long,short)<0,techniqueId);
  }
});

test("ordinary given-input evaluation stays free of strategic-input tax; no reward for decorative regression", () => {
  assert.equal(identityInsightBurden('Given f(x)=3x+2, find f(1).',[{latex:'f(1)'}]),0);
  const simple=graphCandidate();
  const elaborate=graphCandidate({techniqueId:'parameter-regression',rung:4, rows:[{latex:'a^2\\sim9',slider:null,copiesRow:null},{latex:'a',slider:null,copiesRow:null}],cost:{...zeroCost, setupConstructions:1}});
  const selected=selectMethods(candidatesResponseSchema.parse(candidatesResponse([simple, elaborate, paperCandidate()])));
  assert.equal(selected.winnerId,'intercept-read');
});
