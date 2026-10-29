import assert from "node:assert/strict";
import { test } from "node:test";
import { createLearningProgressHandlers, type LearningProgressStore, type StoredLearningProgress } from "../src/lib/learning-progress-handler";
import { EMPTY_LEARNING_PROGRESS, type LearningProgress } from "../src/lib/learning-progress";

const now = new Date().toISOString();
const progress = (lesson = "tables"): LearningProgress => ({ lessons: { [lesson]: { answered: 3, assisted: 1, total: 4, firstTryCorrect: 2, hintsUsed: 1, attempts: 6, completedAt: now } }, checkpoints: {}, drafts: {} });
function store(): LearningProgressStore & { data: Map<string, StoredLearningProgress>; writes: number } {
  return { data: new Map(), writes: 0,
    async read(userId) { return this.data.get(userId) ?? null; },
    async create(userId, value) { if (this.data.has(userId)) return false; this.data.set(userId, { progress: value, revision: 1 }); this.writes++; return true; },
    async replace(userId, revision, value) { if (this.data.get(userId)?.revision !== revision) return false; this.data.set(userId, { progress: value, revision: revision + 1 }); this.writes++; return true; },
  };
}
const request = (body: unknown, headers: Record<string, string> = {}) => new Request("https://solveplot.test/api/learn/progress", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });

test("learning API derives ownership from auth, requires sign-in, and never accepts a body-selected account", async () => {
  const storage = store(); let user: { id: string } | null = null;
  const route = createLearningProgressHandlers({ getCurrentUser: async () => user, getStore: () => storage });
  assert.equal((await route.GET(new Request("https://solveplot.test/api/learn/progress"))).status, 401);
  assert.equal((await route.POST(request({ progress: progress() }))).status, 401);
  user = { id: "alice" };
  assert.equal((await route.POST(request({ progress: progress(), userId: "bob" }))).status, 400);
  assert.equal((await route.POST(request({ progress: progress() }, { "X-SolvePlot-Account": "bob" }))).status, 409);
  assert.equal((await route.POST(request({ progress: progress() }, { "Origin": "https://other.test" }))).status, 403);
  assert.equal(storage.writes, 0);
  const saved = await route.POST(request({ progress: progress() }, { "X-SolvePlot-Account": "alice" }));
  assert.equal(saved.status, 200);
  assert.equal((await saved.json()).userId, "alice");
  assert.ok(storage.data.has("alice")); assert.ok(!storage.data.has("bob"));
  user = { id: "bob" };
  const other = await route.GET(new Request("https://solveplot.test/api/learn/progress"));
  assert.deepEqual((await other.json()).progress, EMPTY_LEARNING_PROGRESS);
});

test("API rejects malformed, excessive, future-dated, and unknown completion data", async () => {
  const storage = store();
  const route = createLearningProgressHandlers({ getCurrentUser: async () => ({ id: "alice" }), getStore: () => storage });
  for (const invalid of [null, [], { arbitrary: true }, { ...progress(), lessons: { invented: progress().lessons.tables } },
    { ...progress(), lessons: { tables: { ...progress().lessons.tables, firstTryCorrect: 5 } } },
    { ...progress(), lessons: { tables: { ...progress().lessons.tables, completedAt: new Date(Date.now() + 600_000).toISOString() } } }]) {
    assert.equal((await route.POST(request({ progress: invalid }))).status, 400);
  }
  assert.equal((await route.POST(new Request("https://solveplot.test/api/learn/progress", { method: "POST", body: "{}" }))).status, 415);
  assert.equal((await route.POST(request({ progress: progress() }, { "Content-Length": "300000" }))).status, 413);
  assert.equal((await route.POST(request({ progress: "x".repeat(200_000) }))).status, 413, "actual body size is checked without relying on a Content-Length claim");
  assert.equal(storage.writes, 0);
});

test("concurrent devices retry the revision check and preserve independent lessons", async () => {
  const storage = store();
  const route = createLearningProgressHandlers({ getCurrentUser: async () => ({ id: "alice" }), getStore: () => storage });
  const [first, second] = await Promise.all([route.POST(request({ progress: progress("tables") })), route.POST(request({ progress: progress("lists") }))]);
  assert.equal(first.status, 200); assert.equal(second.status, 200);
  const read = await route.GET(new Request("https://solveplot.test/api/learn/progress"));
  const saved = await read.json();
  assert.deepEqual(Object.keys(saved.progress.lessons).sort(), ["lists", "tables"]);
  assert.equal(saved.revision, 2);
  assert.match(read.headers.get("cache-control")!, /no-store/);
  const again = await route.POST(request({ progress: progress("tables") }));
  assert.equal(again.status, 200); assert.equal(storage.writes, 2, "replaying the same finish is idempotent");
});

test("database outages and revision exhaustion never claim a successful cloud save", async () => {
  const route = createLearningProgressHandlers({ getCurrentUser: async () => ({ id: "alice" }), getStore: () => { throw { code: "42P01", message: "relation learning_progress does not exist" }; } });
  const missing = await route.POST(request({ progress: progress() }));
  assert.equal(missing.status, 503); assert.equal((await missing.json()).kind, "setup_required");
  const conflictStore = store(); conflictStore.create = async () => false;
  const concurrent = createLearningProgressHandlers({ getCurrentUser: async () => ({ id: "alice" }), getStore: () => conflictStore });
  const exhausted = await concurrent.POST(request({ progress: progress() }));
  assert.equal(exhausted.status, 409); assert.equal((await exhausted.json()).kind, "conflict");
});
