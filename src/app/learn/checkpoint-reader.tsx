"use client";

import type { Checkpoint } from "@/lib/learn-checkpoint-types";
import type { LessonJourney } from "@/lib/lesson-journey-types";
import { LearningSession } from "./lesson-reader";
import SatCheckpointReader from "./sat-checkpoint-reader";

export default function CheckpointReader({ checkpoint, progressScope }: { checkpoint: Checkpoint; progressScope: string }) {
  if (checkpoint.path === "sat") return <SatCheckpointReader checkpoint={checkpoint} progressScope={progressScope} />;
  const journey: LessonJourney = {
    prerequisite: checkpoint.description,
    summary: ["Use the calculator method that fits the question.", "Check which coordinate or output the question asks for.", "Revisit any lesson whenever you need a reminder."],
    slides: checkpoint.questions.map(question => ({ ...question, phase: "Check" as const })),
  };
  return <LearningSession sessionId={checkpoint.id} title={checkpoint.title} path={checkpoint.path} journey={journey} progressScope={progressScope} checkpoint next={null} />;
}
