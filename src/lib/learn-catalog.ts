import type { TechniqueId } from "./technique-vocabulary";

export type LearnPathId = "desmos" | "sat";
export type LessonDifficulty = "Beginner" | "Intermediate" | "Advanced";
export type Lesson = {
  slug: string;
  title: string;
  description: string;
  path: LearnPathId;
  category: string;
  difficulty: LessonDifficulty;
  status: "available";
};

export const LEARN_PATHS = [
  {
    id: "desmos",
    title: "Desmos skills",
    description: "Calculator skills and methods",
    groups: ["Beginner", "Intermediate", "Advanced"],
  },
  {
    id: "sat",
    title: "SAT math topics",
    description: "Calculator methods by SAT topic",
    groups: ["Algebra", "Advanced math", "Problem solving and data", "Geometry and trigonometry"],
  },
] as const;

/** Lightweight catalog metadata; authored content is loaded only on a lesson page. */
export const LESSONS = [
  { slug: "introduction-to-desmos", title: "Introduction to Desmos", description: "Functions, inputs, and graph points", path: "desmos", category: "Getting started", difficulty: "Beginner", status: "available" },
  { slug: "graphing-equations", title: "Graphing equations", description: "Graph equations and read solutions", path: "desmos", category: "Getting started", difficulty: "Beginner", status: "available" },
  { slug: "tables", title: "Tables", description: "Data entry and function tables", path: "desmos", category: "Getting started", difficulty: "Beginner", status: "available" },
  { slug: "intersections-and-intercepts", title: "Intersections and intercepts", description: "Crossing points and axis intercepts", path: "desmos", category: "Working with graphs", difficulty: "Beginner", status: "available" },
  { slug: "sliders", title: "Sliders", description: "Parameters and changing graphs", path: "desmos", category: "Working with graphs", difficulty: "Intermediate", status: "available" },
  { slug: "lists", title: "Lists", description: "Calculations and list filters", path: "desmos", category: "Working with data", difficulty: "Intermediate", status: "available" },
  { slug: "regression", title: "Regression", description: "Quadratic regression with three points", path: "desmos", category: "Fitting models", difficulty: "Intermediate", status: "available" },
  { slug: "functions-and-transformations", title: "Functions and transformations", description: "Function values and graph shifts", path: "desmos", category: "Working with graphs", difficulty: "Intermediate", status: "available" },
  { slug: "restrictions", title: "Restrictions", description: "Domain limits and minimum values", path: "desmos", category: "Working with graphs", difficulty: "Intermediate", status: "available" },
  { slug: "answer-choice-testing", title: "Answer-choice testing", description: "Test several choices at once", path: "desmos", category: "Testing answers", difficulty: "Intermediate", status: "available" },
  { slug: "bracket-regression", title: "Advanced and bracket regression", description: "Fit several conditions at once", path: "desmos", category: "Fitting models", difficulty: "Advanced", status: "available" },
  { slug: "advanced-desmos-shortcuts", title: "Advanced Desmos shortcuts", description: "Distance and midpoint tools", path: "desmos", category: "Calculator tools", difficulty: "Advanced", status: "available" },
  { slug: "linear-equations", title: "Linear equations", description: "Solve equations and interpret constants in context.", path: "sat", category: "Algebra", difficulty: "Beginner", status: "available" },
  { slug: "linear-functions", title: "Linear functions", description: "Connect slope and intercepts to equations, tables, and graphs.", path: "sat", category: "Algebra", difficulty: "Beginner", status: "available" },
  { slug: "systems-of-equations", title: "Systems of equations", description: "Find values that satisfy two or more equations together.", path: "sat", category: "Algebra", difficulty: "Intermediate", status: "available" },
  { slug: "quadratics", title: "Quadratics", description: "Read a parabola’s vertex and check interval restrictions.", path: "sat", category: "Advanced math", difficulty: "Intermediate", status: "available" },
  { slug: "polynomials", title: "Polynomials", description: "Compare polynomial expressions and identify roots and factors.", path: "sat", category: "Advanced math", difficulty: "Advanced", status: "available" },
  { slug: "exponents-and-radicals", title: "Exponents and radicals", description: "Work with powers, roots, and equivalent expressions.", path: "sat", category: "Advanced math", difficulty: "Intermediate", status: "available" },
  { slug: "nonlinear-functions", title: "Nonlinear functions", description: "Fit an exponential model and predict another value.", path: "sat", category: "Advanced math", difficulty: "Advanced", status: "available" },
  { slug: "ratios-and-percentages", title: "Ratios and percentages", description: "Calculate discounts and percentage increases from the original amount.", path: "sat", category: "Problem solving and data", difficulty: "Beginner", status: "available" },
  { slug: "statistics-and-data-analysis", title: "Statistics and data analysis", description: "Use lists to calculate and compare the mean and median.", path: "sat", category: "Problem solving and data", difficulty: "Intermediate", status: "available" },
  { slug: "geometry", title: "Geometry", description: "Find the distance between two coordinates in Desmos.", path: "sat", category: "Geometry and trigonometry", difficulty: "Intermediate", status: "available" },
  { slug: "circles", title: "Circles", description: "Use a line through a circle’s given center to measure its diameter and radius.", path: "sat", category: "Geometry and trigonometry", difficulty: "Intermediate", status: "available" },
  { slug: "trigonometry", title: "Trigonometry", description: "Use right-triangle ratios and angle relationships to find missing values.", path: "sat", category: "Geometry and trigonometry", difficulty: "Advanced", status: "available" },
] as const satisfies readonly Lesson[];

