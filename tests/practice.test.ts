import assert from "node:assert/strict";
import { test } from "node:test";

import { generatePracticeProblem, gradePracticeAnswer, parsePracticeNumber, UnsupportedPracticeError } from "../src/lib/practice-generation";
import { createPracticeHandler, createPracticeRateLimiter, type PracticeDependencies } from "../src/lib/practice-handler";
import { openPracticeSession, sealPracticeSession } from "../src/lib/practice-session";
import type { PracticeChallenge } from "../src/lib/practice-types";
import { CACHE_ENTRY_VERSION, createMemorySolveCache } from "../src/lib/solve-cache";
import { solutionSchema } from "../src/lib/solver-schema";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { techniqueName, type TechniqueId } from "../src/lib/technique-vocabulary";
import type { TutorContext, TutorSource } from "../src/lib/tutor";
import { candidatesResponse } from "./method-fixtures";

const userId = "11111111-1111-4111-8111-111111111111";
const problemId = "22222222-2222-4222-8222-222222222222";
const source: TutorSource = { kind: "history", problemId };
const secret = "a-private-test-key-at-least-32-characters-long";
function context(id: TechniqueId, question: string, expressions: string[], extra: Partial<TutorContext> = {}): TutorContext {
  return { question, choices: null, structure: null, techniqueId: id, techniqueName: techniqueName(id), answer: "original answer", rows: expressions.map(latex => ({ latex, purpose: null, slider: null })), why: null, readAnswer: null, steps: [], cacheKey: null, problemId, ...extra };
}
function seeded(seed: number) {
  seed = Math.imul(seed, 0x9e3779b9) >>> 0;
  return (low: number, high: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return low + Math.floor(seed / 0x100000000 * (high - low + 1));
  };
}
const quadratic = (target = "f(10)") => context("three-point-regression", `A quadratic has values f(1)=8, f(2)=15, f(4)=35. What is ${target}?`, ["x_{1}=[1,2,4]", "y_{1}=[8,15,35]", "y_{1}\\sim ax_{1}^2+bx_{1}+c"]);
const fixtures = [
  quadratic(), quadratic("a"), quadratic("the coefficient b"), quadratic("the value of c"),
  context("linear-regression", "A line passes through two points. What is its slope?", ["x_{1}=[1,2]", "y_{1}=[3,5]", "y_{1}\\sim mx_{1}+b"]),
  context("linear-regression", "A line passes through two points. What is b?", ["x_{1}=[1,2]", "y_{1}=[3,5]", "y_{1}\\sim mx_{1}+b"]),
  context("exponential-regression", "An exponential has three known values. What is b?", ["x_{1}=[0,1,2]", "y_{1}=[2,4,8]", "y_{1}\\sim ab^{x_{1}}"]),
  context("bracket-regression", "One solution of 3x^2-16x+2=0 is (a+sqrt(b))/6. What is a+b?", ["y=3x^2-16x+2", "[(a+\\sqrt{b})/6,(a-\\sqrt{b})/6]\\sim[5.20526,0.128073]"]),
  context("bracket-regression", "The system of equations has solution (x,y). What is x+y?", ["[a+b,2a-b]\\sim[10,2]"]),
  context("graph-both-sides", "The lines y=2x+3 and y=-x+9 intersect. What is the x-coordinate of their intersection?", ["y=2x+3", "y=-x+9"]),
  context("intercept-read", "What is the positive solution of x^2=9?", ["y=x^2-9"]),
  context("vertex-read", "What is the minimum value of f(x)=x^2-4x+8?", ["y=x^2-4x+8"]),
  context("function-evaluation", "Given f(x)=3x^2-4x+8, what is f(5)?", ["f(x)=3x^2-4x+8", "f(5)"]),
  context("statistics-builtin", "For the data set 1,2,3,4, what is the mean?", ["\\operatorname{mean}([1,2,3,4])"]),
  context("statistics-builtin", "For the data set 1,2,3,4, what is the median?", ["\\operatorname{median}([1,2,3,4])"]),
  context("distance-builtin", "What is the distance between the two points?", ["\\operatorname{distance}((1,2),(4,6))"]),
  context("midpoint-builtin", "What is the x-coordinate of the midpoint?", ["\\operatorname{midpoint}((1,2),(4,6))"]),
];

