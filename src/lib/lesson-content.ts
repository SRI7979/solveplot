import { DESMOS_LESSONS } from "../content/lessons/desmos";
import { SAT_LESSONS } from "../content/lessons/sat";
import { techniqueName } from "./technique-vocabulary";
import type { LessonContent } from "./lesson-types";
import type { TutorContext } from "./tutor";

// Imported by server pages and the practice handler. Catalog navigation only
// imports the much smaller learn-catalog metadata.
export const LESSON_CONTENT: readonly LessonContent[] = [...DESMOS_LESSONS, ...SAT_LESSONS];

export function getLessonContent(slug: string): LessonContent | null {
  return LESSON_CONTENT.find((lesson) => lesson.slug === slug) ?? null;
}

/** Lesson practice is grounded in an authored example, never client-supplied math. */
export function getLessonPracticeContext(slug: string): TutorContext | null {
  const content = getLessonContent(slug);
  if (!content) return null;
  const example = content.example;
  return {
    question: example.question,
    choices: null,
    structure: example.structure,
    techniqueId: example.techniqueId,
    techniqueName: techniqueName(example.techniqueId),
    answer: example.answer,
    rows: example.expressions.map((row) => ({ ...row, slider: row.slider ?? null })),
    why: example.why,
    readAnswer: `The answer is ${example.answer}.`,
    steps: example.steps.map((step) => step.explanation),
    cacheKey: null,
    problemId: null,
  };
}
