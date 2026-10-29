import assert from "node:assert/strict";
import { test } from "node:test";
import { lessonChoiceOrder } from "../src/lib/lesson-choice-order";
import { DESMOS_JOURNEYS } from "../src/content/lessons/desmos-journeys";
import { SAT_JOURNEYS } from "../src/content/lessons/sat-journeys";
import { CHECKPOINTS } from "../src/content/lessons/checkpoints";
import { gradeLessonCheck } from "../src/lib/lesson-check";

test("choice order is stable when revisiting a slide and never mutates its source", () => {
  const options = Object.freeze([{ id: "correct" }, { id: "b" }, { id: "c" }, { id: "d" }]);
  const shuffled = lessonChoiceOrder(options, "user:learner:lesson:check");
  assert.deepEqual(shuffled, lessonChoiceOrder(options, "user:learner:lesson:check"));
  assert.deepEqual(new Set(shuffled), new Set(options));
  assert.deepEqual(options.map(choice => choice.id), ["correct", "b", "c", "d"]);
  const slots = new Set(Array.from({ length: 32 }, (_, index) => lessonChoiceOrder(options, `slide:${index}`).findIndex(choice => choice.id === "correct")));
  assert.equal(slots.size, 4);
});

test("all authored lessons and checkpoints keep correct IDs after shuffling and spread answer positions", () => {
  const slides = [...Object.entries({ ...DESMOS_JOURNEYS, ...SAT_JOURNEYS }).flatMap(([id, journey]) => journey.slides.map(slide => ({ session: id, ...slide }))),
    ...CHECKPOINTS.flatMap(checkpoint => checkpoint.questions.map(question => ({ session: checkpoint.id, ...question })))];
  const positions: number[] = [];
  for (const slide of slides) {
    const check = slide.check;
    if (check?.kind !== "choice") continue;
    const choices = lessonChoiceOrder(check.choices, `guest:${slide.session}:${slide.id}`);
    assert.equal(choices.length, check.choices.length);
    assert.equal(choices.filter(choice => gradeLessonCheck(check, choice.id)?.correct).length, 1);
    positions.push(choices.findIndex(choice => choice.id === check.correctId));
  }
  assert.ok(positions.length > 40);
  assert.ok(positions.filter(position => position === 0).length < positions.length / 2);
  assert.ok(new Set(positions).size >= 3);
});
