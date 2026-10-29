import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type OpenAI from "openai";

import { BenchmarkBudgetError, createBenchmarkBudget, reservationUsd } from "./api-budget";

const request: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
  model: "gpt-5-mini", max_output_tokens: 8_000, service_tier: "priority", input: "Check a short equation.",
};
const response = {
  model: "gpt-5-mini", service_tier: "priority",
  usage: { input_tokens: 100, input_tokens_details: { cached_tokens: 0 }, output_tokens: 100, output_tokens_details: { reasoning_tokens: 20 }, total_tokens: 200 },
} as OpenAI.Responses.Response;

test("reservation includes uncached text bytes, framing and all output; unknown pricing/modalities are refused", () => {
  assert.ok(reservationUsd(request) > 0.0288);
  assert.throws(() => reservationUsd({ ...request, model: "unpriced-model" }), BenchmarkBudgetError);
  assert.throws(() => reservationUsd({ ...request, model: undefined }), /explicit model/);
  assert.throws(() => reservationUsd({ ...request, max_output_tokens: null }), BenchmarkBudgetError);
  assert.throws(() => reservationUsd({ ...request, input: [{ role: "user", content: [{ type: "input_image", image_url: "https://example.test/image", detail: "auto" }] }] }), BenchmarkBudgetError);
});

test("separate budget instances atomically share reservations and settle only usage returned by the API", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "solveplot-budget-"));
  try {
    const file = path.join(dir, "ledger.json");
    const limit = reservationUsd(request) * 1.5;
    const first = createBenchmarkBudget(file, limit, "baseline");
    const second = createBenchmarkBudget(file, limit, "optimized");
    let release!: () => void;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => { started = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const pending = first.call(request, async () => { started(); await gate; return response; });
    await ready;
    let sent = false;
    await assert.rejects(second.call(request, async () => { sent = true; return response; }), /budget exhausted/);
    assert.equal(sent, false);
    release();
    await pending;
    await second.call(request, async () => response);
    const state = await first.summary();
    assert.equal(state.calls, 2);
    assert.equal(state.unresolvedReservations, 0);
    assert.ok(state.accountedUsd < 0.001);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("timeout reservations persist across runs and cannot silently increase the limit", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "solveplot-budget-"));
  try {
    const file = path.join(dir, "ledger.json");
    const limit = reservationUsd(request) * 1.5;
    const budget = createBenchmarkBudget(file, limit, "baseline");
    await assert.rejects(budget.call(request, async () => { throw new Error("timeout"); }), /timeout/);
    const restarted = createBenchmarkBudget(file, limit, "optimized");
    assert.equal((await restarted.summary()).unresolvedReservations, 1);
    await assert.rejects(restarted.call(request, async () => response), /budget exhausted/);
    await assert.rejects(createBenchmarkBudget(file, limit + 1, "raised").summary(), /mismatch/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
