import assert from "node:assert/strict";
import { test } from "node:test";
import { createSolverDraftHandoff, DRAFT_HANDOFF_KEY, DRAFT_HANDOFF_TTL, type SolverInputDraft } from "../src/lib/guest-solver-draft";
import { MAX_IMAGE_BYTES } from "../src/lib/solver-schema";
import { MAX_PROBLEM_TEXT_LENGTH } from "../src/lib/text-problem";

const input: SolverInputDraft = { inputMode: "text", problemText: "Solve 3x + 2 = 14", image: null };
function fixture() {
  let time = 1_000_000;
  let sequence = 0;
  const saved = new Map<string, unknown>();
  const tab = new Map<string, string>();
  const tickets = {
    getItem: (key: string) => tab.get(key) ?? null,
    setItem: (key: string, value: string) => { tab.set(key, value); },
    removeItem: (key: string) => { tab.delete(key); },
  };
  const records = {
    put: async (record: { id: string }) => { saved.set(record.id, record); },
    take: async (id: string) => { const value = saved.get(id); saved.delete(id); return value; },
  };
  const config = { records, tickets, now: () => time, newId: () => `random-handoff-id-${++sequence}` };
  return { saved, tab, config, handoff: createSolverDraftHandoff(config), advance: (ms: number) => { time += ms; } };
}

test("a guest's text survives the auth reload exactly once without persisting a solution", async () => {
  const f = fixture();
  await f.handoff.save(input);
  assert.equal(f.tab.size, 1);
  assert.equal(f.saved.size, 1);
  // A fresh handoff instance represents the page after OAuth/email sign-in.
  const afterReload = createSolverDraftHandoff(f.config);
  assert.deepEqual(await afterReload.consume("student-a"), input);
  assert.equal(await afterReload.consume("student-b"), null);
  assert.equal(f.saved.size, 0);
  assert.equal(f.tab.size, 0);
});

test("full-size supported uploads survive with their bytes and file name", async () => {
  const f = fixture();
  const bytes = new Uint8Array(MAX_IMAGE_BYTES); bytes[0] = 137; bytes[1024] = 42;
  const imageInput: SolverInputDraft = { inputMode: "image", problemText: "", image: { blob: new Blob([bytes], { type: "image/png" }), name: "question.png" } };
  await f.handoff.save(imageInput);
  const restored = await f.handoff.consume("student-a");
  assert.equal(restored?.image?.name, "question.png");
  assert.equal(restored?.image?.blob.type, "image/png");
  assert.deepEqual(new Uint8Array(await restored!.image!.blob.arrayBuffer()), bytes);
});

test("an expired account's input can only return to that account; a mismatch discards it", async () => {
  const f = fixture();
  await f.handoff.save(input, "student-a");
  assert.equal(await f.handoff.consume("student-b"), null);
  assert.equal(await f.handoff.consume("student-a"), null);
  assert.equal(f.saved.size, 0);
  await f.handoff.save(input, "student-a");
  assert.deepEqual(await f.handoff.consume("student-a"), input);
});

test("expired, future, malformed, and wrong-version records are consumed but never restored", async () => {
  for (const mutate of [
    (value: Record<string, unknown>) => { value.createdAt = 1; },
    (value: Record<string, unknown>) => { value.createdAt = 1_100_000; },
    (value: Record<string, unknown>) => { value.version = 2; },
    (value: Record<string, unknown>) => { value.ownerId = undefined; },
    (value: Record<string, unknown>) => { value.id = "different-handoff-id"; },
    (value: Record<string, unknown>) => { value.problemText = "x".repeat(MAX_PROBLEM_TEXT_LENGTH + 1); },
    (value: Record<string, unknown>) => { value.image = { blob: "not an image", name: "x.png" }; },
  ]) {
    const f = fixture();
    await f.handoff.save(input);
    const record = [...f.saved.values()][0] as Record<string, unknown>;
    mutate(record);
    if (record.createdAt === 1) f.advance(DRAFT_HANDOFF_TTL);
    assert.equal(await f.handoff.consume("student-a"), null);
    assert.equal(f.saved.size, 0);
    assert.equal(f.tab.size, 0);
  }
});

test("invalid inputs never enter durable storage", async () => {
  const f = fixture();
  const invalid: SolverInputDraft[] = [
    { ...input, problemText: " " },
    { ...input, problemText: "x".repeat(MAX_PROBLEM_TEXT_LENGTH + 1) },
    { ...input, inputMode: "image" },
    ...[new Blob([], { type: "image/png" }), new Blob(["svg"], { type: "image/svg+xml" }), new Blob([new Uint8Array(MAX_IMAGE_BYTES + 1)], { type: "image/png" })].map(blob => ({ inputMode: "image" as const, problemText: "", image: { blob, name: "image" } })),
  ];
  for (const draft of invalid) await assert.rejects(f.handoff.save(draft));
  assert.equal(f.saved.size, 0);
  assert.equal(f.tab.size, 0);
});

test("a copied tab ticket cannot replay the same draft, and guests cannot consume it", async () => {
  const f = fixture();
  await f.handoff.save(input);
  const ticket = f.tab.get(DRAFT_HANDOFF_KEY)!;
  assert.equal(await f.handoff.consume(""), null);
  assert.equal(f.tab.get(DRAFT_HANDOFF_KEY), ticket);
  assert.deepEqual(await f.handoff.consume("student-a"), input);
  f.tab.set(DRAFT_HANDOFF_KEY, ticket);
  assert.equal(await f.handoff.consume("student-b"), null);
});

test("failed storage writes reject before auth, clean orphaned input, and do not publish a ticket", async () => {
  const f = fixture();
  const failedDatabase = createSolverDraftHandoff({ ...f.config, records: { ...f.config.records, put: async () => { throw new Error("Quota exceeded"); } } });
  await assert.rejects(failedDatabase.save(input), /Quota/);
  assert.equal(f.tab.size, 0);
  const failedTicket = createSolverDraftHandoff({ ...f.config, tickets: { ...f.config.tickets, setItem: () => { throw new Error("Storage blocked"); } } });
  await assert.rejects(failedTicket.save(input), /blocked/);
  assert.equal(f.saved.size, 0);
  assert.equal(f.tab.size, 0);
});

test("replacing or clearing a pending sign-in removes previous private input", async () => {
  const f = fixture();
  await f.handoff.save(input);
  await f.handoff.save({ ...input, problemText: "A new question" });
  assert.equal(f.saved.size, 1);
  assert.equal((await f.handoff.consume("student-a"))?.problemText, "A new question");
  await f.handoff.save(input);
  await f.handoff.discard();
  assert.equal(f.saved.size, 0);
  assert.equal(f.tab.size, 0);
});
