import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { geometryLabels, unknownGeometryLabels } from "../src/lib/geometry-grounding";
import { explanationGroundingIssues } from "../src/lib/method-presentation";
import { checkMethodReadout, preflightInRankOrder, type PreflightVerdict } from "../src/lib/desmos-preflight";
import { buildRetrievalIndex, retrieveStrategies } from "../src/lib/strategy-retrieval";
import { candidatesResponseSchema, selectMethods } from "../src/lib/strategy-selection";
import { libraryTrace } from "../src/lib/library-trace";
import { similarityReadoutConflict } from "../src/lib/similarity-validation";
import { resolveEntry } from "../src/lib/solve-pipeline";
import { CACHE_ENTRY_VERSION, createMemorySolveCache, type CacheEntry } from "../src/lib/solve-cache";
import { candidatesResponse, explanation, graphCandidate, paperCandidate } from "./method-fixtures";
import type { SolutionResult } from "../src/lib/solver-schema";

const question = "Segments AB and CD intersect at E. Angles CAE and EDB are equal. Find DB.";
const numeric: SolutionResult = { type: "numeric", row: 1, relatedRows: [], value: 14, listIndex: null, answerFrom: "value", choiceLabel: null, detail: "the requested sum" };
const clean = (value: number): PreflightVerdict => ({ status: "clean", rows: 1, evaluations: { 1: { type: "Number", value } } });

test("geometry inventory checks actual labels and permits defined auxiliary points", () => {
  assert.deepEqual([...geometryLabels(question)].sort(), ["A", "B", "C", "D", "E"]);
  assert.deepEqual(unknownGeometryLabels(question, [], "Triangles ACE and DBE are similar."), []);
  assert.deepEqual(unknownGeometryLabels(question, [], "Triangle DBR is similar to ACE."), ["R"]);
  assert.deepEqual(unknownGeometryLabels(question, [{ latex: "R=(0,0)" }], "Point R is the origin."), []);
  assert.deepEqual(unknownGeometryLabels(question, [], "Let R be the midpoint of AB. Triangle ACR has a median."), []);
  assert.deepEqual(unknownGeometryLabels("Calculate A+B.", [], "Choose B."), []);
});

test("explanations cannot invent a vertex, textual graph status, or browser testing", () => {
  const method = { rows: [] };
  for (const why of ["Triangles ACE and DBR are similar.", "Desmos reports that the lines are parallel.", "Desmos displays the message no solution.", "We verified the answer in Desmos."]) {
    assert.ok(explanationGroundingIssues(question, method, explanation(0, { why })).length, why);
  }
  assert.deepEqual(explanationGroundingIssues(question, method, explanation(0, { why: "The graphs are parallel and distinct, so they never intersect. Desmos draws both lines." })), []);
});

test("readout checks reject observed contradictions and shapes but leave absent or graphical evidence alone", () => {
  assert.equal(checkMethodReadout(numeric, clean(14)).status, "clean");
  assert.equal(checkMethodReadout(numeric, clean(0)).status, "error");
  assert.equal(checkMethodReadout(numeric, { status: "clean", rows: 1, evaluations: {} }).status, "clean");
  const graph = { ...numeric, type: "x_intercept" as const };
  assert.equal(checkMethodReadout(graph, clean(0)).status, "clean");
  const list = { ...numeric, type: "list_entry" as const, listIndex: 2 };
  const verdict: PreflightVerdict = { status: "clean", rows: 1, evaluations: { 1: { type: "ListOfNumber", value: [0, 14] } } };
  assert.equal(checkMethodReadout(list, verdict).status, "clean");
  assert.equal(checkMethodReadout({ ...list, listIndex: 3 }, verdict).status, "error");
  assert.equal(checkMethodReadout(numeric, verdict).status, "error");
  assert.equal(checkMethodReadout(numeric, clean(14.000001)).status, "clean");
});

test("a syntax-clean but wrong numeric winner automatically yields to its working alternative", async () => {
  const rows = (latex: string) => [{ latex, slider: null }];
  const methods = [
    { id: "wrong-fit", rows: rows("0"), result: numeric, answerState: null },
    { id: "working", rows: rows("7(2)"), result: numeric, answerState: null },
  ];
  const run = await preflightInRankOrder(methods, async payload => clean(payload.items[0].latex === "0" ? 0 : 14));
  assert.equal(run.promoted?.id, "working");
  assert.equal(run.verdicts.get("wrong-fit")?.status, "error");
});

test("retrieval suggests proportions and root constraints without fabricating their justification", () => {
  const index = buildRetrievalIndex(readFileSync("src/content/desmos-tricks.md", "utf8"));
  const similar = retrieveStrategies(index, question);
  assert.ok(similar.structures.includes("similarity-proportions"));
  assert.ok(similar.strategyIds.includes(61));
  assert.match(similar.focusHint, /vertex correspondence/);
  assert.match(similar.focusHint, /do not imply a circle/);
  assert.equal(similar.confidence, "medium");
  const roots = retrieveStrategies(index, "The quadratic ax^2+bx+c has roots 2 and -9, where a,b,c are constants. Find a+b.");
  assert.ok(roots.structures.includes("known-roots-coefficients"));
  assert.match(roots.focusHint, /do not identify three coefficients/);
  assert.ok(!retrieveStrategies(index, "A triangle's area is 12. Find its base.").structures.includes("similarity-proportions"));
});

