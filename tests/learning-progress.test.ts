import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { LEARN_PATHS, LESSONS, getLessonGroup } from "../src/lib/learn-catalog";
import { CHECKPOINTS, getCheckpoint } from "../src/lib/learn-checkpoints";
import { LEARNING_UNITS, checkpointHref, getLearningUnits, getNextLearningStop } from "../src/lib/learning-path";
import {
  EMPTY_LEARNING_PROGRESS,
  getLearningProgress,
  learningProgressKey,
  parseLearningProgress,
  recordCheckpointCompletion,
  recordLessonCompletion,
  subscribeLearningProgress,
} from "../src/lib/learning-progress";

const completedAt = "2026-10-24T12:00:00.000Z";
const lesson = { answered: 2, assisted: 1, total: 3, completedAt };
const checkpoint = { correct: 3, total: 4, completedAt };

test("lessons suggest the next topic and finish each section with its matching checkpoint", () => {
  assert.deepEqual(getNextLearningStop("tables"), { title: "Intersections and intercepts", href: "/learn/intersections-and-intercepts", checkpoint: false });
  for (const path of LEARN_PATHS) for (const unit of getLearningUnits(path.id)) {
    const last = unit.lessons.at(-1)!;
    const next = getNextLearningStop(last.slug)!;
    assert.equal(next.checkpoint, true);
    assert.equal(next.href, checkpointHref(unit.id));
    assert.ok(getCheckpoint(unit.id));
  }
  assert.equal(getNextLearningStop("missing-lesson"), null);
});

