import type { PracticeDraft, PracticeProblem } from "./practice-generation";
import type { TutorContext } from "./tutor";
import type { DesmosExpression } from "./solver-schema";

type Random = (min: number, max: number) => number;
type Make = (draft: PracticeDraft) => PracticeProblem;
const row = (latex: string, purpose: string): DesmosExpression => ({ latex, purpose });
const assert = (condition: boolean) => { if (!condition) throw new Error("Practice verification failed"); };
const close = (a: number, b: number) => Math.abs(a-b) < 1e-7 * Math.max(1,Math.abs(b));
const round = (value: number) => Math.round((value + Number.EPSILON) * 10) / 10;
const sign = (value: number) => value < 0 ? `-${Math.abs(value)}` : `+${value}`;
const line = (m: number,b: number,x="x") => `${m}${x}${sign(b)}`;
const quadratic = (a: number,b: number,c: number,x="x") => `${a}${x}^2${sign(b)}${x}${sign(c)}`;
function compact(value: string) {
  return value.toLowerCase().replace(/²/g,"^2").replace(/³/g,"^3").replace(/[−–]/g,"-").replace(/\\(?:left|right)/g,"").replace(/\\sim/g,"~").replace(/\\(?:cdot|times)/g,"").replace(/[{}\s*$]/g,"");
}
function plain(value: string) { return value.toLowerCase().replace(/[−–]/g,"-").replace(/²/g,"^2").replace(/³/g,"^3"); }
function linear(value: string) { return /^[+-]?(?:\d+(?:\.\d+)?x?|x)(?:[+-](?:\d+(?:\.\d+)?x?|x))*$/.test(value); }
function polynomial(value: string, degree=2) { return new RegExp(`^[+-]?(?:\\d+(?:\\.\\d+)?(?:x(?:\\^[2-${degree}])?)?|x(?:\\^[2-${degree}])?)(?:[+-](?:\\d+(?:\\.\\d+)?(?:x(?:\\^[2-${degree}])?)?|x(?:\\^[2-${degree}])?))*$`).test(value); }
function quadraticFormula(value:string) {
  return (value.includes("^2")&&polynomial(value))||/^[+-]?(?:\d+)?\(x[+-]\d+\)\^2(?:[+-]\d+)?$/.test(value);
}
function withoutRestrictions(value:string) {
  return value.replace(/\\(?:left|right)/g,"").replace(/\\\{[^{}]*\\\}/g,"").replace(/\{[^{}]*(?:[<>≤≥]|\\le|\\ge)[^{}]*\}/g,"");
}
function asked(question: string) { return /(?:what|which|find|determine|calculate|how many|how much)[^?]*\??\s*$/.exec(question)?.[0] ?? question; }
function bounds(left:number,right:number,bottom:number,top:number) { return {left,right,bottom,top}; }

function linearEquation(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question), expressions=context.rows.map(item=>compact(item.latex));
  const raw=context.techniqueId==="graph-raw";
  if(raw) {
    if(expressions.length!==1) return null;
    const parts=expressions[0].split("=");
    if(parts.length!==2||!parts.every(linear)) return null;
  } else {
    if(/system|intersection|lines|simultaneous|\by\s*=/.test(q)||expressions.length!==2||!expressions.every(item=>item.startsWith("y=")&&linear(item.slice(2)))) return null;
  }
  if(!/(?:value of|find|solve|solution|what is)\s*(?:the\s+)?(?:x\b|equation)|solution|solve/.test(q)) return null;
  const x=rng(2,12),m=rng(2,7),n=rng(0,m-1),b=rng(1,20),c=(m-n)*x+b;
  assert((c-b)/(m-n)===x);
  return make({question:`What is the solution to ${line(m,b)} = ${line(n,c)}?`,structure:"A linear equation with x on one or both sides.",answer:x,
    rows:raw?[row(`${line(m,b)}=${line(n,c)}`,"Enter the equation as written. Desmos draws a vertical line at its solution.")]:[row(`y=${line(m,b)}`,"Graph the left side as y."),row(`y=${line(n,c)}`,"Graph the right side as y and click their intersection.")],
    why:raw?"The graph contains exactly the x-values that make the equation true.":"At the intersection, both expressions have the same value.",readAnswer:`Read the x-coordinate: ${x}.`,
    hint:raw?"Type the whole equation exactly as written and read the x-coordinate of its vertical line.":"Graph each side as y and click where the two graphs meet. Read x.",feedback:"The requested value is x. Check both constants and read the horizontal coordinate.",graphBounds:bounds(-2,x+4,-2,m*x+b+10)});
}

function cubicIntercept(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question), expressions=context.rows.map(item=>compact(item.latex));
  if(expressions.length!==1||!expressions[0].includes("^3")||!polynomial(expressions[0].replace(/^(?:y|f\(x\))=/,""),3)) return null;
  const highest=/greatest|largest|greater|larger/.test(q), lowest=/least|smallest|smaller/.test(q);
  if((!highest&&!lowest)||!/root|solution|zero|intercept/.test(q)) return null;
  const p=-rng(1,6),r=rng(3,10),s=rng(1,r-1),b=-(p+r+s),c=p*r+p*s+r*s,d=-p*r*s;
  for(const x of [p,s,r]) assert(x**3+b*x*x+c*x+d===0);
  const expression=`x^3${sign(b)}x^2${sign(c)}x${sign(d)}`,answer=highest?r:p;
  return make({question:`What is the ${highest?"greatest":"least"} real solution of ${expression} = 0?`,structure:"A cubic polynomial with three real roots, asked for the outermost root.",answer,
    rows:[row(`y=${expression}`,"Graph the polynomial and click its x-intercepts.")],why:"The x-intercepts are exactly the values that make the polynomial zero.",readAnswer:`The roots are ${p}, ${s}, and ${r}. Read the ${highest?"rightmost":"leftmost"} intercept: ${answer}.`,hint:`Graph the polynomial and click the ${highest?"rightmost":"leftmost"} x-intercept.`,feedback:`Use an x-intercept, not a turning point. The ${highest?"greatest":"least"} root is ${highest?"furthest right":"furthest left"}.`,graphBounds:bounds(p-2,r+2,-30,30)});
}

