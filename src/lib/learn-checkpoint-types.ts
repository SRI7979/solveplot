import type { LearnPathId } from "./learn-catalog";
import type { LessonCalculatorSetup, LessonCheck } from "./lesson-journey-types";

export type CheckpointQuestion = {
  id: string;
  title: string;
  body: string[];
  calculator: LessonCalculatorSetup;
  check: LessonCheck;
};

/** A short, untimed review of the lessons in one Learn section. */
export type Checkpoint = {
  id: string;
  path: LearnPathId;
  group: string;
  title: string;
  description: string;
  questions: CheckpointQuestion[];
};
