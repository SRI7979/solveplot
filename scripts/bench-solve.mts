/**
 * Latency benchmark for the solve pipeline on real screenshots. Spends real
 * OpenAI credits.
 *
 *   npx tsx scripts/bench-solve.mts <image.png>...
 *
 * Runs the same pipeline src/lib/solve-handler.ts uses (candidates call,
 * selection, explanation call) with a fresh in-memory cache per image, then
 * re-solves the same image to time a cache hit. `methodsReadyMs` is measured
 * on the server; the browser's `rows_shown` mark is the actual first display.
 * Results append to
 * bench-results.jsonl next to the first image.
 */
import OpenAI from "openai";
import { readFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";

import { createMemorySolveCache, eligibleMethods } from "../src/lib/solve-cache";
import { createTrace, loadSolveContext, solveProblem } from "../src/lib/solve-pipeline";
import { createMemoryUsageStore, createMeter } from "../src/lib/spend";

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

async function main() {
  const images = process.argv.slice(2);
  if (!images.length) throw new Error("Pass at least one image path.");
  // Load the same model and reasoning settings as the app. Existing process
  // variables (including explicit benchmark overrides) keep precedence.
  nextEnv.loadEnvConfig(process.cwd());
  const env = await readFile(path.join(process.cwd(), ".env.local"), "utf8").catch(() => "");
  const apiKey = process.env.OPENAI_API_KEY?.trim() || /^OPENAI_API_KEY=(.+)$/m.exec(env)?.[1]?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY missing from .env.local");
  const context = await loadSolveContext();
  const client = new OpenAI({ apiKey, timeout: 170_000, maxRetries: 0 });
  const output = path.join(path.dirname(images[0]), "bench-results.jsonl");

  for (const image of images) {
    const mime = MIME[path.extname(image).toLowerCase()];
    if (!mime) throw new Error(`Unsupported image type: ${image}`);
    const bytes = await readFile(image);
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
    let row: Record<string, unknown> = { image: path.basename(image), promptConfigVersion: context.version };
    try {
      const result = await solveProblem(deps, { kind: "image", bytes, mime });
      row.completeMs = Math.round(performance.now() - started);
      row.methodsReadyMs = Math.round(result.timings.methodsMs);
      row.calls = result.calls;
      if (result.kind === "solved") {
        row.answer = result.solution.answer;
        row.technique = result.method.techniqueId;
        row.methods = eligibleMethods(result.entry).map((method) => `${method.techniqueId} total=${method.total} ${method.shape}`);
        row.rejected = result.entry.methods.filter((method) => method.rejected).map((method) => `${method.techniqueId}: ${method.rejected!.rule}`);
        row.explanation = result.explanation;
        const hitStarted = performance.now();
        const hit = await solveProblem(deps, { kind: "image", bytes, mime });
        row.cacheHitMs = Math.round(performance.now() - hitStarted);
        row.cacheHitCalls = hit.calls;
      } else {
        row.clarification = result.solution.clarification;
      }
    } catch (error) {
      row = { ...row, ms: Math.round(performance.now() - started), error: String(error).slice(0, 300) };
    }
    row.stages = trace.stages;
    row.costUsd = Number(store.records.reduce((total, call) => total + call.costUsd, 0).toFixed(6));
    row.costEstimated = store.records.some((call) => call.estimated);
    row.billing = store.records.map(({ call, serviceTier, status, costUsd, estimated }) => ({ call, serviceTier, status, costUsd, estimated }));
    console.log(JSON.stringify(row));
    await appendFile(output, `${JSON.stringify(row)}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