function listEvaluation(context:TutorContext,rng:Random,make:Make) {
  const q=asked(plain(context.question)), expressions=context.rows.map(item=>compact(item.latex));
  const definition=expressions.find(item=>/^f\(x\)=/.test(item));
  if(!definition||!polynomial(definition.split("=")[1])||!expressions.some(item=>/=[[]-?\d/.test(item))) return null;
  const target=/largest|greatest|maximum/.test(q)?"max":/smallest|least|minimum/.test(q)?"min":/sum|total/.test(q)?"sum":/f\(\d+\)/.test(q)?"evaluate":null;
  if(!target) return null;
  const a=rng(1,4),b=rng(1,7),n=rng(4,7),inputs=Array.from({length:n},(_,i)=>i+1),quad=definition.includes("^2");
  const outputs=inputs.map(x=>quad?a*x*x+b*x:a*x+b),at=rng(1,n),answer=target==="max"?Math.max(...outputs):target==="min"?Math.min(...outputs):target==="sum"?outputs.reduce((s,v)=>s+v,0):outputs[at-1];
  if(target==="sum") assert(answer===(quad?a*n*(n+1)*(2*n+1)/6+b*n*(n+1)/2:a*n*(n+1)/2+b*n));
  else if(target==="max"||target==="min") assert(outputs.every(v=>target==="max"?v<=answer:v>=answer));
  else assert(answer===(quad?a*at*at+b*at:a*at+b));
  const definitionText=quad?`${a}x^2+${b}x`:line(a,b);
  return make({question:`Let f(x) = ${definitionText}. For the inputs ${inputs.join(", ")}, ${target==="evaluate"?`what is f(${at})?`:`what is the ${target==="max"?"largest":target==="min"?"smallest":"sum of the"} output${target==="sum"?"s":""}?`}`,structure:"Evaluate a function at a list of inputs and read the requested output.",answer,
    rows:[row(`f(x)=${definitionText}`,"Define the function."),row(`L=[${inputs.join(",")}]`,"Store the inputs in a list."),row("f(L)","Desmos evaluates the function at every list entry, in order."),row(target==="evaluate"?`f(L)[${at}]`:`\\operatorname{${target==="sum"?"total":target}}(f(L))`,target==="evaluate"?`Read entry ${at}, which corresponds to input ${at}.`:`Read the ${target==="sum"?"sum":target==="max"?"largest":"smallest"} of those outputs.`)],
    why:"A list lets one function entry evaluate all the inputs at once.",readAnswer:`The requested ${target==="evaluate"?"output":"value"} is ${answer}.`,hint:`Define f and put the inputs in a list. Evaluate f on that list, then ${target==="evaluate"?"read the position matching the requested input":target==="sum"?"use total() to add the outputs":`use ${target}() to select the requested output`}.`,feedback:"Keep the input order and output order aligned. Read the requested output value, not its position in the list."});
}

function choiceList(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question), expressions=context.rows.map(item=>compact(item.latex));
  if(!/satisf|solution|value/.test(q)||!expressions.some(item=>/=[[]-?\d/.test(item))||expressions.some(item=>/\^|sqrt|sin|cos|tan/.test(item))) return null;
  const answer=rng(3,15),m=rng(2,7),b=rng(1,15),target=m*answer+b;
  assert((target-b)/m===answer);
  const result=make({question:`Which value of x satisfies ${line(m,b)} = ${target}?`,structure:"Test numeric answer choices in a linear equation.",answer,forceChoices:true,rows:[],why:"Evaluate all four choices in the original expression. Exactly one produces the required value.",readAnswer:`The choice that produces ${target} is x = ${answer}.`,hint:"Put the four answer values into a list and substitute that list for x in the left side. Match the required output to its original choice.",feedback:`Look for the output equal to ${target}, then choose the input in the same position.`});
  const values=result.exercise.choices!.map(choice=>Number(choice.text));
  assert(values.filter(x=>m*x+b===target).length===1);
  result.solution.expressions=[row(`L=[${values.join(",")}]`,"Enter the answer choices in their displayed order."),row(`${m}L+${b}`,`Evaluate each choice. Find the output equal to ${target}.`),row(`L[${m}L+${b}=${target}]`,"The filter returns the input that satisfies the equation.")];
  return result;
}

function integerFilter(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question), expressions=context.rows.map(item=>compact(item.latex));
  const range=expressions.map(item=>/^([a-z])=\[1\.\.\.\d+\]$/.exec(item)).find(Boolean);
  const filter=expressions.map(item=>/^(?:[a-z]=)?([a-z])\[\1\^2<\d+\]$/.exec(item)).find(Boolean);
  if(!/integer|whole number/.test(q)||!range||!filter||range[1]!==filter[1]||expressions.length>3) return null;
  const targetText=asked(q);
  const target=/how many|number of/.test(targetText)?"length":/sum|total/.test(targetText)?"total":/largest|greatest/.test(targetText)?"max":null;
  if(!target) return null;
  const n=rng(9,16),k=rng(3,n-2),threshold=k*k+rng(1,2*k),valid=Array.from({length:n},(_,i)=>i+1).filter(x=>x*x<threshold);
  const answer=target==="length"?valid.length:target==="total"?valid.reduce((s,v)=>s+v,0):Math.max(...valid);
  assert(valid.length===k&&valid[k-1]**2<threshold&&(k+1)**2>=threshold);
  return make({question:`For integers x from 1 through ${n}, ${target==="length"?"how many values":target==="total"?"what is the sum of the values that":"what is the largest value that"} satisfy x^2 < ${threshold}?`,structure:"A bounded integer list, filtered by a quadratic inequality.",answer,
    rows:[row(`L=[1...${n}]`,"Generate every allowed integer, including both endpoints."),row(`K=L[L^2<${threshold}]`,"Keep only the inputs that satisfy the inequality."),row(`\\operatorname{${target}}(K)`,`Read the ${target==="length"?"number":target==="total"?"sum":"largest"} of the retained values.`)],why:"Desmos tests every allowed integer and the filter keeps only those that work.",readAnswer:`The retained integers run from 1 through ${k}. The requested result is ${answer}.`,hint:"Create the full integer list, filter it with the stated inequality, then count, add, or take the maximum as requested.",feedback:"The interval includes both endpoints, and the inequality is strict. Filter the input list before reading the requested result."});
}

