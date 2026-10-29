/**
 * The SolvePlot benchmark: every case in evals/problems (and the gitignored
 * evals/private, for licensed problems) through the SAME pipeline the app
 * uses, scored for answer accuracy, strategy quality against gold labels,
 * student burden, explanation quality, reliability, and latency. Spends real
 * OpenAI credits.
 *
 *   npm run bench:solver -- <label> [--runs=3] [--concurrency=4]
 *       [--group=representative|hard|gold|all] [--cases=001,032] [--compare=<label>]
 *       [--no-private]
 *
 * Each run gets a fresh, empty cache so it is an independent generation. The
 * raw call-1 output of every run is saved, so `npm run bench:replay` can
 * re-score a later scoring or validation change without new model calls.
 *
 * Results: evals/results/<label>.json; report: evals/reports/<label>.md.
 */
import OpenAI from "openai";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createMemorySolveCache } from "../src/lib/solve-cache";
import { configuredReasoningEffort, createTrace, loadSolveContext, solveProblem, type SolveContext } from "../src/lib/solve-pipeline";
import { createMemoryUsageStore, createMeter } from "../src/lib/spend";
import type { ScorableCase } from "./benchmark/case-schema";
import { loadCases, loadGoldCases } from "./benchmark/load-cases";
import { recordRun } from "./benchmark/record";
import { metricsTable, perCaseTable, rejectionTable, stageTable } from "./benchmark/report";
import { summarizeByGroup, type RunRecord } from "./benchmark/score";
import { createBenchmarkBudget } from "./benchmark/api-budget";

