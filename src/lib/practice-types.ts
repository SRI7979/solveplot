import type { AnswerChoice, Solution } from "./solver-schema";
import type { TechniqueId } from "./technique-vocabulary";
import type { TutorSource } from "./tutor";

export type PracticeSource = TutorSource | { kind: "lesson"; slug: string };

/** Public contracts only. Answers and generation parameters stay on the server. */
export type PracticeExercise = {
  id: string;
  question: string;
  choices: AnswerChoice[] | null;
  techniqueId: TechniqueId;
  techniqueName: string;
  structure: string;
  answerFormat: "numeric" | "choice";
  calculatorUseful: boolean;
};

export type PracticeRequest =
  | { action: "generate"; source: PracticeSource; previousToken?: string }
  | { action: "grade"; token: string; answer: string }
  | { action: "hint"; token: string }
  | { action: "reveal"; token: string };

export type PracticeChallenge = { token: string; exercise: PracticeExercise };
export type PracticeGrade = { correct: boolean; feedback: string };
export type PracticeHint = { hint: string };
export type PracticeReveal = { solution: Solution };
export type PracticeError = { error: string; kind?: "unsupported" | "expired" | "rate_limited" | "unavailable"; retryAfter?: number };