function restrictedExtremum(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question), expressions=context.rows.map(item=>compact(item.latex));
  if(!/maximum|minimum/.test(q)||!expressions.some(item=>/\^2/.test(item))||!/(?:<=|≤|between|interval|from|domain)/.test(q)||/\^3|sqrt|sin|cos/.test(expressions.join(" "))) return null;
  if(/value of x|x.coordinate|at what|which[^?]*\bx\b/.test(asked(q))) return null;
  const definitions=context.rows.map(item=>compact(withoutRestrictions(item.latex))).filter(item=>/^(?:y|f\(x\))=/.test(item)).map(item=>item.split("=")[1]).filter(item=>item!=="f(x)");
  if(definitions.length!==1||!quadraticFormula(definitions[0])) return null;
  const maximum=/maximum/.test(asked(q)),left=rng(-4,1),right=left+rng(3,7),h=left+rng(1,right-left+3),k=rng(1,8),a=maximum?-rng(1,3):rng(1,3);
  const evaluate=(x:number)=>a*(x-h)**2+k;
  const x=Math.max(left,Math.min(right,h)),answer=evaluate(x),candidates=[evaluate(left),evaluate(right),...(h>=left&&h<=right?[evaluate(h)]:[])];
  assert(answer===(maximum?Math.max(...candidates):Math.min(...candidates)));
  return make({question:`For ${left} ≤ x ≤ ${right}, what is the ${maximum?"maximum":"minimum"} value of f(x) = ${a}(x${sign(-h)})^2+${k}?`,structure:"A quadratic with a bounded domain; its extreme can occur at an endpoint.",answer,
    rows:[row(`f(x)=${a}(x${sign(-h)})^2+${k}`,"Define the function."),row(`y=f(x)\\{${left}\\le x\\le ${right}\\}`,"Restrict the graph to the allowed interval."),row(`(${left},f(${left}))`,"Plot the left endpoint."),row(`(${right},f(${right}))`,"Plot the right endpoint and compare the visible graph.")],why:"Only the restricted part of the parabola counts. Its extreme is either the visible vertex or an endpoint.",readAnswer:`The ${maximum?"highest":"lowest"} allowed point is (${x}, ${answer}). Read its y-coordinate: ${answer}.`,hint:"Add the domain restriction to the graph. Compare its visible vertex with the two endpoints.",feedback:"Do not read a vertex outside the allowed interval. The requested function value is a y-coordinate.",graphBounds:bounds(left-2,right+2,Math.min(...candidates)-5,Math.max(...candidates)+5)});
}

function intersectionCount(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question),expressions=context.rows.map(item=>compact(item.latex));
  if(!/how many|number of/.test(q)||!expressions.some(item=>/\^2/.test(item))||/\^3|sqrt|abs|sin|cos/.test(expressions.join(" "))||!expressions.every(item=>/^y=/.test(item))) return null;
  if(expressions.length!==2||!expressions.some(item=>/^y=-?\d+$/.test(item))) return null;
  if(expressions.filter(item=>quadraticFormula(item.slice(2))).length!==1) return null;
  const h=rng(-5,5),k=rng(-6,8),offset=rng(-1,1),height=k+offset*rng(1,8),answer=height<k?0:height===k?1:2;
  const discriminant=4*(height-k);assert(answer===(discriminant<0?0:discriminant===0?1:2));
  return make({question:`How many real solutions does the system y = (x${sign(-h)})^2${sign(k)} and y = ${height} have?`,structure:"Count where a horizontal line meets a parabola.",answer,
    rows:[row(`y=(x${sign(-h)})^2${sign(k)}`,"Graph the parabola."),row(`y=${height}`,"Graph the horizontal line and count the intersections.")],why:"Each intersection is one shared solution of the two equations.",readAnswer:`There ${answer===1?"is 1 intersection":"are "+answer+" intersections"}, so the system has ${answer} real solution${answer===1?"":"s"}.`,hint:"Graph both equations. Count the distinct points where they meet; a touching point counts once.",feedback:"Count intersections rather than reading a coordinate. A tangent contributes one shared point.",graphBounds:bounds(h-6,h+6,Math.min(k,height)-4,Math.max(k,height)+10)});
}

