import type { LessonSlug } from "./learn-catalog";
import type { DesmosExpression, GraphBounds } from "./solver-schema";
import type { TechniqueId } from "./technique-vocabulary";

export type LessonExample = {
  question: string;
  techniqueId: TechniqueId;
  structure: string;
  why: string;
  answer: string;
  steps: { title: string; explanation: string; latex?: string }[];
  expressions: DesmosExpression[];
  graphBounds: GraphBounds | null;
};

export type LessonContent = {
  slug: LessonSlug;
  minutes: number;
  intro: string;
  objectives: string[];
  sections: { title: string; paragraphs: string[]; takeaway?: string }[];
  example: LessonExample;
  exploration: {
    title: string;
    prompt: string;
    expressions: DesmosExpression[];
    graphBounds: GraphBounds | null;
    observations: string[];
  };
  checks: {
    id: string;
    question: string;
    choices: { label: string; text: string }[];
    correctLabel: string;
    explanation: string;
  }[];
  pitfalls: string[];
  related: LessonSlug[];
  sources: { title: string; href: string }[];
};