test("claiming a matched library strategy does not count as proposing a shortcut", () => {
  const raw = candidatesResponseSchema.parse(candidatesResponse([paperCandidate()], { question, library: { matched: [61], skipped: [] } }));
  const selection = selectMethods(raw);
  const trace = libraryTrace(raw, selection);
  assert.equal(trace.shortcutAudit.find(item => item.detector === "similarity-proportions")?.outcome, "not-proposed");
  const added = { ...selection, methods: [{ ...selection.methods[0], techniqueId: "parameter-regression" as const, rows: [{ latex: "y=x", slider: null }] }] };
  assert.equal(libraryTrace(raw, added).shortcutAudit[0].outcome, "added-after-generation");
});

const aa = "Segments AB and CD intersect at E, with A, E, B in that order and C, E, D in that order. The marked angles CAE and EDB are equal. AE=30, DE=10, AC=21, and CE=24. Find DB.";

test("explicit AA correspondence rejects the wrong ratio, with changed names, lengths, and orientation", () => {
  assert.equal(similarityReadoutConflict(aa, 7), null);
  assert.match(similarityReadoutConflict(aa, 8.75)!, /A↔D/);
  const renamed = aa.replace(/[ABCDE]/g, letter => ({ A: "J", B: "M", C: "K", D: "L", E: "P" })[letter]!);
  assert.equal(similarityReadoutConflict(renamed, 7), null);
  assert.ok(similarityReadoutConflict(renamed, 8.75));
  assert.equal(similarityReadoutConflict(aa.replace("AE=30", "AE=15").replace("AC=21", "AC=18"), 12), null);
  assert.equal(similarityReadoutConflict(aa.replace("CAE and EDB", "BDE and EAC").replace("A, E, B", "B, E, A"), 7), null);
  assert.equal(similarityReadoutConflict(aa.replace("AC=21", "DB=7").replace("Find DB", "Find CA"), 21), null);
});

test("AA validator declines missing incidence, unsupported givens, and approximate tasks", () => {
  for (const unsupported of [
    aa.replace("A, E, B in that order", "A, B, E in that order"),
    aa.replace("angles CAE and EDB are equal", "angles CAE and EDB are not equal"),
    aa.replace("angles CAE and EDB", "angles CAE and AEB"),
    aa.replace("DE=10,", ""),
    aa.replace("AE=30", "AE=30 cm"),
    aa.replace("Find DB", "Estimate DB to the nearest integer"),
    aa.replace("AE=30", "AE=30, AE=40"),
  ]) assert.equal(similarityReadoutConflict(unsupported, 8.75), null, unsupported);
});

test("selection rejects a syntax-valid wrong-correspondence graph and paper fallback", () => {
  const wrong = graphCandidate({ answer: "8.75", rows: [{ latex: "y=x-8.75", slider: null, copiesRow: null }],
    result: { ...numeric, type: "x_intercept", value: 8.75 } });
  const paper = paperCandidate({ answer: "8.75" });
  assert.throws(() => selectMethods(candidatesResponseSchema.parse(candidatesResponse([wrong, paper], { question: aa }))), /correspond|proportion/i);
  const valid = paperCandidate({ answer: "7" });
  const selected = selectMethods(candidatesResponseSchema.parse(candidatesResponse([wrong, valid], { question: aa })));
  assert.equal(selected.methods.find(method => method.id === selected.winnerId)?.answer, "7");
});

test("a saved clean verdict cannot preserve a provably wrong AA answer", async () => {
  const previous = selectMethods(candidatesResponseSchema.parse(candidatesResponse([
    graphCandidate({ answer: "8.75", rows: [{ latex: "y=x-8.75", slider: null, copiesRow: null }], result: { ...numeric, type: "x_intercept", value: 8.75 } }),
    paperCandidate({ answer: "7" }),
  ], { question: "What is the requested length?" })));
  const entry: CacheEntry = { ...previous, version: CACHE_ENTRY_VERSION, question: aa, cacheKey: "aa-old", promptConfigVersion: "old", createdAt: "2026-10-26T00:00:00.000Z", retryOf: null };
  const cache = createMemorySolveCache();
  const bad = previous.methods.find(method => method.answer === "8.75")!;
  await cache.putPreflight(entry.cacheKey, bad.id, { status: "clean" });
  const resolved = await resolveEntry(cache, entry);
  assert.equal(resolved.status, "ready");
  if (resolved.status === "ready") assert.equal(resolved.winner.answer, "7");
  assert.equal(resolved.verdicts[bad.id].status, "error");
  assert.equal((await cache.getPreflight(entry.cacheKey))[bad.id].status, "clean", "source contradiction must not mutate syntax evidence");
  const noAlternative = await resolveEntry(cache, { ...entry, methods: [bad] });
  assert.equal(noAlternative.status, "needs-retry");
  assert.equal((await resolveEntry(cache, { ...entry, methods: [bad], retryOf: "previous" })).status, "failed", "recovery remains bounded");
});
