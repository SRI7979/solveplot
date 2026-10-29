import assert from "node:assert/strict";
import { test } from "node:test";
import { LESSON_CONTENT, getLessonPracticeContext } from "../src/lib/lesson-content";
import { generatePracticeProblem, gradePracticeAnswer, UnsupportedPracticeError } from "../src/lib/practice-generation";
import { createPracticeHandler, type PracticeDependencies } from "../src/lib/practice-handler";
import { openPracticeSession, sealPracticeSession } from "../src/lib/practice-session";
import { createMemorySolveCache } from "../src/lib/solve-cache";
import { solutionSchema } from "../src/lib/solver-schema";
import { EXPANDED_PRACTICE_CONTEXTS, practiceContext, practiceRandom } from "./practice-expanded-fixtures";

for(const context of EXPANDED_PRACTICE_CONTEXTS) {
  test(`expanded practice ${context.techniqueId}: ${context.question}`,()=>{
    const questions=new Set<string>();
    for(let seed=1;seed<=80;seed++) {
      const problem=generatePracticeProblem(context,{random:practiceRandom(seed)});
      assert.equal(problem.exercise.techniqueId,context.techniqueId);
      assert.equal(problem.solution.trick,context.techniqueName);
      assert.equal(solutionSchema.safeParse(problem.solution).success,true);
      assert.equal(gradePracticeAnswer(problem,String(problem.answer))?.correct,true);
      assert.equal(gradePracticeAnswer(problem,`${problem.answer*10}/10`)?.correct,true);
      assert.equal(gradePracticeAnswer(problem,String(problem.answer+0.2))?.correct,false);
      assert.ok(problem.solution.expressions.length>0);
      questions.add(problem.exercise.question);
    }
    assert.ok(questions.size>=10,`${context.techniqueId}: ${questions.size} distinct variants`);
  });
}

test("every published lesson offers functional same-technique practice",()=>{
  assert.equal(LESSON_CONTENT.length,24);
  for(const lesson of LESSON_CONTENT) {
    const context=getLessonPracticeContext(lesson.slug)!;
    for(let seed=1;seed<=20;seed++) {
      const generated=generatePracticeProblem(context,{random:practiceRandom(seed)});
      assert.equal(generated.exercise.techniqueId,lesson.example.techniqueId,lesson.slug);
      assert.notEqual(generated.exercise.question,lesson.example.question,lesson.slug);
    }
  }
});

test("expanded circle independently preserves the given expanded equation and radius",()=>{
  const source=EXPANDED_PRACTICE_CONTEXTS.find(item=>item.techniqueId==="expanded-circle")!;
  for(let seed=1;seed<=50;seed++) {
    const generated=generatePracticeProblem(source,{random:practiceRandom(seed)});
    const match=/x\^2\+y\^2([+-]\d+)x([+-]\d+)y([+-]\d+)/.exec(generated.exercise.question)!;
    assert.ok(match);
    const[d,e,f]=match.slice(1).map(Number);
    assert.equal(generated.answer**2,(d/2)**2+(e/2)**2-f);
  }
});

test("restricted extrema compare the exact endpoints and the vertex in the permitted interval",()=>{
  const source=EXPANDED_PRACTICE_CONTEXTS.find(item=>item.techniqueId==="restricted-extremum")!;
  for(let seed=1;seed<=50;seed++) {
    const generated=generatePracticeProblem(source,{random:practiceRandom(seed)});
    const match=/For (-?\d+) ≤ x ≤ (-?\d+).*f\(x\) = (-?\d+)\(x([+-]\d+)\)\^2\+(\d+)/.exec(generated.exercise.question)!;
    assert.ok(match);
    const[l,u,a,negH,k]=match.slice(1).map(Number),h=-negH;
    const at=[l,u,...(h>=l&&h<=u?[h]:[])],ys=at.map(x=>a*(x-h)**2+k);
    assert.equal(generated.answer,/maximum/.test(generated.exercise.question)?Math.max(...ys):Math.min(...ys));
  }
});

test("new shapes refuse unrelated or ambiguous variants rather than changing their method",()=>{
  const unsupported=[
    practiceContext("graph-raw","What is x?",["x^2+y=12"]),
    practiceContext("graph-both-sides","What is x?",["y=x^3","y=7"]),
    practiceContext("list-evaluation","What is the largest output?",["f(x)=2^x","L=[1,2,3]"]),
    practiceContext("integer-list-filter","How many real values satisfy x^2<50?",["L=[1...10]","L[L^2<50]"]),
    practiceContext("count-intersections","How many intersections?",["y=x^3","y=0"]),
    practiceContext("reference-formula","What is the area of a circle?",["\\pi(3)^2"]),
    practiceContext("inverse-trig","What is the angle in radians?",["\\sin^{-1}(3/5)"]),
    practiceContext("sum-product","What is the geometric sum?",["\\sum_{n=1}^{10}2^n"]),
    practiceContext("calculator-arithmetic","What is the new price after25%increase then30%decrease?",["80(1+25/100)(1-30/100)"]),
  ];
  for(const original of unsupported) assert.throws(()=>generatePracticeProblem(original),UnsupportedPracticeError,original.question);
});