export type LessonSlug = (typeof LESSONS)[number]["slug"];

// Links to the existing taxonomy, not a second copy of the strategy library.
export const TECHNIQUE_LESSONS = {
  "graph-raw": "graphing-equations",
  "graph-both-sides": "intersections-and-intercepts",
  "intercept-read": "intersections-and-intercepts",
  "count-intersections": "intersections-and-intercepts",
  "vertex-read": "quadratics",
  "restricted-extremum": "restrictions",
  "linear-regression": "regression",
  "three-point-regression": "regression",
  "exponential-regression": "regression",
  "parameter-regression": "bracket-regression",
  "answer-choice-list": "answer-choice-testing",
  "integer-list-filter": "lists",
  "list-evaluation": "lists",
  "function-evaluation": "functions-and-transformations",
  "graph-inequality": "graphing-equations",
  "derivative-regression": "bracket-regression",
  "expanded-circle": "circles",
  "story-system": "systems-of-equations",
  "statistics-builtin": "statistics-and-data-analysis",
  "distance-builtin": "geometry",
  "midpoint-builtin": "geometry",
  "reference-formula": "geometry",
  "trig-evaluation": "trigonometry",
  "inverse-trig": "trigonometry",
  "right-triangle-trig": "trigonometry",
  "slider-condition": "sliders",
  "choice-window": "answer-choice-testing",
  "identity-regression": "bracket-regression",
  "bracket-regression": "bracket-regression",
  "slider-parallel": "sliders",
  "graph-each-choice": "answer-choice-testing",
  "frequency-repeat": "statistics-and-data-analysis",
  "ceil-floor": "advanced-desmos-shortcuts",
  "polygon-area": "geometry",
  "number-theory-builtin": "advanced-desmos-shortcuts",
  "sum-product": "advanced-desmos-shortcuts",
  "derivative-slope": "advanced-desmos-shortcuts",
  "strategic-value-test": "answer-choice-testing",
  "shared-zero": "polynomials",
  "vertex-of-difference": "quadratics",
  "calculator-arithmetic": "introduction-to-desmos",
  "quadratic-formula": "quadratics",
  "discriminant": "quadratics",
  "factoring": "polynomials",
  "completing-the-square": "quadratics",
  "substitution": "systems-of-equations",
  "elimination": "systems-of-equations",
  "plug-in-choices": "answer-choice-testing",
  "direct-arithmetic": "ratios-and-percentages",
  "translate-the-words": "linear-equations",
} as const satisfies Record<TechniqueId, LessonSlug>;

export function getLesson(slug: string): Lesson | null {
  return LESSONS.find((lesson) => lesson.slug === slug) ?? null;
}

export function getLessonForTechnique(techniqueId: string | null | undefined): Lesson | null {
  if (!techniqueId || !Object.hasOwn(TECHNIQUE_LESSONS, techniqueId)) return null;
  return getLesson(TECHNIQUE_LESSONS[techniqueId as TechniqueId]);
}

export function getLessonHref(lesson: Pick<Lesson, "slug">): string {
  return `/learn/${lesson.slug}`;
}

export function getLessonGroup(lesson: Lesson): string {
  return lesson.path === "desmos" ? lesson.difficulty : lesson.category;
}
