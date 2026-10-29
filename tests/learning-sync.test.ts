import assert from "node:assert/strict";
import { mock, test, type TestContext } from "node:test";
import { clearLessonDraft, flushLearningProgress, startLearningSync, getLearningProgress, getLearningSyncStatus, getLessonDraft, mergeLearningProgress,
  parseLearningProgress, recordLessonCompletion, saveLessonDraft, stableProgressJSON, syncLearningProgress, validateLearningProgress, type LearningProgress } from "../src/lib/learning-progress";
import type { LessonAttempt, LessonDraft } from "../src/lib/learning-session";

const past = new Date(Date.now() - 20_000).toISOString();
const later = new Date(Date.now() - 10_000).toISOString();
const attempt: LessonAttempt = { input: "14", tries: 1, correct: true, submitted: true, assisted: false, hint: false, usedHint: false, why: false, feedback: "The output is 14.", invalid: false, firstTryCorrect: true };
const draft = (change: Partial<LessonDraft> = {}): LessonDraft => ({ version: 1, contentVersion: "learn-v2:abc", step: 2, attempts: { evaluate: { ...attempt } }, updatedAt: past, ...change });
const empty = (): LearningProgress => ({ lessons: {}, checkpoints: {}, drafts: {} });
function browser(t: TestContext) {
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: Object.assign(new EventTarget(), { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } }) });
  t.after(() => { mock.restoreAll(); if (old) Object.defineProperty(globalThis, "window", old); else Reflect.deleteProperty(globalThis, "window"); });
}

test("drafts resume exact answers, isolate accounts, support checkpoints, and retain a completed session", t => {
  browser(t);
  saveLessonDraft("user:resume-a", "introduction-to-desmos", draft());
  saveLessonDraft("user:resume-a", "desmos-beginner", draft({ step: 4 }));
  assert.equal(getLessonDraft("user:resume-a", "introduction-to-desmos")?.attempts.evaluate.input, "14");
  assert.equal(getLessonDraft("user:resume-b", "introduction-to-desmos"), null);
  assert.equal(getLessonDraft("guest", "introduction-to-desmos"), null);
  saveLessonDraft("user:resume-a", "introduction-to-desmos", draft({ step: 9, updatedAt: later, completed: true }));
  recordLessonCompletion("user:resume-a", "introduction-to-desmos", { answered: 3, assisted: 1, total: 4, firstTryCorrect: 2, hintsUsed: 1, attempts: 6 });
  assert.equal(getLessonDraft("user:resume-a", "introduction-to-desmos")?.step, 9, "completed screen survives reopening");
  assert.equal(getLessonDraft("user:resume-a", "introduction-to-desmos")?.completed, true);
  saveLessonDraft("user:resume-a", "introduction-to-desmos", draft({ step: 0, attempts: {}, updatedAt: new Date().toISOString() }));
  assert.equal(getLearningProgress("user:resume-a").lessons["introduction-to-desmos"].firstTryCorrect, 2, "repeat preserves the best completed result");
});

test("legacy completions never invent first-try statistics and invalid drafts do not survive", () => {
  const legacy = parseLearningProgress(JSON.stringify({ lessons: { tables: { answered: 2, assisted: 0, total: 2, completedAt: past } }, checkpoints: {} }));
  assert.equal(legacy.lessons.tables.firstTryCorrect, undefined);
  assert.deepEqual(legacy.drafts, {});
  for (const invalid of [draft({ step: -1 }), { ...draft(), version: 2 }, { ...draft(), completed: "yes" }, draft({ contentVersion: "" }), draft({ attempts: { evaluate: { ...attempt, input: "x".repeat(81) } } })]) {
    assert.equal(validateLearningProgress({ ...empty(), drafts: { tables: invalid } }), null);
  }
  assert.equal(validateLearningProgress({ ...empty(), drafts: { invented: draft() } }), null);
  assert.equal(validateLearningProgress({ ...empty(), drafts: { tables: draft({ updatedAt: new Date(Date.now() + 600_000).toISOString() }) } }), null);
  assert.equal(validateLearningProgress({ ...empty(), userId: "someone-else" }), null);
});

