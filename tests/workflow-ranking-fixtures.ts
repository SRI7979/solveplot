import { graphCandidate, zeroCost } from "./method-fixtures";
import { affineInvariantPlan } from "../src/lib/affine-invariant-plan";

// First case is user approved; changed coefficients are agent-authored controls.
export const workflowCases = [
  {id:"approved",question:"What is the value of 8x² + 18x + 8xy + 9y + 2y² when 2x + y = 20?",constraint:"2x+y=20",target:"8x^2+18x+8xy+9y+2y^2",answer:980},
  {id:"changed",question:"Evaluate 3(x+2y)^2+5(x+2y) when x+2y=7?",constraint:"x+2y=7",target:"3(x+2y)^2+5(x+2y)",answer:182},
  {id:"negative",question:"Evaluate (3x-y)^2-4(3x-y) when 3x-y=-2?",constraint:"3x-y=-2",target:"(3x-y)^2-4(3x-y)",answer:12},
];
export function workflowPair(item = workflowCases[0]) {
  return {
    fit:affineInvariantPlan(item.question)!.candidate,
    slider:graphCandidate({techniqueId:"slider-condition",rung:3,answer:String(item.answer),
      rows:[{latex:"c=1",slider:{min:0,max:2000,step:1},copiesRow:null},... [item.constraint,`${item.target}=c`].map(latex=>({latex,slider:null,copiesRow:null}))],
      result:{type:"slider_condition",row:1,relatedRows:[2,3],value:null,listIndex:null,answerFrom:"reasoning",choiceLabel:null,detail:"Adjust c until the original constraint line lies on the target level set"},
      answerState:{param:"c",value:item.answer},cost:{...zeroCost},graphBounds:{left:-5,right:15,bottom:-5,top:25}}),
  };
}
