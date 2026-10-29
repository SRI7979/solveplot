/** Coarse, anonymous funnel signals. No questions, answers, filenames, IDs, raw
 * URLs, or cross-visit identifiers are accepted by this module's public API. */
export type AcquisitionSource = "google" | "bing" | "chatgpt" | "perplexity" | "other_search" | "other_referral" | "direct_or_unknown";
export type SolverEventName = "solver_started" | "solver_method_ready" | "solver_solution_ready" | "solver_readout_checked";
export type SolverMeasurement = { input: "image" | "text"; source: AcquisitionSource };
export type SolverEvent = { name: SolverEventName; properties: SolverMeasurement };
export const SOLVER_MEASUREMENT_EVENT = "solveplot:measurement";
const SOURCES: readonly AcquisitionSource[] = ["google", "bing", "chatgpt", "perplexity", "other_search", "other_referral", "direct_or_unknown"];

export function acquisitionSource(referrer: string, ownOrigin: string): AcquisitionSource {
  if (!referrer) return "direct_or_unknown";
  try {
    const url = new URL(referrer);
    if (url.origin === ownOrigin) return "direct_or_unknown";
    const host = url.hostname.toLowerCase();
    if (/^(?:www\.)?google\.(?:com|[a-z]{2,3}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(host)) return "google";
    if (/^(?:www\.)?bing\.com$/.test(host)) return "bing";
    if (/^(?:www\.)?(?:chatgpt\.com|chat\.openai\.com)$/.test(host)) return "chatgpt";
    if (/^(?:www\.)?perplexity\.ai$/.test(host)) return "perplexity";
    if (/^(?:www\.)?(?:duckduckgo\.com|search\.yahoo\.com|search\.brave\.com)$/.test(host)) return "other_search";
    return "other_referral";
  } catch { return "direct_or_unknown"; }
}

/** One tracker per explicit solve submission; re-renders, repeated preflight,
 * lazy explanations and alternative switches cannot count a stage twice. */
export function createSolverMeasurement(context: SolverMeasurement, send: (event: SolverEvent) => void) {
  const seen = new Set<SolverEventName>();
  const properties: SolverMeasurement = {
    input: context.input === "image" ? "image" : "text",
    source: SOURCES.includes(context.source) ? context.source : "direct_or_unknown",
  };
  return {
    mark(name: SolverEventName) {
      if (seen.has(name) || (name !== "solver_started" && !seen.has("solver_started"))) return;
      seen.add(name);
      try { send({ name, properties: { ...properties } }); } catch { /* Measurement must never interrupt a solve. */ }
    },
  };
}
export type SolverMeasurementTracker = ReturnType<typeof createSolverMeasurement>;

/** Capture remains in this document only. Export is opt-in because Vercel
 * custom events require a paid plan; the default adds no remote events/cost. */
export function sendSolverMeasurement(event: SolverEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<SolverEvent>(SOLVER_MEASUREMENT_EVENT, { detail: event }));
  if (process.env.NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS === "true") {
    void import("@vercel/analytics").then(({ track }) => track(event.name, event.properties)).catch(() => {});
  }
}