function slider(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question),expressions=context.rows.map(item=>compact(item.latex));
  if(!/passes|through/.test(q)||!expressions.some(item=>/^y=mx[+-]\d+$/.test(item))||!/(?:what|find|value).*\bm\b/.test(q)) return null;
  const m=rng(-6,8),x=rng(2,6),b=rng(1,12),y=m*x+b;assert((y-b)/x===m);
  return make({question:`The line y = mx+${b} passes through (${x}, ${y}). What is m?`,structure:"Adjust a line's slope until it passes through a given point.",answer:m,
    rows:[{...row("m=1","Create a slope slider, then move it until the line passes through the point."),slider:{min:-10,max:10,step:1}},row(`y=mx+${b}`,"Graph the line with its unknown slope."),row(`(${x},${y})`,"Plot the given point and match the line to it.")],answerState:{param:"m",value:m},why:"Changing m rotates the line about its fixed y-intercept. The required slope makes it pass through the supplied point.",readAnswer:`When the line passes through (${x}, ${y}), the slider reads m = ${m}.`,hint:"Graph the line and the given point. Move only the m slider until they meet.",feedback:"Keep the y-intercept unchanged. Move the slope slider until the line passes through the exact point.",graphBounds:bounds(-2,x+4,Math.min(0,y,b)-5,Math.max(y,b)+5)});
}

function circle(context:TutorContext,rng:Random,make:Make) {
  const q=asked(plain(context.question)),expressions=context.rows.map(item=>compact(item.latex)).join(" ");
  if(!/x(?:_1)?\^2\+y(?:_1)?\^2/.test(expressions)||!expressions.includes("~")) return null;
  const target=/diameter/.test(q)?"diameter":/radius/.test(q)?"radius":/x.coordinate.*cent(?:er|re)/.test(q)?"x":/y.coordinate.*cent(?:er|re)/.test(q)?"y":null;
  if(!target||/concentric|another circle|second circle|tangent|unknown constant/.test(plain(context.question))) return null;
  const h=rng(-6,6),k=rng(-6,6),r=rng(2,10),d=-2*h,e=-2*k,f=h*h+k*k-r*r;
  const expression=`x^2+y^2${sign(d)}x${sign(e)}y${sign(f)}`,listExpression=expression.replace(/x/g,"x_{1}").replace(/y/g,"y_{1}");
  for(const [x,y] of [[0,0],[1,0],[0,1],[2,3],[-2,1]]) assert(x*x+y*y+d*x+e*y+f===(x-h)**2+(y-k)**2-r*r);
  const answer=target==="radius"?r:target==="diameter"?2*r:target==="x"?h:k;
  return make({question:`A circle has equation ${expression} = 0. What is ${target==="x"||target==="y"?`the ${target}-coordinate of its center`:`its ${target}`}?`,structure:"An expanded circle equation, fitted to center-radius form.",answer,
    rows:[row("x_{1}=[0,1,0,2,-1,3]","Use independent sample x-values to compare the two forms."),row("y_{1}=[0,0,1,2,3,-1]","Pair them with these sample y-values."),row(`${listExpression}\\sim(x_{1}-h)^2+(y_{1}-k)^2-q`,"Fit the given expression to center-radius form. Here q is the radius squared."),row(target==="radius"?"\\sqrt{q}":target==="diameter"?"2\\sqrt{q}":target==="x"?"h":"k","Read the requested measure from the fitted form.")],why:"Matching the expressions at independent sample pairs finds the center and radius squared without completing the square by hand.",readAnswer:`The fit gives center (${h}, ${k}) and radius ${r}. The requested value is ${answer}.`,hint:"Fit the expanded expression to (x−h)^2+(y−k)^2−q using paired sample lists. Read the center or the square root of q as requested.",feedback:"The fitted q is the radius squared. Distinguish the center coordinate, radius, and diameter before reading the answer."});
}

function referenceFormula(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question);
  const triangle=/triangle/.test(q)&&/area/.test(asked(q))&&/base|height/.test(q);
  const rectangle=/rectangle|rectangular/.test(q)&&/area/.test(asked(q))&&!/surface|prism/.test(q);
  const prism=/rectangular prism|box/.test(q)&&/volume/.test(asked(q));
  if(!triangle&&!rectangle&&!prism) return null;
  const a=rng(3,18),b=2*rng(2,12),c=rng(2,9),answer=triangle?a*b/2:prism?a*b*c:a*b;
  assert(triangle?2*answer===a*b:prism?answer/c===a*b:answer/b===a);
  const expression=triangle?`\\frac{1}{2}(${a})(${b})`:prism?`${a}(${b})(${c})`:`${a}(${b})`;
  return make({question:triangle?`A triangle has base ${a} and perpendicular height ${b}. What is its area?`:prism?`A rectangular prism has length ${a}, width ${b}, and height ${c}. What is its volume?`:`A rectangle has length ${a} and width ${b}. What is its area?`,structure:`Use the reference-sheet ${prism?"volume":"area"} formula with the supplied measurements.`,answer,
    rows:[row(expression,`Enter the supplied measurements in ${triangle?"one-half times base times height":prism?"length times width times height":"length times width"}.`)],why:"All required measurements are supplied. Desmos handles the arithmetic in the reference-sheet formula.",handMath:`Choose ${triangle?"A = ½bh":prism?"V = lwh":"A = lw"} from the reference sheet and match the given measurements.`,readAnswer:`The ${prism?"volume":"area"} is ${answer} ${prism?"cubic":"square"} units.`,hint:`Use ${triangle?"one-half times base times perpendicular height":prism?"length times width times height":"length times width"}. Enter the measurements exactly as given.`,feedback:`Check the requested measure and use ${triangle?"the perpendicular height, including the one-half factor":prism?"all three dimensions":"both dimensions"}.`});
}

