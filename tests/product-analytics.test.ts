import assert from "node:assert/strict";
import { test } from "node:test";
import { analyticsPath, sanitizeAnalyticsEvent } from "../src/lib/analytics-privacy";
import { acquisitionSource, createSolverMeasurement, type SolverEvent } from "../src/lib/product-analytics";

test("analytics removes private dynamic IDs and all query/hash data", () => {
  const sanitized = sanitizeAnalyticsEvent({ type: "pageview", url: "https://solveplot.com/history/private-account-uuid?question=secret#answer" });
  assert.deepEqual(sanitized, { type: "pageview", url: "https://solveplot.com/history" });
  assert.deepEqual(sanitizeAnalyticsEvent({ type: "event", url: "https://solveplot.com/solve?problem=secret&email=a@example.com" }), { type: "event", url: "https://solveplot.com/solve" });
  assert.equal(analyticsPath("/learn/checkpoint/desmos-beginner"), "/learn");
  assert.equal(analyticsPath("/guides/regression"), "/guides/regression");
});

test("unknown guide slugs and all update details never expose raw path segments", () => {
  for (const path of ["/guides/my-private-name", "/guides/private@example.com", "/guides/private/nested-value"]) {
    assert.equal(analyticsPath(path), "/guides");
    assert.deepEqual(sanitizeAnalyticsEvent({ type: "pageview", url: `https://solveplot.com${path}?secret=value` }), { type: "pageview", url: "https://solveplot.com/guides" });
  }
  assert.equal(analyticsPath("/updates/my-private-name"), "/updates");
  assert.equal(analyticsPath("/updates/luna-low"), "/updates");
  for (const slug of ["desmos-sat", "systems-of-equations", "regression", "quadratics"]) assert.equal(analyticsPath(`/guides/${slug}`), `/guides/${slug}`);
});

test("auth callbacks, reset tokens, API and unknown URLs are not analytics pages", () => {
  for (const path of ["/auth/callback?code=secret", "/auth/reset-password#token", "/login?next=private", "/api/solve", "/unknown/private-user"]) {
    assert.equal(sanitizeAnalyticsEvent({ type: "pageview", url: `https://solveplot.com${path}` }), null);
  }
  assert.equal(sanitizeAnalyticsEvent({ type: "pageview", url: "javascript:alert(1)" }), null);
});

test("acquisition categories never preserve raw referrers or accept lookalike search hosts", () => {
  const origin = "https://solveplot.com";
  assert.equal(acquisitionSource("https://www.google.com/search?q=private+query", origin), "google");
  assert.equal(acquisitionSource("https://www.bing.com/search?q=private", origin), "bing");
  assert.equal(acquisitionSource("https://chatgpt.com/?private=1", origin), "chatgpt");
  assert.equal(acquisitionSource("https://google.com.evil.example", origin), "other_referral");
  assert.equal(acquisitionSource("https://solveplot.com/history/private", origin), "direct_or_unknown");
  assert.equal(acquisitionSource("", origin), "direct_or_unknown");
});

test("one solve counts each stage once and cannot emit output before submission", () => {
  const events: SolverEvent[] = [];
  const measurement = createSolverMeasurement({ input: "image", source: "google" }, event => events.push(event));
  measurement.mark("solver_solution_ready");
  assert.equal(events.length, 0);
  measurement.mark("solver_started");
  measurement.mark("solver_method_ready");
  measurement.mark("solver_method_ready");
  measurement.mark("solver_solution_ready");
  measurement.mark("solver_readout_checked");
  measurement.mark("solver_readout_checked");
  assert.deepEqual(events.map(event => event.name), ["solver_started", "solver_method_ready", "solver_solution_ready", "solver_readout_checked"]);
  assert.ok(events.every(event => Object.keys(event.properties).sort().join(",") === "input,source"));
});

test("measurement drops extra runtime properties and never breaks solving if a sink fails", () => {
  const events: SolverEvent[] = [];
  const data = { input: "text" as const, source: "bing" as const, question: "SECRET", userId: "PRIVATE", email: "private@example.com" };
  const measurement = createSolverMeasurement(data, event => events.push(event));
  measurement.mark("solver_started");
  assert.deepEqual(events[0].properties, { input: "text", source: "bing" });
  assert.doesNotThrow(() => createSolverMeasurement(data, () => { throw new Error("blocked"); }).mark("solver_started"));
});
