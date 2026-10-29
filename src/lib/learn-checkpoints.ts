import { CHECKPOINTS } from "@/content/lessons/checkpoints";
import type { LearnPathId } from "./learn-catalog";
import type { Checkpoint } from "./learn-checkpoint-types";

export { CHECKPOINTS };
export type { Checkpoint, CheckpointQuestion } from "./learn-checkpoint-types";

export function getCheckpoint(id: string): Checkpoint | null {
  return CHECKPOINTS.find((checkpoint) => checkpoint.id === id) ?? null;
}

export function getCheckpointForGroup(path: LearnPathId, group: string): Checkpoint | null {
  return CHECKPOINTS.find((checkpoint) => checkpoint.path === path && checkpoint.group === group) ?? null;
}