test("merges are commutative and preserve independent device edits and the best score", () => {
  const left: LearningProgress = { lessons: { tables: { answered: 3, assisted: 1, total: 4, firstTryCorrect: 2, completedAt: past } }, checkpoints: { "desmos-beginner": { correct: 2, total: 4, completedAt: past } }, drafts: { tables: draft() } };
  const right: LearningProgress = { lessons: { tables: { answered: 4, assisted: 0, total: 4, firstTryCorrect: 3, completedAt: later } }, checkpoints: { "desmos-beginner": { correct: 1, total: 4, completedAt: later } }, drafts: { tables: draft({ step: 3, updatedAt: later }), lists: draft() } };
  const result = mergeLearningProgress(left, right);
  assert.equal(stableProgressJSON(result), stableProgressJSON(mergeLearningProgress(right, left)));
  assert.equal(result.lessons.tables.firstTryCorrect, 3);
  assert.equal(result.checkpoints["desmos-beginner"].correct, 2);
  assert.equal(result.drafts.tables.step, 3);
  assert.ok(result.drafts.lists);
  assert.equal(stableProgressJSON(result), stableProgressJSON(mergeLearningProgress(result, left)), "old replays cannot undo newer work");
});

test("explicit reset tombstones stop another device from resurrecting an old draft", t => {
  browser(t);
  const old = { ...empty(), drafts: { tables: draft() } };
  saveLessonDraft("user:reset", "tables", draft());
  clearLessonDraft("user:reset", "tables");
  const reset = getLearningProgress("user:reset");
  assert.equal(mergeLearningProgress(reset, old).drafts.tables, undefined);
  assert.equal(getLessonDraft("user:reset", "tables"), null);
  const future = new Date(Date.now() + 1_000).toISOString();
  saveLessonDraft("user:reset", "tables", draft({ step: 0, updatedAt: future }));
  assert.equal(getLessonDraft("user:reset", "tables")?.step, 0);
});

test("a slow cloud read and write cannot overwrite answers typed while either request is pending", async t => {
  browser(t);
  const scope = "user:sync-race";
  let releaseRead!: (value: Response) => void;
  let releaseWrite!: (value: Response) => void;
  let sent: LearningProgress | null = null;
  const writeStarted = Promise.withResolvers<void>();
  mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    assert.equal((init?.headers as Record<string, string>)["X-SolvePlot-Account"], "sync-race");
    if (init?.method !== "POST") return new Promise<Response>(resolve => { releaseRead = resolve; });
    sent = JSON.parse(String(init.body)).progress; writeStarted.resolve();
    return new Promise<Response>(resolve => { releaseWrite = resolve; });
  });
  const work = syncLearningProgress(scope);
  saveLessonDraft(scope, "tables", draft({ step: 3, updatedAt: later }));
  releaseRead(Response.json({ userId: "sync-race", progress: { ...empty(), drafts: { lists: draft() } } }));
  await writeStarted.promise;
  assert.equal((sent as unknown as LearningProgress).drafts.tables.step, 3);
  assert.ok((sent as unknown as LearningProgress).drafts.lists);
  saveLessonDraft(scope, "tables", draft({ step: 4, updatedAt: new Date().toISOString() }));
  releaseWrite(Response.json({ userId: "sync-race", progress: sent }));
  await work;
  assert.equal(getLessonDraft(scope, "tables")?.step, 4);
  assert.equal(getLearningSyncStatus(scope), "syncing", "newer local answer is not falsely labeled synced");
});

test("guests never sync, account changes stop uploads, and offline data stays usable", async t => {
  browser(t);
  let calls = 0;
  mock.method(globalThis, "fetch", async () => { calls++; return Response.json({ userId: "different-account", progress: empty() }); });
  await syncLearningProgress("guest"); assert.equal(calls, 0);
  saveLessonDraft("user:old-account", "tables", draft());
  await syncLearningProgress("user:old-account");
  assert.equal(calls, 1, "mismatching read must never upload local data to the newly signed-in account");
  assert.equal(getLearningSyncStatus("user:old-account"), "sign-in-required");
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => { throw new Error("offline"); });
  await syncLearningProgress("user:old-account");
  assert.equal(getLearningSyncStatus("user:old-account"), "offline");
  assert.equal(getLessonDraft("user:old-account", "tables")?.step, 2);
});

