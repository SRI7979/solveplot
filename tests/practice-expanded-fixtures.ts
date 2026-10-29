import type { TutorContext } from "../src/lib/tutor";
import { techniqueName, type TechniqueId } from "../src/lib/technique-vocabulary";
export function practiceContext(techniqueId:TechniqueId,question:string,rows:string[]):TutorContext {
  return {techniqueId,techniqueName:techniqueName(techniqueId),question,choices:null,structure:null,answer:"original",rows:rows.map(latex=>({latex,purpose:null,slider:null})),why:null,readAnswer:null,steps:[],cacheKey:null,problemId:null};
}
export function practiceRandom(seed:number) { seed=Math.imul(seed,0x9e3779b9)>>>0; return (low:number,high:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return low+Math.floor(seed/0x100000000*(high-low+1));}; }
export const EXPANDED_PRACTICE_CONTEXTS:TutorContext[]=[
  practiceContext("graph-raw","What value of x satisfies 3x+5=20?",["3x+5=20"]),
  practiceContext("graph-both-sides","What is the solution to 3x+7=2x+19?",["y=3x+7","y=2x+19"]),
  practiceContext("intercept-read","What is the greatest real solution of x^3-2x^2-5x+6=0?",["y=x^3-2x^2-5x+6"]),
  practiceContext("list-evaluation","For f(x)=2x+1 and inputs1,2,3,4, what is f(4)?",["f(x)=2x+1","L=[1,2,3,4]","f(L)"]),
  practiceContext("list-evaluation","For f(x)=x^2+2x and inputs1,2,3,4, what is the greatest output?",["f(x)=x^2+2x","L=[1,2,3,4]","\\max(f(L))"]),
  practiceContext("list-evaluation","For f(x)=x^2+2x and inputs1,2,3,4, what is the sum of outputs?",["f(x)=x^2+2x","L=[1,2,3,4]","\\operatorname{total}(f(L))"]),
  practiceContext("answer-choice-list","Which value in1,2,3,4 satisfies3x+2=11?",["L=[1,2,3,4]","3L+2","L[3L+2=11]"]),
  practiceContext("integer-list-filter","For integers1through10, how many satisfy x^2<50?",["L=[1...10]","K=L[L^2<50]","\\operatorname{length}(K)"]),
  practiceContext("integer-list-filter","For integers1through10, what is the sum of those satisfying x^2<50?",["L=[1...10]","K=L[L^2<50]","\\operatorname{total}(K)"]),
  practiceContext("restricted-extremum","For0≤x≤2, what is the minimum of f(x)=(x-3)^2+2?",["y=(x-3)^2+2\\{0\\le x\\le2\\}"]),
  practiceContext("count-intersections","How many real solutions does the system y=x^2+2,y=5 have?",["y=x^2+2","y=5"]),
  practiceContext("slider-condition","The line y=mx+1 passes through(2,7). What is m?",["m=1","y=mx+1","(2,7)"]),
  practiceContext("expanded-circle","The circle x^2+y^2-8x+6y-11=0 has what radius?",["x_{1}=[0,1,0,2,-1,3]","y_{1}=[0,0,1,2,3,-1]","x_{1}^2+y_{1}^2-8x_{1}+6y_{1}-11~(x_{1}-h)^2+(y_{1}-k)^2-q","\\sqrt{q}"]),
  practiceContext("reference-formula","A triangle has base8and height6. What is its area?",["\\frac12(8)(6)"]),
  practiceContext("reference-formula","A rectangle has length8and width6. What is its area?",["8(6)"]),
  practiceContext("reference-formula","A rectangular prism has dimensions8,6,4. What is its volume?",["8(6)(4)"]),
  practiceContext("trig-evaluation","What is3sin(30degrees)?",["3\\sin(30)"]),
  practiceContext("inverse-trig","An acute angle has sin(t)=3/5. What is t in degrees?",["\\sin^{-1}(3/5)"]),
  practiceContext("inverse-trig","An acute angle has cos(t)=4/5. What is t in degrees?",["\\cos^{-1}(4/5)"]),
  practiceContext("right-triangle-trig","A right triangle has hypotenuse12and angle30degrees. What is the opposite side length?",["12\\sin(30)"]),
  practiceContext("ceil-floor","How many buses with48seats are needed for437students?",["\\operatorname{ceil}(437/48)"]),
  practiceContext("ceil-floor","What is the maximum number of complete groups of48from437items?",["\\operatorname{floor}(437/48)"]),
  practiceContext("sum-product","The nth term is3n+1. What is the sum of the first12terms?",["\\sum_{n=1}^{12}(3n+1)"]),
  practiceContext("sum-product","What is the product of consecutive integers from2through5?",["\\prod_{n=2}^{5}n"]),
  practiceContext("number-theory-builtin","What is the remainder when53is divided by7?",["\\operatorname{mod}(53,7)"]),
  practiceContext("number-theory-builtin","What is the greatest common factor of24and36?",["\\operatorname{gcd}(24,36)"]),
  practiceContext("number-theory-builtin","What is the least common multiple of12and15?",["\\operatorname{lcm}(12,15)"]),
  practiceContext("calculator-arithmetic","The price80is reduced by25%. What is the new price?",["80(1-25/100)"]),
  practiceContext("calculator-arithmetic","What is16^(3/2) divided by8?",["\\frac{16^{3/2}}8"]),
  practiceContext("story-system","Adult tickets cost12and child tickets cost5.30tickets earn220. How many adult tickets were sold?",["x+y=30","12x+5y=220"]),
  practiceContext("frequency-repeat","A frequency table gives values2,4,8and frequencies3,2,5. What is the mean?",["V=[2,4,8]","F=[3,2,5]","\\operatorname{mean}(\\operatorname{repeat}(V,F))"]),
  practiceContext("frequency-repeat","A frequency table gives values2,4,8and frequencies3,2,5. What is the median?",["V=[2,4,8]","F=[3,2,5]","\\operatorname{median}(\\operatorname{repeat}(V,F))"]),
  practiceContext("polygon-area","A triangle has vertices(1,2),(7,2),(4,8). What is its area?",["\\operatorname{polygon}((1,2),(7,2),(4,8))","\\frac12(7-1)(8-2)"]),
  practiceContext("derivative-slope","For f(x)=2x^2+3x+1, what is the tangent slope at x=4?",["f(x)=2x^2+3x+1","f'(4)"]),
];
