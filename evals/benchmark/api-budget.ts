import type OpenAI from "openai";
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { costUsd, rateFor, usageFrom } from "../../src/lib/model-pricing";

type Request = OpenAI.Responses.ResponseCreateParamsNonStreaming;
type Entry = { id: string; label: string; model: string; reservedUsd: number; chargedUsd: number; status: "pending" | "reported" | "unknown"; createdAt: string };
type Ledger = { version: 1; limitUsd: number; entries: Entry[] };
export class BenchmarkBudgetError extends Error { override readonly name = "BenchmarkBudgetError"; }
const roundUp = (usd: number) => Math.ceil(usd * 1_000_000) / 1_000_000;
function requestModel(body: Request): string {
  if (typeof body.model !== "string" || !body.model.trim()) throw new BenchmarkBudgetError("An explicit model is required for budgeted calls.");
  return body.model;
}

/**
 * Text-only calls: byte count is deliberately much larger than token count.
 * Reserve the whole serialized request, 4096 framing tokens, the full output
 * cap, and the most expensive known service tier. No cache discount assumed;
 * 2.5x input covers even a 12-hour cache write. Reject modalities/tools whose
 * billing cannot be bounded by text bytes. This is a local experiment guard,
 * not a replacement for the provider's billing records.
 */
export function reservationUsd(body: Request): number {
  const model = requestModel(body);
  if (!Number.isSafeInteger(body.max_output_tokens) || !body.max_output_tokens || body.max_output_tokens < 1) {
    throw new BenchmarkBudgetError("A positive max_output_tokens is required for budgeted calls.");
  }
  if (body.tools?.length || body.previous_response_id || body.conversation || body.background || body.stream) {
    throw new BenchmarkBudgetError("Budgeted benchmarks support standalone, non-streaming text calls only.");
  }
  const json = JSON.stringify(body);
  if (/"type"\s*:\s*"input_(?:image|file|audio)"/.test(json)) {
    throw new BenchmarkBudgetError("Image, file, and audio calls require a separate cost bound.");
  }
  const standard = rateFor(model, "default");
  const priority = rateFor(model, "priority");
  if (!standard.known || !priority.known) throw new BenchmarkBudgetError(`No verified pricing for ${model}.`);
  const input = Math.max(standard.rate.input, priority.rate.input) * 2.5;
  const output = Math.max(standard.rate.output, priority.rate.output);
  return roundUp(((Buffer.byteLength(json, "utf8") + 4096) * input + body.max_output_tokens * output) / 1_000_000);
}

export function createBenchmarkBudget(file: string, limitUsd: number, label: string) {
  if (!Number.isFinite(limitUsd) || limitUsd <= 0) throw new BenchmarkBudgetError("Budget must be positive.");
  const ledgerPath = path.resolve(file);
  const lockPath = `${ledgerPath}.lock`;

  async function update<T>(fn: (ledger: Ledger) => T): Promise<T> {
    await mkdir(path.dirname(ledgerPath), { recursive: true });
    let lock;
    for (let attempt = 0; attempt < 250; attempt += 1) {
      try { lock = await open(lockPath, "wx"); break; }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    if (!lock) throw new BenchmarkBudgetError(`Budget ledger locked: ${lockPath}. Inspect any interrupted run before removing its lock.`);
    try {
      const contents = await readFile(ledgerPath, "utf8").catch((error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      const ledger: Ledger = contents ? JSON.parse(contents) : { version: 1, limitUsd, entries: [] };
      if (ledger.version !== 1 || ledger.limitUsd !== limitUsd || !Array.isArray(ledger.entries)) {
        throw new BenchmarkBudgetError("Budget ledger version/limit mismatch; do not reset a shared experiment ledger.");
      }
      const result = fn(ledger);
      const temp = `${ledgerPath}.${randomUUID()}.tmp`;
      await writeFile(temp, JSON.stringify(ledger, null, 2));
      await rename(temp, ledgerPath);
      return result;
    } finally {
      await lock.close();
      await unlink(lockPath);
    }
  }

  const summary = () => update((ledger) => ({
    limitUsd: ledger.limitUsd,
    accountedUsd: roundUp(ledger.entries.reduce((sum, entry) => sum + entry.chargedUsd, 0)),
    reportedUsd: roundUp(ledger.entries.filter((entry) => entry.status === "reported").reduce((sum, entry) => sum + entry.chargedUsd, 0)),
    unresolvedReservations: ledger.entries.filter((entry) => entry.status !== "reported").length,
    calls: ledger.entries.length,
    ledgerPath,
  }));

  return {
    summary,
    async call(body: Request, send: () => Promise<OpenAI.Responses.Response>) {
      const model = requestModel(body);
      const reservedUsd = reservationUsd(body);
      const id = randomUUID();
      await update((ledger) => {
        const used = ledger.entries.reduce((sum, entry) => sum + entry.chargedUsd, 0);
        if (used + reservedUsd > ledger.limitUsd + 1e-9) {
          throw new BenchmarkBudgetError(`Benchmark budget exhausted: $${used.toFixed(4)} accounted + $${reservedUsd.toFixed(4)} reservation exceeds $${ledger.limitUsd.toFixed(2)}.`);
        }
        ledger.entries.push({ id, label, model, reservedUsd, chargedUsd: reservedUsd, status: "pending", createdAt: new Date().toISOString() });
      });
      try {
        const response = await send();
        const usage = usageFrom(response.usage);
        if (!response.usage || usage.totalTokens === 0) throw new BenchmarkBudgetError("API returned no usage; retaining the full reservation.");
        const { rate, known } = rateFor(response.model || model, response.service_tier ?? body.service_tier);
        if (!known) throw new BenchmarkBudgetError("API returned an unpriced model; retaining the full reservation.");
        const chargedUsd = costUsd(usage, rate);
        await update((ledger) => {
          const entry = ledger.entries.find((item) => item.id === id)!;
          entry.chargedUsd = chargedUsd;
          entry.status = "reported";
        });
        return response;
      } catch (error) {
        await update((ledger) => {
          const entry = ledger.entries.find((item) => item.id === id)!;
          if (entry.status === "pending") entry.status = "unknown";
        });
        throw error;
      }
    },
  };
}
