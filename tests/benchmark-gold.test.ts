/**
 * Benchmark labels say who vouches for them. Synthetic cases stay silver;
 * exact worked examples supplied by a human carry explicit review evidence.
 * Prompt gold solutions remain a separate group, not generalization evidence.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";

import { loadCases } from "../evals/benchmark/load-cases";
import { benchmarkCaseSchema } from "../evals/benchmark/case-schema";
import { metricsTable } from "../evals/benchmark/report";
import { summarize, summarizeByGroup, type MethodRecord, type RunRecord } from "../evals/benchmark/score";

const desmosWay: MethodRecord = { techniqueId: "parameter-regression", rows: 4, derivationSteps: 1, oneOffFacts: 0, mathScore: 1, total: 7, mathLevel: "low", approach: "desmos" };
const mathWay: MethodRecord = { techniqueId: "quadratic-formula", rows: 0, derivationSteps: 3, oneOffFacts: 1, mathScore: 5, total: 13, mathLevel: "high", approach: "math" };

const record = (overrides: Partial<RunRecord>): RunRecord => ({
  caseId: "x",
  group: "hard",
  runIndex: 0,
  ok: true,
  answerCorrect: true,
  strategyClass: "gold",
  winner: desmosWay,
  methods: [desmosWay, mathWay],
  ...overrides,
});

test("synthetic cases stay silver; only the exact user-supplied worked examples have human-approved labels", async () => {
  const cases = await loadCases({ includePrivate: false });
  assert.ok(cases.length >= 86);
  // The user supplied these questions, answers and preferred methods in
  // the 2026-10-25 brief. Pin that reviewed content so a future coefficient
  // variant cannot silently inherit gold provenance by copying its metadata.
  const approved = new Map([
    ["101-user-coefficient-sum-identity", { example: "coefficient-sum", sha256: "2511afbb61fe6d550a17786a6d5c3c12b7af2d80ed3b095bf52a8528194f8fca" }],
    ["089-user-polynomial-identity-regression", { example: "A", sha256: "825fbc8e045c5017e084053207edcbe792305d692bde50b9a4acf683d76f1602" }],
    ["090-user-radical-roots-regression", { example: "B", sha256: "e798db1f776c29e78558c4ca62e1cf49581e79c4e8efebccfbb3fe49c840acc9" }],
    ["095-root-minimum-regression", { example: "root-minimum", sha256: "5063f82932d56891d065f249bfd7cc651c124090f82fd70d07300cb45397034d" }],
    ["100-user-original-constraint-invariant", { example: "affine-invariant", sha256: "d8f079815bfd4c2256df54af09e4f7cd51b6b7022866fb7b1274a129baef4c5d" }],
  ]);
  for (const item of cases) {
    const reviewed = approved.get(item.id);
    if (!reviewed) {
      assert.equal(item.labelProvenance, "agent_generated_silver", `${item.id}: new human labels need explicit review evidence`);
      continue;
    }
    assert.equal(item.labelProvenance, "human_verified_gold");
    assert.deepEqual(item.humanReview, {
      source: "user-provided-worked-example",
      reference: item.id.startsWith("101") ? "2026-10-27 final Weaponized philosophy brief" : item.id.startsWith("100") ? "2026-10-27 user strategy-selection brief, original-constraint invariant example" : item.id.startsWith("095") ? "2026-10-25 Desmos-first reliability brief, approved root regression" : "2026-10-25 SolvePlot solver-engineering brief",
      example: reviewed.example,
      reviewedFields: ["problem", "correctAnswer", "gold"],
    });
    const digest = createHash("sha256").update(JSON.stringify([item.problem, item.correctAnswer, item.gold])).digest("hex");
    assert.equal(digest, reviewed.sha256, `${item.id}: changed content needs a fresh human review`);
  }
  assert.equal(cases.filter((item) => item.labelProvenance === "human_verified_gold").length, approved.size);
  assert.ok(cases.every((item) => item.group !== "gold"), "gold cases are loaded only with --group=gold");
});

test("a case cannot claim human review without identifying its source", async () => {
  const item = (await loadCases({ includePrivate: false, only: ["089"] }))[0];
  const { id: _id, private: _private, humanReview: _review, ...withoutReview } = item;
  void _id; void _private; void _review;
  assert.equal(benchmarkCaseSchema.safeParse(withoutReview).success, false);
  assert.equal(benchmarkCaseSchema.safeParse({ ...withoutReview, labelProvenance: "agent_generated_silver" }).success, true);
});

test("the gold group is summarized on its own; Desmos-default, both-ways, single-method, and library metrics read each record", () => {
  const records = [
    record({ caseId: "gold/015", group: "gold", labelProvenance: "human_verified_gold", library: { winner: { strategy: 78 }, missed: [] } as unknown as RunRecord["library"] }),
    record({
      caseId: "074",
      group: "representative",
      strategyClass: "bad",
      winner: mathWay,
      methods: [mathWay],
      library: { winner: { strategy: null }, missed: ["parameter-regression"] } as unknown as RunRecord["library"],
    }),
    record({ caseId: "old", winner: { ...desmosWay, approach: undefined }, methods: [{ ...desmosWay, approach: undefined }] }), // recorded before approaches or traces
  ];
  const grouped = summarizeByGroup(records);
  assert.equal(grouped.gold.runs, 1);
  assert.equal(grouped.gold.goldRate, 100);
  assert.equal(grouped.all.goldRate, 66.7);
  const all = summarize(records);
  assert.equal(all.desmosDefaultRate, 50, "only records that carry the approach count");
  assert.equal(all.bothWaysRate, 50);
  assert.equal(all.singleMethodRate, 66.7);
  assert.equal(all.genericFallbackRate, 33.3);
  assert.equal(all.libraryDefaultRate, 50, "only traced runs count");
  assert.equal(all.libraryMissRate, 50);
  // A baseline recorded before the gold group existed still renders.
  const { gold: _gold, ...oldBaseline } = grouped;
  void _gold;
  const table = metricsTable(grouped, oldBaseline);
  assert.match(table, /\| Metric \| All \| Δ all \| Representative \| Δ rep \| Hard \| Δ hard \| Gold \| Δ gold \|/);
  assert.match(table, /gold 1\)/);
  assert.match(table, /\| Default is a Desmos way \|/);
  assert.match(table, /\| Lists both a Desmos way and a math way \|/);
});