function parseArgs() {
  const args = process.argv.slice(2);
  const flag = (name: string, fallback: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
  return {
    label: args.find((arg) => !arg.startsWith("--")) ?? "run",
    runs: Number(flag("runs", "3")),
    concurrency: Number(flag("concurrency", "4")),
    group: flag("group", "all") as "all" | "representative" | "hard" | "gold",
    only: flag("cases", "").split(",").map((value) => value.trim()).filter(Boolean),
    compare: flag("compare", ""),
    firstCandidateCap: Number(flag("first-candidate-cap", "0")),
    captureSolution: args.includes("--capture-solution"),
    budgetUsd: Number(flag("budget-usd", "0")),
    budgetLedger: flag("budget-ledger", ""),
    manifest: flag("manifest", ""),
    dryRun: args.includes("--dry-run"),
    includePrivate: !args.includes("--no-private"),
  };
}

async function apiKey(): Promise<string> {
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8").catch(() => "");
  const key = process.env.OPENAI_API_KEY?.trim() || /^OPENAI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
  if (!key) throw new Error("OPENAI_API_KEY missing from the environment or .env.local");
  return key;
}

async function pooled<T, R>(items: T[], concurrency: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await work(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

async function runOnce(client: OpenAI, context: SolveContext, item: ScorableCase, runIndex: number, captureSolution: boolean): Promise<RunRecord> {
  const trace = createTrace();
  const store = createMemoryUsageStore();
  const meter = createMeter({
    store,
    userId: null,
    solveId: randomUUID(),
    limits: { freeSolvesPerDay: 1000, dailySpendCeilingUsd: 100 },
  });
  const deps = { client, cache: createMemorySolveCache(), context, tier: { priorityUnavailable: false }, diagnosticId: randomUUID(), trace, meter };
  const started = performance.now();
  const withBilling = (record: RunRecord): RunRecord => ({
    ...record,
    costUsd: Number(store.records.reduce((total, call) => total + call.costUsd, 0).toFixed(6)),
    costEstimated: store.records.some((call) => call.estimated),
    billing: store.records.map(({ call, serviceTier, status, costUsd, estimated }) => ({ call, serviceTier, status, costUsd, estimated })),
  });
  try {
    const result = await solveProblem(deps, { kind: "text", problem: item.problem, choices: item.choices });
    const record = recordRun(item, runIndex, { result, ms: Math.round(performance.now() - started) }, trace);
    return withBilling(captureSolution && result.kind === "solved"
      ? { ...record, capturedSolution: result.solution, capturedMethods: result.resolved.methods }
      : record);
  } catch (error) {
    return withBilling(recordRun(item, runIndex, { error, ms: Math.round(performance.now() - started) }, trace));
  }
}

async function main() {
  const options = parseArgs();
  if (options.manifest) {
    const manifest = JSON.parse(await readFile(path.resolve(options.manifest), "utf8")) as { caseIds?: string[] };
    if (!Array.isArray(manifest.caseIds) || !manifest.caseIds.length) throw new Error("Manifest requires caseIds.");
    options.only = manifest.caseIds;
  }
  if (!Number.isSafeInteger(options.runs) || options.runs < 1 || !Number.isSafeInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error("Runs and concurrency must be positive integers.");
  }
  if (Boolean(options.budgetUsd) !== Boolean(options.budgetLedger)) throw new Error("Use --budget-usd and --budget-ledger together.");
  const cases: ScorableCase[] = options.group === "gold"
    ? await loadGoldCases(options.only)
    : await loadCases({ only: options.only, group: options.group, includePrivate: options.includePrivate });
  if (!cases.length) throw new Error("No cases matched.");
  const context = await loadSolveContext();
  if (options.firstCandidateCap && (!Number.isInteger(options.firstCandidateCap) || options.firstCandidateCap < 8_000)) {
    throw new Error("--first-candidate-cap must be an integer of at least 8000.");
  }
  // Benchmark-only transport override. Keep prompts, model effort, explanation
  // cap, and production defaults identical; change only the first candidate cap.
  const configuration = {
    model: context.model,
    reasoningEffort: configuredReasoningEffort(),
    explanationReasoningEffort: process.env.OPENAI_EXPLANATION_REASONING_EFFORT?.trim() || "low",
    strategyRetrieval: context.discovery?.mode ?? "off",
    serviceTier: process.env.OPENAI_SERVICE_TIER?.trim() || "priority",
    promptConfigVersion: context.version,
    ...(options.firstCandidateCap ? { firstCandidateCap: options.firstCandidateCap } : {}),
  };
  console.log(`Benchmark ${options.label}: ${cases.length} cases × ${options.runs} runs, concurrency ${options.concurrency}, ${JSON.stringify(configuration)}`);
  if (options.dryRun) {
    console.log(cases.map((item) => `${item.id}: ${item.labelProvenance}`).join("\n"));
    console.log("Dry run: no API requests.");
    return;
  }
  const client = new OpenAI({ apiKey: await apiKey(), timeout: 170_000, maxRetries: 0 });
  const budget = options.budgetUsd ? createBenchmarkBudget(options.budgetLedger, options.budgetUsd, options.label) : null;
  const benchmarkClient = {
    responses: {
      create(body: OpenAI.Responses.ResponseCreateParamsNonStreaming, requestOptions?: OpenAI.RequestOptions) {
        const candidate = body.text?.format && "name" in body.text.format && body.text.format.name === "solveplot_candidates";
        const request = options.firstCandidateCap && candidate && body.max_output_tokens === 8_000
          ? { ...body, max_output_tokens: options.firstCandidateCap }
          : body;
        const send = async () => await client.responses.create(request, requestOptions);
        return budget ? budget.call(request, send) : send();
      },
    },
  } as unknown as OpenAI;

  const jobs = cases.flatMap((item) => Array.from({ length: options.runs }, (_, runIndex) => ({ item, runIndex })));
  // Preserve completed solves through an interrupted terminal or host restart.
  // A unique journal never overwrites an earlier run or resets its spend ledger.
  const recoveryDir = path.join(process.cwd(), ".solveplot-debug/recovery");
  await mkdir(recoveryDir, { recursive: true });
  const recoveryFile = path.join(recoveryDir, `${options.label}-${Date.now()}.jsonl`);
  await writeFile(recoveryFile, `${JSON.stringify({ configuration, caseIds: cases.map(item => item.id), runs: options.runs })}\n`, { flag: "wx" });
  let journal = Promise.resolve();
  let done = 0;
  const records = await pooled(jobs, options.concurrency, async ({ item, runIndex }) => {
    const record = await runOnce(benchmarkClient, context, item, runIndex, options.captureSolution);
    journal = journal.then(() => appendFile(recoveryFile, `${JSON.stringify(record)}\n`));
    await journal;
    done += 1;
    const status = record.infraFailure
      ? `INFRA ${record.infraFailure}`
      : !record.ok
        ? `FAILED ${record.error}`
        : record.clarification
          ? "CLARIFICATION"
          : `${record.answerCorrect ? "correct" : "WRONG"} ${record.winner?.techniqueId}(${record.strategyClass}) first=${record.methodsMs}ms total=${record.completeMs}ms`;
    console.log(`[${done}/${jobs.length}] ${item.id}#${runIndex + 1} ${status}`);
    return record;
  });

  const metrics = summarizeByGroup(records);
  const baselinePath = options.compare ? path.join(process.cwd(), "evals/results", `${options.compare}.json`) : null;
  const baseline = baselinePath ? JSON.parse(await readFile(baselinePath, "utf8")) : null;
  const report = [
    `# Benchmark: ${options.label}`,
    "",
    `Configuration: \`${JSON.stringify(configuration)}\`. ${cases.length} cases × ${options.runs} runs.`,
    baseline ? `Compared with \`${options.compare}\` (prompt ${baseline.configuration?.promptConfigVersion ?? "unknown"}).` : "",
    "",
    "## Metrics",
    "",
    metricsTable(metrics, baseline?.metrics),
    "",
    "## Where the time goes (per solve)",
    "",
    stageTable(records),
    "",
    "## Validation rejections",
    "",
    rejectionTable(records),
    "",
    "## Per case",
    "",
    perCaseTable(records),
    "",
  ].join("\n");

  const resultsDir = path.join(process.cwd(), "evals/results");
  const reportsDir = path.join(process.cwd(), "evals/reports");
  await mkdir(resultsDir, { recursive: true });
  await mkdir(reportsDir, { recursive: true });
  const budgetSummary = budget ? await budget.summary() : null;
  await writeFile(path.join(resultsDir, `${options.label}.json`), JSON.stringify({ label: options.label, format: 2, configuration, runs: options.runs, caseIds: cases.map((item) => item.id), metrics, records, budget: budgetSummary }, null, 2));
  await writeFile(path.join(reportsDir, `${options.label}.md`), report);
  console.log(`\n${metricsTable(metrics, baseline?.metrics)}\n\nWrote evals/results/${options.label}.json and evals/reports/${options.label}.md`);
  if (budgetSummary) console.log(`Shared API budget: ${JSON.stringify(budgetSummary)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