function trig(context:TutorContext,rng:Random,make:Make) {
  const id=context.techniqueId,q=plain(context.question),expressions=context.rows.map(item=>compact(item.latex)).join(" ");
  const angleText="Use degrees in the calculator.";
  if(id==="right-triangle-trig") {
    if(!/right triangle|right-angled/.test(q)||!/hypotenuse/.test(q)||!/opposite/.test(asked(q))||!/sin/.test(expressions)) return null;
    const hyp=2*rng(4,30),angle=30,answer=hyp/2;assert(close(Math.sin(angle*Math.PI/180)*hyp,answer));
    return make({question:`In a right triangle, the hypotenuse is ${hyp} and an acute angle is 30°. What is the length of the side opposite this angle?`,structure:"Use sine to find an opposite side from an angle and the hypotenuse.",answer,
      rows:[row(`${hyp}\\sin(30)`,`${angleText} Multiply the hypotenuse by sine of the angle.`)],why:"Sine compares the opposite side to the hypotenuse, so the opposite side is the hypotenuse times sine of the angle.",handMath:"Use sin(angle) = opposite/hypotenuse to choose the calculator expression.",readAnswer:`The opposite side has length ${answer}.`,hint:`${angleText} Sine is opposite divided by hypotenuse. Multiply the given hypotenuse by sine of the angle.`,feedback:"Use the side opposite the marked angle and the hypotenuse. Make sure the calculator is in degree mode."});
  }
  if(id==="inverse-trig") {
    const operation=/\\sin\^?-?1|arcsin/.test(expressions)?"sin":/\\cos\^?-?1|arccos/.test(expressions)?"cos":/\\tan\^?-?1|arctan/.test(expressions)?"tan":null;
    if(!operation||!/acute/.test(q)||/radian|obtuse|reflex|supplement/.test(q)||context.rows.length!==1||!/^\\(?:sin|cos|tan)\^-1\((?:\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?|\\frac\d+)\)$/.test(expressions)) return null;
    const numerator=rng(2,15),denominator=rng(numerator+1,numerator+20),ratio=numerator/denominator;
    const radians=operation==="sin"?Math.asin(ratio):operation==="cos"?Math.acos(ratio):Math.atan(ratio),answer=round(radians*180/Math.PI);
    assert(close((operation==="sin"?Math.sin(radians):operation==="cos"?Math.cos(radians):Math.tan(radians)),ratio));
    return make({question:`For an acute angle t, ${operation}(t) = ${numerator}/${denominator}. What is t in degrees, to the nearest tenth?`,structure:"Use inverse trigonometry to recover an acute angle from a ratio.",answer,
      rows:[row(`\\${operation}^{-1}(${numerator}/${denominator})`,`${angleText} Use inverse ${operation} to recover the angle.`)],why:"The inverse trig function returns the angle that produces the given ratio.",readAnswer:`Rounded to the nearest tenth, t = ${answer}° .`,hint:`${angleText} Use inverse ${operation}, written ${operation}⁻¹, on the supplied ratio.`,feedback:"Use the inverse trig function rather than a reciprocal. Report degrees rounded to one decimal place."});
  }
  const operation=/\\sin\(/.test(expressions)?"sin":/\\cos\(/.test(expressions)?"cos":/\\tan\(/.test(expressions)?"tan":null;
  if(!operation||/radian|inverse|\^\{-1\}/.test(q)||!/^\d*\\(?:sin|cos|tan)\(\d+(?:\.\d+)?\)$/.test(expressions)) return null;
  const angle=[20,30,40,50,60,70][rng(0,5)],multiplier=rng(2,15),radians=angle*Math.PI/180;
  const raw=multiplier*(operation==="sin"?Math.sin(radians):operation==="cos"?Math.cos(radians):Math.tan(radians)),answer=round(raw);
  assert(Number.isFinite(raw)&&Math.abs(answer-raw)<=0.0500001);
  return make({question:`What is ${multiplier} ${operation}(${angle}°), rounded to the nearest tenth?`,structure:"Evaluate a given trigonometric expression in degrees.",answer,
    rows:[row(`${multiplier}\\${operation}(${angle})`,`${angleText} Enter the expression as written.`)],why:"The expression is already supplied; the calculator evaluates it directly.",readAnswer:`The value rounds to ${answer}.`,hint:`${angleText} Enter the given multiplier and trig function, then round only the final result.`,feedback:"Check degree mode and the trig function. Round the final value to the nearest tenth."});
}

function wholeGroups(context:TutorContext,rng:Random,make:Make) {
  const expressions=context.rows.map(item=>compact(item.latex)).join(" ");
  const ceiling=expressions.includes("ceil"),floor=expressions.includes("floor");
  const numericCall=expressions.replace(/\\operatorname/g,"");
  if(ceiling===floor||context.rows.length!==1||!/^(?:ceil|floor)\((?:\d+\/\d+|\\frac\d+)\)$/.test(numericCall)||!/bus|group|container|trip|kit|seat|package|complete/.test(plain(context.question))) return null;
  const capacity=rng(8,36),groups=rng(4,15),remainder=rng(1,capacity-1),total=capacity*groups+remainder,answer=ceiling?groups+1:groups;
  assert(ceiling?(answer-1)*capacity<total&&answer*capacity>=total:answer*capacity<=total&&(answer+1)*capacity>total);
  return make({question:ceiling?`Each bus can carry ${capacity} students. What is the minimum number of buses needed to carry ${total} students?`:`A club has ${total} items. Each complete kit requires ${capacity} items. What is the maximum number of complete kits it can make?`,structure:ceiling?"Round up when a partial group needs a whole container.":"Round down when only complete groups count.",answer,
    rows:[row(`\\operatorname{${ceiling?"ceil":"floor"}}(${total}/${capacity})`,ceiling?"Round the quotient up because the remaining students still need a bus.":"Round the quotient down because an incomplete kit does not count.")],why:ceiling?"Even one remaining student needs an additional bus.":"Only groups with the full number of items are complete.",readAnswer:`The answer is ${answer}.`,hint:`Divide the total by the capacity, then use ${ceiling?"ceil() to round up":"floor() to round down"}.`,feedback:ceiling?"A partial final bus still needs to be counted as a whole bus.":"Do not count the incomplete final group."});
}

function repeatedOperations(context:TutorContext,rng:Random,make:Make) {
  const expressions=context.rows.map(item=>compact(item.latex)).join(" "),q=plain(context.question);
  const product=expressions.includes("\\prod"),sum=expressions.includes("\\sum");
  if(product===sum) return null;
  if(product) {
    if(!/consecutive|integers|product/.test(q)||!/\\prod_.*[in]\b/.test(expressions)) return null;
    const start=rng(2,5),end=start+rng(2,4),values=Array.from({length:end-start+1},(_,i)=>start+i),answer=values.reduce((acc,value)=>acc*value,1);
    assert(answer===[...values].reverse().reduce((acc,value)=>acc*value,1));
    return make({question:`What is the product of the integers from ${start} through ${end}, including both endpoints?`,structure:"Multiply a sequence of consecutive integers with product notation.",answer,
      rows:[row(`\\prod_{n=${start}}^{${end}}n`,"Set the first and last integers as the bounds and use n as each factor.")],why:"Product notation multiplies every term in the specified range.",readAnswer:`The product is ${answer}.`,hint:"Use product notation with the supplied first and last integers as inclusive bounds.",feedback:"Both endpoints are included. Product notation multiplies the terms; sum notation adds them."});
  }
  const summand=/\\sum_[a-z]=\d+\^\d+(.+)$/.exec(expressions)?.[1]?.replace(/[()]/g,"").replace(/n/g,"x");
  if(!summand||!linear(summand)||/geometric|multiply|ratio/.test(q)) return null;
  const n=rng(5,18),m=rng(2,8),b=rng(1,10),values=Array.from({length:n},(_,i)=>m*(i+1)+b),answer=values.reduce((a,v)=>a+v,0);
  assert(answer===m*n*(n+1)/2+b*n);
  return make({question:`A sequence has nth term a_n = ${m}n+${b}. What is the sum of its first ${n} terms?`,structure:"Add terms of an arithmetic sequence using summation notation.",answer,
    rows:[row(`\\sum_{n=1}^{${n}}(${m}n+${b})`,"Use the given term rule and sum from the first term through the requested last term.")],why:"Summation notation evaluates and adds each term directly, so no series formula is needed.",readAnswer:`The sum is ${answer}.`,hint:"Put the given nth-term rule inside a sum. Start at n = 1 and end at the requested term number.",feedback:"Sum the term values, not the term numbers. Include both the first and last requested term."});
}

function numberTheory(context:TutorContext,rng:Random,make:Make) {
  const expressions=context.rows.map(item=>compact(item.latex)).join(" ");
  const operation=expressions.includes("gcd")?"gcd":expressions.includes("lcm")?"lcm":expressions.includes("mod")?"mod":null;
  if(!operation||context.rows.length!==1||!/^(?:gcd|lcm|mod)\(\d+,\d+\)$/.test(expressions.replace(/\\operatorname/g,""))) return null;
  const a=rng(12,70),b=rng(3,20);
  const divisors=Array.from({length:Math.min(a,b)},(_,i)=>i+1).filter(n=>a%n===0&&b%n===0),gcd=Math.max(...divisors),answer=operation==="gcd"?gcd:operation==="lcm"?a*b/gcd:a%b;
  if(operation==="lcm") assert(answer%a===0&&answer%b===0&&!Array.from({length:answer-1},(_,i)=>i+1).some(n=>n%a===0&&n%b===0));
  if(operation==="mod") assert(answer>=0&&answer<b&&(a-answer)%b===0);
  return make({question:operation==="mod"?`What is the remainder when ${a} is divided by ${b}?`:`What is the ${operation==="gcd"?"greatest common factor":"least common multiple"} of ${a} and ${b}?`,structure:`Use the ${operation} built-in on two given integers.`,answer,
    rows:[row(`\\operatorname{${operation}}(${a},${b})`,`Enter the two given integers in ${operation}().`)],why:`Desmos directly calculates the ${operation==="gcd"?"greatest common factor":operation==="lcm"?"least common multiple":"remainder"}.`,readAnswer:`The result is ${answer}.`,hint:`Use ${operation}() with the two supplied integers in their given order.`,feedback:operation==="mod"?"The dividend comes first and the divisor second. The remainder must be smaller than the divisor.":`Use ${operation}(), not ${operation==="gcd"?"lcm":"gcd"}().`});
}

function arithmetic(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question),expressions=context.rows.map(item=>compact(item.latex));
  if(expressions.some(item=>/[a-z]/.test(item.replace(/\\(?:frac|sqrt|operatorname)/g,"")))) return null;
  if(/percent|%|discount|increase|decrease/.test(q)) {
    const down=/discount|decrease|reduced|reduction|off|less/.test(q),up=/increase|more|rise/.test(q);
    if(down===up||(q.match(/%|percent/g)??[]).length>1||expressions.length!==1||!/^\d+(?:\.\d+)?\(1[+-](?:\d+(?:\.\d+)?\/100|\\frac\d+(?:\.\d+)?100)\)$/.test(expressions[0])) return null;
    const original=20*rng(3,18),percent=5*rng(1,9),answer=original*(100+(down?-percent:percent))/100;
    assert(close(Math.abs(answer-original)*100/original,percent));
    return make({question:down?`An item costs $${original} before a ${percent}% discount. What is its price after the discount, before tax?`:`A quantity is ${original}. It increases by ${percent}%. What is its new value?`,structure:`Apply a percentage ${down?"decrease":"increase"} to a starting value.`,answer,
      rows:[row(`${original}(1${down?"-":"+"}${percent}/100)`,`Convert the percent to a decimal and apply the ${down?"decrease":"increase"} in one expression.`)],why:`The multiplier keeps ${down?"one minus":"one plus"} the percentage change of the original amount.`,handMath:`Choose the multiplier 1 ${down?"−":"+"} percent/100.`,readAnswer:`The new value is ${answer}.`,hint:`Multiply the starting amount by 1 ${down?"minus":"plus"} the percent divided by 100.`,feedback:`The question asks for the new amount, not just the amount of the ${down?"discount":"increase"}.`});
  }
  if(!/\^|sqrt|radical|exponent/.test(expressions.join(" ")+q)) return null;
  if(expressions.some(item=>/\\sin|\\cos|\\log|!/.test(item))) return null;
  const base=rng(3,18),divisor=base,answer=base*base;
  assert((base*base)**1.5/divisor===answer);
  return make({question:`What is the value of (${base*base})^(3/2) divided by ${divisor}?`,structure:"Evaluate a numerical expression with a fractional exponent.",answer,
    rows:[row(`\\frac{${base*base}^{3/2}}{${divisor}}`,"Enter the fractional exponent in parentheses or as 3/2, then divide by the given number.")],why:"The expression is completely specified, so Desmos can evaluate it directly.",readAnswer:`The value is ${answer}.`,hint:"Enter the full numerical expression. Keep the fractional exponent grouped together.",feedback:"Make sure 3/2 is the exponent, and the final division is outside that power."});
}

function storySystem(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question),expressions=context.rows.map(item=>compact(item.latex)).join(" ");
  if(!/ticket/.test(q)||!/adult|child|student/.test(q)||/\^|sqrt|sin/.test(expressions)) return null;
  const adultPrice=rng(9,16),childPrice=rng(3,8),adults=rng(5,22),children=rng(6,24),total=adults+children,revenue=adultPrice*adults+childPrice*children;
  const target=/how many (?:adult)|number of adult/.test(asked(q))?"adult":/how many (?:child|student)|number of (?:child|student)/.test(asked(q))?"child":null;
  if(!target) return null;
  assert((revenue-childPrice*total)/(adultPrice-childPrice)===adults);
  const answer=target==="adult"?adults:children;
  return make({question:`Adult tickets cost $${adultPrice} and child tickets cost $${childPrice}. A show sells ${total} tickets for $${revenue} in total. How many ${target} tickets were sold?`,structure:"A count total and a cost total form two linear equations.",answer,
    rows:[row(`x+y=${total}`,"Let x be adult tickets and y be child tickets. Their counts add to the total."),row(`${adultPrice}x+${childPrice}y=${revenue}`,"Each price times its count gives the revenue. Click the intersection of the two graphs.")],why:"The shared point satisfies both the ticket count and the money total.",handMath:"Assign one variable to each ticket type and translate the two stated totals into equations.",readAnswer:`The intersection is (${adults}, ${children}). ${target==="adult"?"x":"y"} gives ${answer} ${target} tickets.`,hint:"Write one equation for the number of tickets and one for the total revenue. Graph both and read the coordinate for the requested type.",feedback:"Keep the ticket types consistent between both equations. Use the coordinate for the requested type.",graphBounds:bounds(0,total+3,0,total+3)});
}

function frequencies(context:TutorContext,rng:Random,make:Make) {
  const q=asked(plain(context.question)),expressions=context.rows.map(item=>compact(item.latex)).join(" ");
  const statistic=/median/.test(q)?"median":/mean/.test(q)?"mean":null;
  if(!statistic||!expressions.includes("repeat")) return null;
  const values=[rng(2,6),rng(8,13),rng(16,22)],firstCount=rng(1,4),secondCount=rng(1,4),counts=[firstCount,secondCount,10-firstCount-secondCount],data=values.flatMap((value,index)=>Array.from({length:counts[index]},()=>value)),n=data.length;
  const answer=statistic==="mean"?data.reduce((a,b)=>a+b,0)/n:n%2?data[(n-1)/2]:(data[n/2-1]+data[n/2])/2;
  // Ten total observations keep mean answers exact to one decimal place.
  assert(statistic==="mean"?close(answer*n,values.reduce((sum,value,index)=>sum+value*counts[index],0)):data.filter(value=>value<=answer).length>=n/2&&data.filter(value=>value>=answer).length>=n/2);
  return make({question:`A frequency table lists values ${values.join(", ")} with frequencies ${counts.join(", ")}, respectively. What is the ${statistic} of the full data set?`,structure:"Reconstruct a frequency table with repeat() before finding a statistic.",answer,
    rows:[row(`V=[${values.join(",")}]`,"Enter the distinct data values."),row(`F=[${counts.join(",")}]`,"Enter each value's frequency in the matching position."),row(`\\operatorname{${statistic}}(\\operatorname{repeat}(V,F))`,`Repeat each observation by its frequency, then calculate the ${statistic}.`)],why:"The frequencies tell how often each observation occurs; repeat() builds the full data set.",readAnswer:`The ${statistic} is ${answer}.`,hint:`Use repeat(values, frequencies) inside ${statistic}(). Keep the two lists in matching order.`,feedback:"Do not treat the distinct values as equally frequent. Repeat them according to the frequency table first."});
}

function polygonArea(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question),expressions=context.rows.map(item=>compact(item.latex)).join(" ");
  if(!/triangle/.test(q)||!/area/.test(asked(q))||!expressions.includes("polygon")) return null;
  const x=rng(-5,2),y=rng(-4,3),width=rng(4,12),height=2*rng(2,7),thirdX=x+rng(1,width-1),answer=width*height/2;
  const points=[[x,y],[x+width,y],[thirdX,y+height]],shoelace=Math.abs(points.reduce((sum,[px,py],i)=>{const [nx,ny]=points[(i+1)%3];return sum+px*ny-py*nx;},0))/2;
  assert(shoelace===answer);
  return make({question:`A triangle has vertices (${x}, ${y}), (${x+width}, ${y}), and (${thirdX}, ${y+height}). What is its area?`,structure:"Plot a coordinate triangle and read a horizontal base and vertical height.",answer,
    rows:[row(`\\operatorname{polygon}((${x},${y}),(${x+width},${y}),(${thirdX},${y+height}))`,"Draw the triangle in boundary order. The polygon entry does not itself display area."),row(`\\frac{1}{2}(${x+width}-(${x}))(${y+height}-(${y}))`,"Use one-half times the horizontal base times the vertical height from the given coordinates.")],why:"The drawing identifies the base and height; the reference-sheet triangle formula computes its area.",handMath:"Use A = ½bh, with base and height read as coordinate differences.",readAnswer:`The area is ${answer} square units.`,hint:"Draw the triangle, then use its horizontal base and perpendicular vertical height in A = ½bh. polygon() draws the shape but does not return its area.",feedback:"Use perpendicular height, not a slanted side length. Include the one-half factor for a triangle.",graphBounds:bounds(x-2,x+width+2,y-2,y+height+2)});
}

