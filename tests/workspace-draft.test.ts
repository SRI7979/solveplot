import assert from "node:assert/strict";
import { test } from "node:test";
import { createWorkspaceDraftStore } from "../src/lib/workspace-draft";
test("a solve draft survives navigation but never crosses account boundaries", () => {
  const released: string[] = [];
  const store = createWorkspaceDraftStore<{
    image: { url: string } | null;
    answer: string;
  }>((url) => released.push(url));
  store.write("student-a", { image: { url: "blob:a" }, answer: "7" });
  assert.equal(store.read("student-a")?.answer, "7");
  assert.equal(store.read("student-b"), null);
  store.clear("student-b");
  assert.equal(store.read("student-a")?.answer, "7");
  store.write("student-b", { image: { url: "blob:b" }, answer: "143" });
  assert.equal(store.read("student-a"), null);
  assert.deepEqual(released, ["blob:a"]);
});
test("replacing or clearing an upload releases its old object URL exactly once", () => {
  const released: string[] = [];
  const store = createWorkspaceDraftStore((url) => released.push(url));
  store.write("a", { image: { url: "blob:one" } });
  store.write("a", { image: { url: "blob:one" } });
  assert.deepEqual(released, []);
  store.write("a", { image: { url: "blob:two" } });
  store.clear("a");
  store.clear("a");
  assert.deepEqual(released, ["blob:one", "blob:two"]);
});