test("missing database setup is distinct from a temporary storage outage", async t => {
  browser(t);
  mock.method(globalThis, "fetch", async () => Response.json({ kind: "setup_required" }, { status: 503 }));
  await syncLearningProgress("user:setup-status"); assert.equal(getLearningSyncStatus("user:setup-status"), "setup-required");
  mock.restoreAll();
  mock.method(globalThis, "fetch", async () => Response.json({ kind: "unavailable" }, { status: 503 }));
  await syncLearningProgress("user:setup-status"); assert.equal(getLearningSyncStatus("user:setup-status"), "offline");
});


test("blocked device persistence reports session-only rather than a durable saved claim", t => {
  browser(t);
  mock.method(window.localStorage, "setItem", () => { throw new Error("storage blocked"); });
  saveLessonDraft("guest", "tables", draft());
  assert.equal(getLearningSyncStatus("guest"), "session-only");
  assert.equal(getLessonDraft("guest", "tables")?.step, 2);
});


test("the exit keepalive preserves final answers and a late older acknowledgment cannot undo it", async t => {
  browser(t);
  const scope = "user:exit-save";
  let releaseOld!: (value: Response) => void;
  const oldPosted = Promise.withResolvers<void>();
  let oldBody: LearningProgress | null = null;
  const requests: RequestInit[] = [];
  mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    requests.push(init ?? {});
    if (init?.method !== "POST") return Response.json({ userId: "exit-save", progress: empty() });
    const data = JSON.parse(String(init.body)).progress as LearningProgress;
    if (!oldBody) { oldBody = data; oldPosted.resolve(); return new Promise<Response>(resolve => { releaseOld = resolve; }); }
    assert.equal(init.keepalive, true);
    assert.equal(data.drafts.tables.step, 4);
    return Response.json({ userId: "exit-save", progress: data });
  });
  saveLessonDraft(scope, "tables", draft());
  const older = syncLearningProgress(scope); await oldPosted.promise;
  saveLessonDraft(scope, "tables", draft({ step: 4, updatedAt: later }));
  assert.notEqual(getLearningSyncStatus(scope), "synced", "new work is not falsely synced while its debounce is queued");
  await flushLearningProgress(scope);
  assert.equal(getLearningSyncStatus(scope), "synced");
  releaseOld(Response.json({ userId: "exit-save", progress: oldBody })); await older;
  assert.equal(getLessonDraft(scope, "tables")?.step, 4);
  assert.equal(getLearningSyncStatus(scope), "synced", "older response cannot downgrade the newer confirmed save");
  assert.equal(requests.filter(item => item.method === "POST").length, 2);
});

test("leaving Learn flushes after the player's own cleanup has saved its latest slide", async t => {
  browser(t);
  const scope = "user:unmount-final";
  const posted = Promise.withResolvers<LearningProgress>();
  mock.method(globalThis, "fetch", async (_url: unknown, init?: RequestInit) => {
    if (init?.method !== "POST") return Response.json({ userId: "unmount-final", progress: empty() });
    const data = JSON.parse(String(init.body)).progress as LearningProgress;
    assert.equal(init.keepalive, true); posted.resolve(data);
    return Response.json({ userId: "unmount-final", progress: data });
  });
  const stop = startLearningSync(scope);
  // Let the initial empty read finish; it should not need an empty write.
  await syncLearningProgress(scope);
  saveLessonDraft(scope, "tables", draft());
  stop();
  // React runs the player cleanup after the progress hook cleanup.
  saveLessonDraft(scope, "tables", draft({ step: 5, updatedAt: later }));
  assert.equal((await posted.promise).drafts.tables.step, 5);
  await new Promise(resolve => setTimeout(resolve, 0));
});


test("equal-time merge ties converge across content revisions and equivalent timestamp formats", () => {
  const left: LearningProgress = { ...empty(), lessons: { tables: { answered: 2, assisted: 0, total: 2, completedAt: past } }, drafts: { tables: draft() } };
  const right: LearningProgress = { ...empty(), lessons: { tables: { answered: 3, assisted: 0, total: 3, completedAt: past } }, drafts: { tables: draft({ step: 3, updatedAt: past.replace("Z", "+00:00") }) } };
  assert.equal(stableProgressJSON(mergeLearningProgress(left, right)), stableProgressJSON(mergeLearningProgress(right, left)));
});