function browser(t: TestContext) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const cleanup: Array<() => void> = [];
  const storage = new Map<string, string>();
  const state = { writes: 0, failReads: false, failWrites: false };
  const window = Object.assign(new EventTarget(), {
    localStorage: {
      getItem(key: string) {
        if (state.failReads) throw new Error("Storage access blocked");
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        state.writes++;
        if (state.failWrites) throw new Error("Storage quota exceeded");
        storage.set(key, value);
      },
    },
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  t.after(() => {
    for (const callback of cleanup) callback();
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  });
  return { window, storage, state, cleanup };
}

test("learning units cover all 24 catalog lessons exactly once and lead to matching checkpoints", () => {
  assert.equal(new Set(LEARNING_UNITS.map((unit) => unit.id)).size, LEARNING_UNITS.length);
  const included: string[] = [];
  for (const path of LEARN_PATHS) {
    const units = getLearningUnits(path.id);
    assert.deepEqual(units.map((unit) => unit.group), [...path.groups]);
    for (const unit of units) {
      assert.ok(unit.title.trim() && unit.description.trim());
      assert.match(unit.color, /^#[0-9a-f]{6}$/i);
      assert.ok(unit.lessons.length > 0, unit.id);
      const review = getCheckpoint(unit.id);
      assert.ok(review, unit.id);
      assert.equal(review.path, path.id);
      assert.equal(review.group, unit.group);
      assert.equal(review.questions.length, 4);
      assert.equal(checkpointHref(unit.id), `/learn/checkpoint/${unit.id}`);
      for (const lesson of unit.lessons) {
        assert.equal(lesson.path, path.id);
        assert.equal(getLessonGroup(lesson), unit.group);
        assert.equal(lesson.status, "available");
        included.push(lesson.slug);
      }
    }
  }
  assert.equal(included.length, 24);
  assert.equal(new Set(included).size, 24);
  assert.deepEqual(included.sort(), LESSONS.map((lesson) => lesson.slug).sort());
  assert.deepEqual(LEARNING_UNITS.map((unit) => unit.id).sort(), CHECKPOINTS.map((review) => review.id).sort());
});

test("progress storage keys separate guests and accounts and reject malformed scopes", () => {
  const scopes = ["guest", "user:student-a", "user:student-b"];
  assert.equal(new Set(scopes.map(learningProgressKey)).size, scopes.length);
  for (const scope of ["", "student-a", "user:", "guest:student", "user:a/b", "user:a:b", `user:${"a".repeat(81)}`]) {
    assert.throws(() => learningProgressKey(scope), /Invalid learning progress scope/);
  }
});

test("malformed storage cannot invent completions or discard valid neighboring records", () => {
  for (const raw of [null, "", "broken", "null", "[]", "42", '{"lessons":[]}']) {
    assert.deepEqual(parseLearningProgress(raw), EMPTY_LEARNING_PROGRESS);
  }
  const raw = JSON.stringify({
    lessons: {
      "linear-equations": { ...lesson, unexpected: "ignore this field" },
      "linear-functions": { ...lesson, answered: "2" },
      quadratics: { ...lesson, assisted: -1 },
      polynomials: { ...lesson, total: 4 },
      geometry: { ...lesson, completedAt: "not a date" },
      circles: { ...lesson, answered: 1.5, assisted: 1.5 },
      trigonometry: { ...lesson, answered: 30, assisted: 1, total: 31 },
      "invented-lesson": lesson,
      constructor: lesson,
    },
    checkpoints: {
      "sat-algebra": { ...checkpoint, unexpected: "ignore this field" },
      "sat-geometry": { ...checkpoint, correct: 5 },
      "sat-data": { ...checkpoint, total: 3 },
      "desmos-beginner": { ...checkpoint, correct: 1.5 },
      "desmos-intermediate": { ...checkpoint, completedAt: null },
      "invented-checkpoint": checkpoint,
    },
  });
  assert.deepEqual(parseLearningProgress(raw), {
    lessons: { "linear-equations": lesson },
    checkpoints: { "sat-algebra": checkpoint },
    drafts: {},
  });
});

test("guest and account completions stay isolated on the same device", (t) => {
  const f = browser(t);
  recordLessonCompletion("guest", "linear-equations", { answered: 1, assisted: 2, total: 3 });
  recordLessonCompletion("user:scope-a", "quadratics", { answered: 3, assisted: 0, total: 3 });
  recordCheckpointCompletion("user:scope-b", "sat-algebra", { correct: 4, total: 4 });
  assert.deepEqual(Object.keys(getLearningProgress("guest").lessons), ["linear-equations"]);
  assert.deepEqual(Object.keys(getLearningProgress("user:scope-a").lessons), ["quadratics"]);
  assert.deepEqual(getLearningProgress("user:scope-a").checkpoints, {});
  assert.deepEqual(getLearningProgress("user:scope-b").lessons, {});
  assert.deepEqual(Object.keys(getLearningProgress("user:scope-b").checkpoints), ["sat-algebra"]);
  assert.equal(f.storage.size, 3);
  const snapshot = getLearningProgress("user:scope-a");
  assert.equal(getLearningProgress("user:scope-a"), snapshot, "unchanged snapshots remain stable for React subscriptions");
});

test("replayed and worse lesson finishes retain the best result without duplicate writes or notifications", (t) => {
  const f = browser(t);
  const scope = "user:lesson-best";
  let notifications = 0;
  const unsubscribe = subscribeLearningProgress(() => notifications++);
  f.cleanup.push(unsubscribe);
  recordLessonCompletion(scope, "quadratics", { answered: 2, assisted: 1, total: 3 });
  const first = getLearningProgress(scope);
  for (const result of [{ answered: 2, assisted: 1, total: 3 }, { answered: 1, assisted: 2, total: 3 }]) {
    recordLessonCompletion(scope, "quadratics", result);
    assert.equal(getLearningProgress(scope), first);
  }
  assert.equal(f.state.writes, 1);
  assert.equal(notifications, 1);
  recordLessonCompletion(scope, "quadratics", { answered: 3, assisted: 0, total: 3 });
  const improved = getLearningProgress(scope).lessons.quadratics;
  assert.equal(improved.answered, 3);
  assert.equal(improved.assisted, 0);
  assert.equal(f.state.writes, 2);
  assert.equal(notifications, 2);
  recordLessonCompletion(scope, "quadratics", { answered: 3, assisted: 0, total: 3 });
  assert.equal(getLearningProgress(scope).lessons.quadratics, improved);
  assert.equal(f.state.writes, 2);
});

test("checkpoint completion records zero scores and only replaces them with higher scores", (t) => {
  const f = browser(t);
  const scope = "user:checkpoint-best";
  recordCheckpointCompletion(scope, "sat-data", { correct: 0, total: 4 });
  assert.equal(getLearningProgress(scope).checkpoints["sat-data"].correct, 0);
  recordCheckpointCompletion(scope, "sat-data", { correct: 3, total: 4 });
  const best = getLearningProgress(scope);
  for (const correct of [0, 2, 3]) recordCheckpointCompletion(scope, "sat-data", { correct, total: 4 });
  assert.equal(getLearningProgress(scope), best);
  assert.equal(f.state.writes, 2);
  recordCheckpointCompletion(scope, "sat-data", { correct: 4, total: 4 });
  assert.equal(getLearningProgress(scope).checkpoints["sat-data"].correct, 4);
  assert.equal(f.state.writes, 3);
});

test("invalid submitted results and unknown ids do not write progress", (t) => {
  const f = browser(t);
  const scope = "user:invalid-submissions";
  recordLessonCompletion(scope, "not-a-lesson", { answered: 3, assisted: 0, total: 3 });
  for (const result of [
    { answered: 3, assisted: 1, total: 3 },
    { answered: -1, assisted: 4, total: 3 },
    { answered: 1.5, assisted: 1.5, total: 3 },
    { answered: 0, assisted: 0, total: 0 },
    { answered: 31, assisted: 0, total: 31 },
  ]) recordLessonCompletion(scope, "quadratics", result);
  recordCheckpointCompletion(scope, "not-a-checkpoint", { correct: 4, total: 4 });
  for (const result of [{ correct: 5, total: 4 }, { correct: -1, total: 4 }, { correct: 2.5, total: 4 }, { correct: 3, total: 3 }]) {
    recordCheckpointCompletion(scope, "sat-data", result);
  }
  assert.equal(f.state.writes, 0);
  assert.deepEqual(getLearningProgress(scope), EMPTY_LEARNING_PROGRESS);
});

test("failed writes keep improved progress in the tab even when storage still returns an older record", (t) => {
  const f = browser(t);
  const scope = "user:write-fallback";
  const key = learningProgressKey(scope);
  const old = JSON.stringify({ lessons: { quadratics: { ...lesson, answered: 1, assisted: 2 } }, checkpoints: {} });
  f.storage.set(key, old);
  assert.equal(getLearningProgress(scope).lessons.quadratics.answered, 1);
  f.state.failWrites = true;
  assert.doesNotThrow(() => recordLessonCompletion(scope, "quadratics", { answered: 3, assisted: 0, total: 3 }));
  assert.equal(f.storage.get(key), old);
  assert.equal(getLearningProgress(scope).lessons.quadratics.answered, 3);
  f.window.dispatchEvent(new Event("storage"));
  assert.equal(getLearningProgress(scope).lessons.quadratics.answered, 3, "stale disk data must not replace the in-tab result");
  recordCheckpointCompletion(scope, "sat-algebra", { correct: 2, total: 4 });
  assert.equal(getLearningProgress(scope).lessons.quadratics.answered, 3);
  assert.equal(getLearningProgress(scope).checkpoints["sat-algebra"].correct, 2);
  assert.deepEqual(getLearningProgress("user:write-fallback-other"), EMPTY_LEARNING_PROGRESS);
  f.state.failWrites = false;
  recordCheckpointCompletion(scope, "sat-algebra", { correct: 4, total: 4 });
  const persisted = parseLearningProgress(f.storage.get(key)!);
  assert.equal(persisted.lessons.quadratics.answered, 3);
  assert.equal(persisted.checkpoints["sat-algebra"].correct, 4);
});

test("blocked storage reads and writes still support in-tab completion and clean subscriptions", (t) => {
  const f = browser(t);
  const scope = "user:blocked-storage";
  f.state.failReads = f.state.failWrites = true;
  let notifications = 0;
  const unsubscribe = subscribeLearningProgress(() => notifications++);
  assert.doesNotThrow(() => recordLessonCompletion(scope, "circles", { answered: 2, assisted: 1, total: 3 }));
  const value = getLearningProgress(scope);
  assert.equal(value.lessons.circles.answered, 2);
  assert.equal(getLearningProgress(scope), value);
  assert.equal(notifications, 1);
  unsubscribe();
  f.window.dispatchEvent(new Event("storage"));
  recordCheckpointCompletion(scope, "sat-geometry", { correct: 3, total: 4 });
  assert.equal(notifications, 1);
  assert.equal(getLearningProgress(scope).checkpoints["sat-geometry"].correct, 3);
});

test("external storage changes refresh the snapshot for only their own scope", (t) => {
  const f = browser(t);
  const scope = "user:external-update";
  const otherScope = "user:external-other";
  const other = getLearningProgress(otherScope);
  assert.deepEqual(getLearningProgress(scope), EMPTY_LEARNING_PROGRESS);
  f.storage.set(learningProgressKey(scope), JSON.stringify({ lessons: { geometry: lesson }, checkpoints: {} }));
  f.window.dispatchEvent(new Event("storage"));
  assert.equal(getLearningProgress(scope).lessons.geometry.answered, 2);
  assert.equal(getLearningProgress(otherScope), other);
});