test("each supported shape keeps the exact selected technique, verifies math, and produces fresh values", () => {
  for (const original of fixtures) {
    const questions = new Set<string>();
    for (let seed = 1; seed <= 80; seed++) {
      const generated = generatePracticeProblem(original, { random: seeded(seed) });
      assert.equal(generated.exercise.techniqueId, original.techniqueId);
      assert.equal(generated.solution.trick, original.techniqueName);
      assert.notEqual(generated.exercise.question, original.question);
      assert.equal(gradePracticeAnswer(generated, String(generated.answer))?.correct, true);
      assert.equal(gradePracticeAnswer(generated, `${generated.answer * 10}/10`)?.correct, true);
      assert.equal(gradePracticeAnswer(generated, String(generated.answer + 0.01))?.correct, false);
      assert.equal(solutionSchema.safeParse(generated.solution).success, true);
      questions.add(generated.exercise.question);
    }
    assert.ok(questions.size > 10, `${original.techniqueId} must have varied exercises`);
  }
});

test("quadratic coefficient and evaluation questions use data that independently reconstruct the answer", () => {
  for (const target of ["a", "b", "c", "f(10)"]) {
    const generated = generatePracticeProblem(quadratic(target), { random: seeded(331) });
    const points = [...generated.exercise.question.matchAll(/f\((\d+)\) = (-?\d+)/g)].map(match => [Number(match[1]), Number(match[2])]);
    assert.equal(points.length, 3);
    const [[x0,y0],[x1,y1],[x2,y2]] = points;
    const a = ((y2-y1)/(x2-x1)-(y1-y0)/(x1-x0))/(x2-x0);
    const b = (y1-y0)/(x1-x0)-a*(x0+x1), c = y0-a*x0*x0-b*x0;
    const at = Number(/What is f\((\d+)\)/.exec(generated.exercise.question)?.[1]);
    assert.equal(generated.answer, target === "a" ? a : target === "b" ? b : target === "c" ? c : a*at*at+b*at+c);
    assert.match(generated.solution.expressions[2].latex, /\\sim/);
  }
});

test("radical bracket exercises determine both integers and the supplied roots satisfy the actual quadratic", () => {
  const original = fixtures.find(item => item.techniqueId === "bracket-regression")!;
  const exercise = generatePracticeProblem(original, { random: seeded(18) });
  const match = /of (\d+)x\^2-(\d+)x\+(\d+) = 0.*\/([0-9]+)/.exec(exercise.exercise.question)!;
  assert.ok(match);
  const [a,b,c,d] = match.slice(1).map(Number);
  assert.equal(d,2*a);
  const discriminant=b*b-4*a*c;
  assert.equal(exercise.answer,b+discriminant);
  assert.notEqual(Number.isInteger(Math.sqrt(discriminant)),true);
  assert.match(exercise.solution.expressions[1].latex,/\\sim/);
});

test("unsupported structures never silently become a different technique or model", () => {
  const unsupported = [
    context("derivative-regression", "Find the tangent.", ["f'(x)~g'(x)"]),
    context("function-evaluation", "What is f(3)?", ["f(x)=2^x", "f(3)"]),
    context("function-evaluation", "What is f(3)?", ["f(x)=abs(x)", "f(3)"]),
    context("function-evaluation", "What is f(3)?", ["f(x)=log(x)", "f(3)"]),
    context("exponential-regression", "What is b?", ["y_{1}~ab^{x_{1}}+c"]),
    context("graph-both-sides", "The system is xy=12,y=x+1. What is x?", ["xy=12", "y=x+1"]),
    context("graph-both-sides", "The system is x+y=12,y=x+1,z=x+2. What is x?", ["x+y=12", "y=x+1", "z=x+2"]),
    context("bracket-regression", "The system has three unknowns. What is x+y+z?", ["[a+b+c,2a-b+c]~[8,10]"]),
    context("intercept-read", "What is the positive solution?", ["y=x^2/(x-1)"]),
    context("statistics-builtin", "One observation is missing. What is the mean?", ["mean([1,2,3])"]),
    quadratic("a+b"),
  ];
  for (const original of unsupported) assert.throws(() => generatePracticeProblem(original), UnsupportedPracticeError, original.question);
});