function derivativeSlope(context:TutorContext,rng:Random,make:Make) {
  const q=plain(context.question),expressions=context.rows.map(item=>compact(item.latex));
  const definition=expressions.find(item=>/^f\(x\)=/.test(item));
  if(!definition||!polynomial(definition.split("=")[1])||!/slope|derivative/.test(q)||!/at x\s*=|at the point|f'\(/.test(q)) return null;
  const a=rng(1,5),b=rng(-6,6),c=rng(1,9),at=rng(1,7),answer=2*a*at+b,epsilon=0.0001;
  const evaluate=(x:number)=>a*x*x+b*x+c;
  assert(close((evaluate(at+epsilon)-evaluate(at-epsilon))/(2*epsilon),answer));
  return make({question:`For f(x) = ${quadratic(a,b,c)}, what is the slope of the tangent to the graph at x = ${at}?`,structure:"Use a derivative to read a quadratic's tangent slope at a given input.",answer,
    rows:[row(`f(x)=${quadratic(a,b,c)}`,"Define the function."),row(`f'(${at})`,"Evaluate the derivative at the requested x-coordinate.")],why:"The derivative gives the graph's slope at each input. Desmos computes it from the function definition.",readAnswer:`The tangent slope is ${answer}.`,hint:"Define f, then enter f′ at the requested x-value. The prime mark asks Desmos for the slope.",feedback:"Evaluate the derivative f′ at the input, not the original function f."});
}

/** Each branch checks its mathematical shape before constructing a verified variant. */
export function generateExtendedPractice(context:TutorContext,rng:Random,make:Make):PracticeProblem|null {
  switch(context.techniqueId) {
    case "graph-raw":case "graph-both-sides": return linearEquation(context,rng,make);
    case "intercept-read": return cubicIntercept(context,rng,make);
    case "list-evaluation":return listEvaluation(context,rng,make);
    case "answer-choice-list":return choiceList(context,rng,make);
    case "integer-list-filter":return integerFilter(context,rng,make);
    case "restricted-extremum":return restrictedExtremum(context,rng,make);
    case "count-intersections":return intersectionCount(context,rng,make);
    case "slider-condition":return slider(context,rng,make);
    case "expanded-circle":return circle(context,rng,make);
    case "reference-formula":return referenceFormula(context,rng,make);
    case "trig-evaluation":case "inverse-trig":case "right-triangle-trig":return trig(context,rng,make);
    case "ceil-floor":return wholeGroups(context,rng,make);
    case "sum-product":return repeatedOperations(context,rng,make);
    case "number-theory-builtin":return numberTheory(context,rng,make);
    case "calculator-arithmetic":return arithmetic(context,rng,make);
    case "story-system":return storySystem(context,rng,make);
    case "frequency-repeat":return frequencies(context,rng,make);
    case "polygon-area":return polygonArea(context,rng,make);
    case "derivative-slope":return derivativeSlope(context,rng,make);
    default:return null;
  }
}
