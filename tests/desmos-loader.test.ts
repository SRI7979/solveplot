import assert from "node:assert/strict";
import { test } from "node:test";
import type { DesmosApi } from "../src/lib/desmos-engine";
import { createDesmosLoader, desmosScriptUrl } from "../src/lib/desmos-loader";

const api: DesmosApi = { GraphingCalculator: () => { throw new Error("Not used by the loader"); } };

function harness(options: { attempts?: number; timeoutMs?: number } = {}) {
  let available: DesmosApi | undefined;
  let notifications = 0;
  const requests: Array<{ onLoad: () => void; onError: () => void; removed: boolean }> = [];
  const load = createDesmosLoader({
    readApi: () => available,
    insertScript(request) {
      const tracked = { ...request, removed: false };
      requests.push(tracked);
      return () => { tracked.removed = true; };
    },
    onReady: () => { notifications += 1; },
  }, { timeoutMs: 100, retryDelayMs: 1, ...options });
  return { load, requests, exposeApi: () => { available = api; }, notifications: () => notifications };
}

test("visible calculator and preflight share one download, and remount uses the existing API", async () => {
  const h = harness();
  const visible = h.load("key");
  const preflight = h.load("key");
  assert.equal(visible, preflight);
  assert.equal(h.requests.length, 1);
  h.exposeApi();
  h.requests[0].onLoad();
  assert.equal(await visible, api);
  assert.equal(await preflight, api);
  assert.equal(await h.load("key"), api);
  assert.equal(h.requests.length, 1);
  assert.equal(h.notifications(), 1);
});

test("a transient network failure retries once and notifies waiting preflight consumers", async () => {
  const h = harness();
  const pending = h.load("key");
  h.requests[0].onError();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(h.requests[0].removed, true);
  assert.equal(h.requests.length, 2);
  h.exposeApi();
  h.requests[1].onLoad();
  assert.equal(await pending, api);
  assert.equal(h.notifications(), 1);
});

test("a failed download does not poison a later explicit retry", async () => {
  const h = harness({ attempts: 1 });
  const first = h.load("key");
  const rejected = assert.rejects(first, /could not load/);
  h.requests[0].onError();
  await rejected;
  const retry = h.load("key");
  assert.equal(h.requests.length, 2);
  h.exposeApi();
  h.requests[1].onLoad();
  assert.equal(await retry, api);
});

test("a stalled script is removed and can be loaded again without a page reload", async () => {
  const h = harness({ attempts: 1, timeoutMs: 5 });
  await assert.rejects(h.load("key"), /timed out/);
  assert.equal(h.requests[0].removed, true);
  const retry = h.load("key");
  h.exposeApi();
  h.requests[1].onLoad();
  assert.equal(await retry, api);
});

test("a load event without a usable API is not accepted as readiness", async () => {
  const h = harness({ attempts: 1 });
  const pending = h.load("key");
  const rejected = assert.rejects(pending, /did not initialize/);
  h.requests[0].onLoad();
  await rejected;
  assert.equal(h.notifications(), 0);
  assert.equal(h.requests[0].removed, true);
});

test("an absent key fails immediately and request URLs encode the configured key", async () => {
  const h = harness();
  await assert.rejects(h.load("  "), /key is missing/);
  assert.equal(h.requests.length, 0);
  assert.equal(desmosScriptUrl(" key+value "), "https://www.desmos.com/api/v1.11/calculator.js?apiKey=key%2Bvalue");
});
