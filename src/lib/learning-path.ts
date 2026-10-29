import { LESSONS, getLessonGroup, type LearnPathId } from "./learn-catalog";

/** Small path metadata; question content stays on its own route. */
export const LEARNING_UNITS = [
  { id: "desmos-beginner", path: "desmos", group: "Beginner", title: "Calculator basics", description: "Functions, tables, and graph features", color: "#399dd2" },
  { id: "desmos-intermediate", path: "desmos", group: "Intermediate", title: "Graphs and data", description: "Sliders, lists, regression, and restrictions", color: "#4aa68b" },
  { id: "desmos-advanced", path: "desmos", group: "Advanced", title: "Regression and coordinates", description: "Simultaneous conditions, distances, and midpoints", color: "#a084d5" },
  { id: "sat-algebra", path: "sat", group: "Algebra", title: "Algebra", description: "Equations, straight lines, and systems", color: "#399dd2" },
  { id: "sat-advanced-math", path: "sat", group: "Advanced math", title: "Advanced math", description: "Quadratics, powers, and nonlinear models", color: "#4aa68b" },
  { id: "sat-data", path: "sat", group: "Problem solving and data", title: "Problem solving and data", description: "Percentages, averages, and interpreting results", color: "#a084d5" },
  { id: "sat-geometry", path: "sat", group: "Geometry and trigonometry", title: "Geometry and trigonometry", description: "Coordinates, circles, and right triangles", color: "#cb9553" },
] as const;

export function getLearningUnits(path: LearnPathId) {
  return LEARNING_UNITS.filter((unit) => unit.path === path).map((unit) => ({
    ...unit,
    lessons: LESSONS.filter((lesson) => lesson.path === path && getLessonGroup(lesson) === unit.group),
  }));
}

export function checkpointHref(id: string) { return `/learn/checkpoint/${id}`; }

export function getNextLearningStop(slug: string) {
  const lesson = LESSONS.find((item) => item.slug === slug);
  if (!lesson) return null;
  const unit = getLearningUnits(lesson.path).find((item) => item.lessons.some((entry) => entry.slug === slug))!;
  const next = unit.lessons[unit.lessons.findIndex((entry) => entry.slug === slug) + 1];
  return next ? { title: next.title, href: `/learn/${next.slug}`, checkpoint: false }
    : { title: `${unit.group} checkpoint`, href: checkpointHref(unit.id), checkpoint: true };
}
