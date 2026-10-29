/**
 * OpenAI list prices in USD per 1M tokens, from
 * https://developers.openai.com/api/docs/pricing (checked 2026-10-25).
 * "priority" was renamed Fast mode on 2026-07-30; responses can report either
 * "priority" or "fast" depending on the model. Update this table when prices change: every
 * recorded cost and both spend ceilings are computed from it.
 */
export type Rate = { input: number; cachedInput: number; output: number };

export const MODEL_RATES: Record<string, { default: Rate; priority?: Rate }> = {
  // Official model/pricing pages checked 2026-10-26. Diagnostic only; not a solver default.
  "gpt-6.1-sol": {
    default: { input: 2, cachedInput: 0.1, output: 10 },
    priority: { input: 4, cachedInput: 0.2, output: 20 },
  },
  "gpt-5-mini": {
    default: { input: 0.25, cachedInput: 0.025, output: 2.0 },
    priority: { input: 0.45, cachedInput: 0.045, output: 3.6 },
  },
  "gpt-5": {
    default: { input: 1.25, cachedInput: 0.125, output: 10.0 },
    priority: { input: 2.5, cachedInput: 0.25, output: 20.0 },
  },
  "gpt-5-nano": {
    default: { input: 0.05, cachedInput: 0.005, output: 0.4 },
  },
  "gpt-6-luna": {
    default: { input: 0.1, cachedInput: 0.01, output: 0.5 },
    priority: { input: 0.2, cachedInput: 0.02, output: 1.0 },
  },
};

/**
 * A model missing from the table is billed at the most expensive rate we
 * know, so an unpriced model can only make the ceilings trip early, never late.
 */
const UNKNOWN_MODEL_RATE: Rate = { input: 4, cachedInput: 0.25, output: 20.0 };

/** Token counts from a Responses API `usage` object. Reasoning tokens are part of output. */
export type Usage = {
  inputTokens: number;
  cachedTokens: number;
  /** Newer-model cache writes, billed instead of ordinary input at 1.25× or 2.5×. */
  cacheWrite30mTokens?: number;
  cacheWrite12hTokens?: number;
  outputTokens: number;
  reasoningTokens: number;
  totalTokens: number;
};

export const NO_USAGE: Usage = { inputTokens: 0, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0, totalTokens: 0 };

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

export function usageFrom(raw: unknown): Usage {
  const usage = (raw ?? {}) as {
    input_tokens?: unknown;
    output_tokens?: unknown;
    total_tokens?: unknown;
    input_tokens_details?: {
      cached_tokens?: unknown;
      cache_write_tokens?: unknown;
      cache_write_tokens_details?: { ttl_30m_tokens?: unknown; ttl_12h_tokens?: unknown };
    };
    output_tokens_details?: { reasoning_tokens?: unknown };
  };
  const inputTokens = count(usage.input_tokens);
  const outputTokens = count(usage.output_tokens);
  const details = usage.input_tokens_details;
  const cachedTokens = Math.min(inputTokens, count(details?.cached_tokens));
  const availableWrites = inputTokens - cachedTokens;
  const writeDetails = details?.cache_write_tokens_details;
  const reported30m = count(writeDetails?.ttl_30m_tokens);
  const reported12h = count(writeDetails?.ttl_12h_tokens);
  // The API normally returns both lifetimes. If only an aggregate arrives,
  // charge its unknown remainder at the higher rate so spend caps stay safe.
  const unclassified = Math.max(0, count(details?.cache_write_tokens) - reported30m - reported12h);
  const cacheWrite12hTokens = Math.min(availableWrites, reported12h + unclassified);
  const cacheWrite30mTokens = Math.min(availableWrites - cacheWrite12hTokens, reported30m);
  return {
    inputTokens,
    cachedTokens,
    ...(writeDetails || unclassified > 0 ? { cacheWrite30mTokens, cacheWrite12hTokens } : {}),
    outputTokens,
    reasoningTokens: Math.min(outputTokens, count(usage.output_tokens_details?.reasoning_tokens)),
    totalTokens: count(usage.total_tokens) || inputTokens + outputTokens,
  };
}

/**
 * The rate for a model and the tier OpenAI reports it actually used. Dated
 * snapshots ("gpt-5-mini-2025-08-07") use their base model's price; the
 * longest matching base wins, so gpt-5-mini is never priced as gpt-5.
 */
export function rateFor(model: string, serviceTier: string | null | undefined): { rate: Rate; known: boolean } {
  const base = Object.keys(MODEL_RATES)
    .filter((name) => model === name || model.startsWith(`${name}-`))
    .sort((left, right) => right.length - left.length)[0];
  if (!base) return { rate: UNKNOWN_MODEL_RATE, known: false };
  const rates = MODEL_RATES[base];
  const fastTier = serviceTier === "priority" || serviceTier === "fast";
  return { rate: fastTier && rates.priority ? rates.priority : rates.default, known: true };
}

/** USD for one call; cache writes replace ordinary input and reasoning is included in output. */
export function costUsd(usage: Usage, rate: Rate): number {
  const write30m = usage.cacheWrite30mTokens ?? 0;
  const write12h = usage.cacheWrite12hTokens ?? 0;
  const ordinaryInput = Math.max(0, usage.inputTokens - usage.cachedTokens - write30m - write12h);
  const dollars = (
    ordinaryInput * rate.input +
    usage.cachedTokens * rate.cachedInput +
    write30m * rate.input * 1.25 +
    write12h * rate.input * 2.5 +
    usage.outputTokens * rate.output
  ) / 1_000_000;
  return Math.round(dollars * 1_000_000) / 1_000_000;
}

/**
 * A call that timed out may still have run to completion and been billed,
 * but its usage never arrives. It is recorded at this deliberately high
 * estimate (a typical prompt plus the request's full output allowance), so
 * a timeout can only make the spend ceiling trip early.
 */
export function timeoutEstimate(call: "candidates" | "explanation" | "desmos_retry" | "tutor", maxOutputTokens: number): Usage {
  const inputTokens = call === "explanation" ? 1_500 : call === "tutor" ? 2_500 : 32_000;
  return { inputTokens, cachedTokens: 0, outputTokens: maxOutputTokens, reasoningTokens: 0, totalTokens: inputTokens + maxOutputTokens };
}
