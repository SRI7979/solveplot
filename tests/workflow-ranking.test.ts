import assert from "node:assert/strict";
import { test } from "node:test";
import { workflowPair,workflowCases } from "./workflow-ranking-fixtures";
import { candidatesResponse,graphCandidate,zeroCost } from "./method-fixtures";
import { candidatesResponseSchema,selectMethods } from "../src/lib/strategy-selection";
import { repairDesmosNativePlans } from "../src/lib/desmos-native-plans";
import { compareMethods,workflowEffort,type Rankable } from "../src/lib/method-scoring";
import { calculatorPayload } from "../src/lib/desmos-preflight";
import { factorConstructionBurden } from "../src/lib/polynomial-identity";
import { isOriginalInvariantGraph } from "../src/lib/invariant-graph";

test("original invariant regression wins but original slider survives repair, selection and order changes",()=>{
  for (const item of workflowCases) {
    const {fit,slider}=workflowPair(item);
    for(let i=0;i<30;i++) {
      const response=candidatesResponseSchema.parse(candidatesResponse(i%2?[slider,fit]:[fit,slider],{question:item.question}));
      const repaired=repairDesmosNativePlans(response);
      assert.equal(repaired.candidates.length,2);
      const selection=selectMethods(repaired);
      assert.equal(selection.winnerId,"parameter-regression");
      const alternative=selection.methods.find(m=>m.techniqueId==="slider-condition")!;
      assert.equal(alternative.rejected,null);
      assert.equal(alternative.cost.manualIterations,1,"zero reported effort cannot hide adjustment");
      assert.equal(alternative.rows[0].latex,"c=1");
    }
    assert.ok(isOriginalInvariantGraph(item.question,candidatesResponseSchema.parse(candidatesResponse([slider])).candidates[0]));
    assert.equal(isOriginalInvariantGraph(item.question,{...slider,result:slider.result!,rows:[slider.rows![0],{latex:"2x+y=9"},slider.rows![2]]}),false);
  }
});

test("workflow comparisons use actual steps rather than fixed technique order",()=>{
  const rank=(id:Rankable['techniqueId'],rows:number,math=0,setup=0,result="numeric",search=false):Rankable=>({id,techniqueId:id,rung:id==='slider-condition'?3:4,cost:{...zeroCost,rows,derivationSteps:math,setupConstructions:setup},mathScore:math,total:rows+3*math,rows:Array.from({length:rows},(_,i)=>({latex:`a=${i}`,slider:search&&i===0?{}:null})),result:{type:result},answerState:search?{param:"a",value:3}:null});
  assert.ok(compareMethods(rank('slider-condition',3,0,0,'slider_condition',true),rank('parameter-regression',2,1))<0,"slider avoids a derived fit");
  assert.ok(compareMethods(rank('intercept-read',1,0,0,'x_intercept'),rank('parameter-regression',4,0,1))<0,"original graph beats constructed regression");
  assert.ok(compareMethods(rank('answer-choice-list',2),rank('graph-each-choice',4,0,0,'visual_choice'))<0,"simultaneous answer list beats visual comparisons");
  assert.ok(compareMethods(rank('identity-regression',6),rank('function-evaluation',1,2))<0,"long setup eliminates algebra");
  assert.ok(compareMethods(rank('parameter-regression',2),rank('slider-condition',3,0,0,'slider_condition',true))<0);
  assert.equal(workflowEffort(rank('slider-condition',1)).interactions,0,"a fixed exploratory slider is not an answer search");
});

test("visible discovery and hidden answer states stay separate, including old answer-seeded rows",()=>{
  const {slider}=workflowPair();
  const rows=slider.rows!;
  assert.equal(calculatorPayload(rows,slider.answerState,'discovery').items[0].latex,'c=1');
  assert.equal(calculatorPayload(rows,slider.answerState).items[0].latex,'c=980');
  const seeded=rows.map((r,i)=>i===0?{...r,latex:'c=980'}:r);
  assert.throws(()=>selectMethods(candidatesResponseSchema.parse(candidatesResponse([{...slider,rows:seeded}],{question:workflowCases[0].question}))), /hidden-derivation/, 'new answer-seeded candidates still face the existing derivation guard');
  assert.equal(calculatorPayload(seeded,slider.answerState,'discovery').items[0].latex,'c=0');
  assert.notEqual(calculatorPayload(rows,slider.answerState).key,calculatorPayload(rows,slider.answerState,'discovery').key);
});

test("a correct answer with unrelated graph rows is not retained as an invariant alternative",()=>{
  const response=candidatesResponseSchema.parse(candidatesResponse([graphCandidate({answer:'980'})],{question:workflowCases[0].question}));
  const repaired=repairDesmosNativePlans(response);
  assert.equal(repaired.candidates.length,1);
  assert.equal(repaired.candidates[0].techniqueId,'parameter-regression');
});

test("a fitted identity cannot hide a derived numeric cofactor", () => {
  for (const [coefficient, constant] of [[3,7],[5,9],[8,11]]) {
    const question = `x + 2b is a factor of ${coefficient}x^2 + 25x + 14b, where b is a positive integer constant. What is b?`;
    const rows = [{latex:"x_1=[1...5]"},{latex:`${coefficient}x_1^2+25x_1+14b~(x_1+2b)(${coefficient}x_1+${constant})`}];
    assert.equal(factorConstructionBurden(question, rows), 2);
    assert.equal(factorConstructionBurden(question, [rows[0], {latex:rows[1].latex.replace(`${coefficient}x_1+${constant}`, "mx_1+n")}]), 0);
  }
  assert.equal(factorConstructionBurden("Fit (3x+7)(x+2b) to the given polynomial", [{latex:"x_1=[1...5]"},{latex:"y_1~(3x_1+7)(x_1+2b)"}]),0);
});
