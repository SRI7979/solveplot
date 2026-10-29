import { graphCandidate, zeroCost } from "./method-fixtures";

// Agent-authored coefficient variants are engineering fixtures, not new human gold.
export const identityCases = [
  {id:'approved', divisor:3, right:'(3x-2)(x+5)-4(x-1)^2', answer:18},
  {id:'changed-products', divisor:2, right:'(2x+1)(x+3)-3(x-1)^2', answer:24},
  {id:'negative-result', divisor:4, right:'(x-5)(2x+1)-(x+2)^2', answer:-84},
  {id:'fractional-coefficients', divisor:3, right:'(x+1)(x+2)/2-(x-1)^2', answer:9},
].map(item => ({...item,question:`For every real number x, (a/${item.divisor})x^2+(b/${item.divisor})x+c/${item.divisor}=${item.right}, where a, b, and c are constants. What is a+b+c?`}));
export type IdentityCase = typeof identityCases[number];
export function identityCandidate(item:IdentityCase) {
  return graphCandidate({techniqueId:'identity-regression',rung:4,answer:String(item.answer),graphBounds:null,
    rows:['x_{1}=[0,1,2]',`(a/${item.divisor})x_{1}^2+(b/${item.divisor})x_{1}+c/${item.divisor}\\sim${item.right.replace(/x/g,'x_{1}')}`,'a+b+c'].map(latex=>({latex,slider:null,copiesRow:null})),
    result:{type:'numeric',row:3,relatedRows:[1,2],value:item.answer,listIndex:null,answerFrom:'value',choiceLabel:null,detail:'a+b+c'},cost:{...zeroCost}});
}
export function specialInputCandidate(item:IdentityCase) {
  return graphCandidate({techniqueId:'function-evaluation',rung:0,answer:String(item.answer),graphBounds:null,
    rows:[`f(x)=${item.divisor}(${item.right})`,'f(1)'].map(latex=>({latex,slider:null,copiesRow:null})),
    result:{type:'numeric',row:2,relatedRows:[1],value:item.answer,listIndex:null,answerFrom:'value',choiceLabel:null,detail:'Use x=1 to expose the coefficient sum'},cost:{...zeroCost}});
}
