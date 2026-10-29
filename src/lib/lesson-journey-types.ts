import type { DesmosExpression, GraphBounds } from "./solver-schema";

export type LessonCalculatorSetup = {
  expressions: DesmosExpression[];
  bounds: GraphBounds | null;
  caption: string;
};

export type LessonVisual =
  | { kind: "table"; columns: string[]; rows: string[][]; caption?: string }
  | { kind: "flow" | "comparison"; items: { label: string; math?: string; text?: string }[] };

export type LessonCheck =
  | {
      kind: "choice";
      choices: { id: string; text: string; feedback: string }[];
      correctId: string;
      hint: string;
      explanation: string;
    }
  | {
      kind: "number";
      answer: number;
      tolerance?: number;
      unit?: string;
      hint: string;
      explanation: string;
      wrongFeedback: string;
      commonMistakes?: { answer: number; feedback: string }[];
      solution: string[];
    };

/** Authored in teaching order. Each slide introduces one task or one idea. */
export type LessonSlide = {
  id: string;
  phase: "Understand" | "Watch" | "Try it" | "Check" | "Explore";
  title: string;
  body: string[];
  visual?: LessonVisual;
  entries?: { latex: string; label: string }[];
  note?: string;
  calculator: LessonCalculatorSetup;
  check?: LessonCheck;
};

export type LessonJourney = {
  prerequisite: string;
  summary: string[];
  slides: LessonSlide[];
};