test("numeric grading accepts equivalent fractions and decimals without evaluating arbitrary input", () => {
  for (const [text,expected] of [["1/2",0.5],[" .5 ",0.5],["2/4",0.5],["−3/2",-1.5],["+2",2],[".75/.5",1.5]] as const) assert.equal(parsePracticeNumber(text),expected);
  for (const text of ["1/0","NaN","Infinity","0x10","1+1","process.exit()","<script>","1/2/3","2 kg","", "1e999"]) assert.equal(parsePracticeNumber(text),null);
});

test("multiple choice allows labels and equivalent numeric answers, and all options are distinct", () => {
  const generated = generatePracticeProblem({ ...quadratic("a"), choices: [{ label:"A",text:"3" },{ label:"B",text:"4" }] });
  assert.equal(generated.exercise.answerFormat,"choice");
  assert.equal(new Set(generated.exercise.choices!.map(choice=>choice.text)).size,4);
  assert.equal(gradePracticeAnswer(generated,generated.correctChoice!.toLowerCase())?.correct,true);
  assert.equal(gradePracticeAnswer(generated,`(${generated.correctChoice})`)?.correct,true);
  assert.equal(gradePracticeAnswer(generated,`${generated.answer*2}/2`)?.correct,true);
  assert.equal(gradePracticeAnswer(generated,generated.exercise.choices!.find(choice=>choice.label!==generated.correctChoice)!.label)?.correct,false);
});

test("practice tokens are encrypted, user-bound, expiring, tamper-resistant, and independent of process memory", () => {
  const problem=generatePracticeProblem(quadratic());
  const now=1_000_000;
  const token=sealPracticeSession({userId,source,problem},secret,now);
  assert.ok(!token.includes(problem.exercise.question));
  assert.ok(!Buffer.from(token.split(".")[2],"base64url").toString().includes('"answer"'));
  assert.equal(openPracticeSession(token,userId,secret,now+100)?.problem.answer,problem.answer);
  assert.equal(openPracticeSession(token,"someone-else",secret,now+100),null);
  assert.equal(openPracticeSession(token,userId,secret+"changed",now+100),null);
  const parts=token.split("."); parts[2]=(parts[2][0]==="a"?"b":"a")+parts[2].slice(1);
  assert.equal(openPracticeSession(parts.join("."),userId,secret,now+100),null);
  assert.equal(openPracticeSession(token,userId,secret,now+2*60*60*1000),null);
});

function deps(overrides: Partial<PracticeDependencies> = {}): PracticeDependencies {
  const original=quadratic();
  return {
    getCurrentUser:async()=>({id:userId}), getCache:()=>createMemorySolveCache(),
    getProblem:async(owner,id)=>owner===userId&&id===problemId?{solution:solutionSchema.parse({status:"solved",question:original.question,choices:null,structure:original.structure,trick:original.techniqueName,answer:"143",method:"desmos",why:"Fit the points.",steps:[],readAnswer:"Read f(10).",expressions:original.rows.map(item=>({latex:item.latex,purpose:"Fit the points."})),graphBounds:null,clarification:null})}:null,
    getSecret:()=>secret,reserve:async()=>({allowed:true,retryAfter:0}),...overrides,
  };
}
function request(body:unknown,headers:Record<string,string>={}) { return new Request("https://solveplot.com/api/practice",{method:"POST",headers:{"Content-Type":"application/json",...headers},body:JSON.stringify(body)}); }

test("complete API workflow reveals nothing until requested, grades, hints, and tries another",async()=>{
  const handle=createPracticeHandler(deps());
  const response=await handle(request({action:"generate",source}));
  assert.equal(response.status,200);
  assert.match(response.headers.get("cache-control")!,/no-store/);
  const challenge=await response.json() as PracticeChallenge;
  assert.deepEqual(Object.keys(challenge).sort(),["exercise","token"]);
  assert.ok(!("answer" in challenge.exercise)&&!("solution" in challenge.exercise)&&!("hint" in challenge.exercise));
  const session=openPracticeSession(challenge.token,userId,secret)!;
  const hint=await (await handle(request({action:"hint",token:challenge.token}))).json();
  assert.deepEqual(Object.keys(hint),["hint"]);
  const wrong=await (await handle(request({action:"grade",token:challenge.token,answer:String(session.problem.answer+1)}))).json();
  assert.equal(wrong.correct,false); assert.ok(wrong.feedback.length>30); assert.ok(!("answer" in wrong));
  const correct=await (await handle(request({action:"grade",token:challenge.token,answer:String(session.problem.answer)}))).json();
  assert.equal(correct.correct,true);
  const reveal=await (await handle(request({action:"reveal",token:challenge.token}))).json();
  assert.equal(reveal.solution.answer,String(session.problem.answer));
  assert.equal(reveal.solution.trick,"Three-point regression");
  const another=await (await handle(request({action:"generate",source,previousToken:challenge.token}))).json() as PracticeChallenge;
  assert.notEqual(another.exercise.question,challenge.exercise.question);
  assert.notEqual(another.token,challenge.token);
  assert.equal(another.exercise.techniqueId,challenge.exercise.techniqueId);
});

