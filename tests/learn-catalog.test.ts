import assert from "node:assert/strict";
import { test } from "node:test";
import { LEARN_PATHS, LESSONS, TECHNIQUE_LESSONS, getLesson, getLessonForTechnique, getLessonGroup, getLessonHref } from "../src/lib/learn-catalog";
import { TECHNIQUE_IDS } from "../src/lib/technique-vocabulary";
import { safeAuthRedirect } from "../src/lib/auth-redirect";

test("each learning path has complete metadata, unique routes, and available lessons", () => {
  assert.equal(new Set(LESSONS.map((lesson) => lesson.slug)).size, LESSONS.length);
  assert.equal(new Set(LESSONS.map((lesson) => lesson.title)).size, LESSONS.length);
  for (const path of LEARN_PATHS) {
    const lessons = LESSONS.filter((lesson) => lesson.path === path.id);
    assert.equal(lessons.length, 12);
    for (const group of path.groups) assert.ok(lessons.some((lesson) => getLessonGroup(lesson) === group));
    for (const lesson of lessons) {
      assert.equal(lesson.status, "available");
      assert.match(lesson.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert.ok(lesson.title && lesson.description && lesson.category && lesson.difficulty);
      assert.ok((path.groups as readonly string[]).includes(getLessonGroup(lesson)));
      assert.equal(getLesson(lesson.slug), lesson);
      assert.equal(getLessonHref(lesson), `/learn/${lesson.slug}`);
    }
  }
});

test("every existing technique maps to a real lesson without a second technique taxonomy", () => {
  assert.deepEqual(Object.keys(TECHNIQUE_LESSONS).sort(), [...TECHNIQUE_IDS].sort());
  for (const id of TECHNIQUE_IDS) assert.ok(getLessonForTechnique(id), id);
  assert.equal(getLessonForTechnique("three-point-regression")?.slug, "regression");
  assert.equal(getLessonForTechnique("linear-regression")?.slug, "regression");
  assert.equal(getLessonForTechnique("bracket-regression")?.slug, "bracket-regression");
  assert.equal(getLessonForTechnique("intercept-read")?.slug, "intersections-and-intercepts");
  assert.equal(getLessonForTechnique("integer-list-filter")?.slug, "lists");
  for (const id of [null, undefined, "", "unknown", "toString", "__proto__"]) assert.equal(getLessonForTechnique(id), null);
});

test("sign-in preserves catalog and known lesson links while rejecting invented or unsafe routes", () => {
  assert.equal(safeAuthRedirect("/learn"), "/learn");
  for (const lesson of LESSONS) assert.equal(safeAuthRedirect(getLessonHref(lesson)), getLessonHref(lesson));
  for (const route of ["/learn/not-a-lesson", "/learn/regression/extra", "/learn/../profile", "/learn/regression?next=https://evil.test", "//evil.test/learn", "https://evil.test/learn", "/learn/%72egression"]) {
    assert.equal(safeAuthRedirect(route), "/solve");
  }
  assert.equal(getLesson("not-a-lesson"), null);
});