test("lesson source resolves only authored content and remains user-bound through grading and reveal",async()=>{
  const secret="practice-server-private-encryption-test-key",userId="11111111-1111-4111-8111-111111111111";
  const dependencies:PracticeDependencies={getCurrentUser:async()=>({id:userId}),getCache:()=>createMemorySolveCache(),getProblem:async()=>null,getLessonContext:getLessonPracticeContext,getSecret:()=>secret,reserve:async()=>({allowed:true,retryAfter:0})};
  const handler=createPracticeHandler(dependencies);
  const post=(body:unknown)=>handler(new Request("http://localhost/api/practice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}));
  const source={kind:"lesson",slug:"regression"};
  const response=await post({action:"generate",source});assert.equal(response.status,200);
  const challenge=await response.json(),session=openPracticeSession(challenge.token,userId,secret)!;
  assert.deepEqual(session.source,source);
  assert.equal(challenge.exercise.techniqueId,"three-point-regression");
  assert.equal((await(await post({action:"grade",token:challenge.token,answer:String(session.problem.answer)})).json()).correct,true);
  assert.equal((await post({action:"reveal",token:challenge.token})).status,200);
  assert.equal((await post({action:"generate",source:{kind:"lesson",slug:"unknown"}})).status,404);
  assert.equal((await post({action:"generate",source:{kind:"lesson",slug:"regression",question:"injected problem"}})).status,400);
  assert.equal((await post({action:"generate",source:{kind:"lesson",slug:"../admin"}})).status,400);
  assert.equal((await post({action:"generate",source:{kind:"lesson",slug:"circles"},previousToken:challenge.token})).status,400);
});

test("public lesson access and a previously issued token never authorize guest practice", async () => {
  const source = { kind: "lesson" as const, slug: "regression" };
  const secret = "practice-guest-boundary-private-test-key";
  const problem = generatePracticeProblem(getLessonPracticeContext(source.slug)!, { random: practiceRandom(7) });
  const token = sealPracticeSession({ userId: "signed-in-student", source, problem }, secret);
  const forbidden = () => assert.fail("Guest practice must stop before reading sources, secrets, or usage.");
  const handler = createPracticeHandler({
    getCurrentUser: async () => null,
    getCache: forbidden,
    getProblem: forbidden,
    getLessonContext: forbidden,
    getSecret: forbidden,
    reserve: forbidden,
  });
  for (const body of [
    { action: "generate", source },
    { action: "generate", source, previousToken: token },
    { action: "grade", token, answer: String(problem.answer) },
    { action: "hint", token },
    { action: "reveal", token },
  ]) {
    const response = await handler(new Request("http://localhost/api/practice", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(Object.keys(await response.json()), ["error"]);
  }
});

test("source target, domain, and full expression must match the supported practice pattern", () => {
  const unrelated = [
    practiceContext("calculator-arithmetic", "An $80 item is discounted by 25%. How many dollars is the discount?", ["80(25/100)"]),
    practiceContext("calculator-arithmetic", "After a 25% discount the price is $60. What was the original price?", ["60/(1-25/100)"]),
    practiceContext("integer-list-filter", "For integers from -10 through 10, how many satisfy x^2 > 50?", ["L=[-10...10]", "K=L[L^2>50]", "\\operatorname{length}(K)"]),
    practiceContext("integer-list-filter", "For integers from 1 through 10, how many satisfy x^2 > 50?", ["L=[1...10]", "K=L[L^2>50]", "\\operatorname{length}(K)"]),
    practiceContext("restricted-extremum", "For 0≤x≤2, at what value of x does f(x)=(x-3)^2+2 attain its minimum?", ["y=(x-3)^2+2\\{0\\le x\\le2\\}"]),
    practiceContext("restricted-extremum", "For 0≤x≤1, what is the minimum of f(x)=(x^2+1)/(x-2)?", ["y=\\frac{x^2+1}{x-2}\\{0\\le x\\le1\\}"]),
    practiceContext("count-intersections", "How many real solutions does the system y=x^4-x^2,y=0 have?", ["y=x^4-x^2", "y=0"]),
    practiceContext("number-theory-builtin", "What is the least positive integer n such that the remainder of 3n divided by 7 is 2?", ["L=[1...100]", "K=L[\\operatorname{mod}(3L,7)=2]", "\\min(K)"]),
    practiceContext("ceil-floor", "For how many integers x from 1 through 10 is floor(x/3)=2?", ["L=[1...10]", "K=L[\\operatorname{floor}(L/3)=2]", "\\operatorname{length}(K)"]),
    practiceContext("distance-builtin", "A circle has center (1,2) and passes through (7,10). What is its diameter?", ["2\\operatorname{distance}((1,2),(7,10))"]),
    practiceContext("inverse-trig", "An obtuse angle t has sin(t)=3/5. What is t in degrees?", ["180-\\sin^{-1}(3/5)"]),
    practiceContext("midpoint-builtin", "A segment has midpoint (3,4) and endpoint (1,2). What is the x-coordinate of the missing endpoint?", ["\\operatorname{midpoint}((1,2),(5,6))"]),
  ];
  for (const original of unrelated) assert.throws(() => generatePracticeProblem(original), UnsupportedPracticeError, original.question);
  const negativeRoot = practiceContext("intercept-read", "The quadratic has a positive leading coefficient. What is the negative solution of x^2-x-6=0?", ["y=x^2-x-6"]);
  for (let seed = 1; seed <= 20; seed++) {
    const problem = generatePracticeProblem(negativeRoot, { random: practiceRandom(seed) });
    assert.ok(problem.answer < 0);
    assert.match(problem.exercise.question, /negative solution/);
  }
});