test("API rejects unauthenticated, cross-site, oversized, invalid, and another student's sessions",async()=>{
  const handle=createPracticeHandler(deps());
  assert.equal((await createPracticeHandler(deps({getCurrentUser:async()=>null}))(request({action:"generate",source}))).status,401);
  assert.equal((await handle(request({action:"generate",source},{Origin:"https://evil.example"}))).status,403);
  assert.equal((await handle(request({action:"generate",source,techniqueId:"invented"}))).status,400);
  assert.equal((await handle(request({action:"generate",source},{"Content-Length":"50000"}))).status,413);
  assert.equal((await handle(request({padding:"x".repeat(25*1024)}))).status,413);
  assert.equal((await handle(request({action:"generate",source:{kind:"history",problemId:"33333333-3333-4333-8333-333333333333"}}))).status,404);
  const {token}=await (await handle(request({action:"generate",source}))).json() as PracticeChallenge;
  const another=createPracticeHandler(deps({getCurrentUser:async()=>({id:"another-user"})}));
  for(const action of ["grade","reveal","hint"]) assert.equal((await another(request({action,token,...(action==="grade"?{answer:"3"}:{})}))).status,410);
  assert.equal((await handle(request({action:"grade",token,answer:"1/0"}))).status,400);
});

test("API limits fail closed, exposes Retry-After, and unknown shapes return honest unsupported feedback",async()=>{
  const capped=createPracticeHandler(deps({reserve:async()=>({allowed:false,retryAfter:12})}));
  const response=await capped(request({action:"generate",source}));
  assert.equal(response.status,429);assert.equal(response.headers.get("retry-after"),"12");
  const original=await deps().getProblem(userId,problemId);
  const unsupported=createPracticeHandler(deps({getProblem:async()=>({solution:{...original!.solution,trick:"Derivative regression"}})}));
  const result=await unsupported(request({action:"generate",source}));
  assert.equal(result.status,422);assert.equal((await result.json()).kind,"unsupported");
});

test("practice burst windows are per-user and do not charge solution interactions as generations",async()=>{
  let now=1000;
  const reserve=createPracticeRateLimiter(()=>now);
  for(let i=0;i<8;i++) assert.equal((await reserve(userId,"generate")).allowed,true);
  assert.equal((await reserve(userId,"generate")).allowed,false);
  assert.equal((await reserve(userId,"hint")).allowed,true);
  assert.equal((await reserve("another-user","generate")).allowed,true);
  now+=60_001;
  assert.equal((await reserve(userId,"generate")).allowed,true);
});

test("a cached solve uses the selected method and never substitutes its preferred method", async () => {
  const cache = createMemorySolveCache(), cacheKey = "practice-method-fixture.v1";
  const selection = selectMethods(candidatesResponseSchema.parse(candidatesResponse()));
  await cache.putEntry({ version: CACHE_ENTRY_VERSION, cacheKey, promptConfigVersion: "v1", question: selection.question, choices: selection.choices, structure: selection.structure, methods: selection.methods, winnerId: selection.winnerId, modelPreference: selection.modelPreference, retryOf: null, createdAt: new Date().toISOString() });
  const handle = createPracticeHandler(deps({ getCache: () => cache }));
  const response = await handle(request({ action: "generate", source: { kind: "solve", cacheKey, methodId: "intercept-read" } }));
  assert.equal(response.status, 200);
  assert.equal((await response.json()).exercise.techniqueId, "intercept-read");
  const alternate = await handle(request({ action: "generate", source: { kind: "solve", cacheKey, methodId: "factoring" } }));
  assert.equal(alternate.status, 422);
  const missing = await handle(request({ action: "generate", source: { kind: "solve", cacheKey, methodId: "imaginary-method" } }));
  assert.equal(missing.status, 404);
});
