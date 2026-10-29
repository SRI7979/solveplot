"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { EMPTY_LEARNING_PROGRESS, getLearningProgress, getLearningSyncStatus, startLearningSync, subscribeLearningProgress } from "@/lib/learning-progress";

export function useLearningProgress(scope: string) {
  const snapshot = useCallback(() => getLearningProgress(scope), [scope]);
  useEffect(() => startLearningSync(scope), [scope]);
  return useSyncExternalStore(subscribeLearningProgress, snapshot, () => EMPTY_LEARNING_PROGRESS);
}

export function useLearningSyncStatus(scope: string) {
  const snapshot = useCallback(() => getLearningSyncStatus(scope), [scope]);
  return useSyncExternalStore(subscribeLearningProgress, snapshot, () => "local" as const);
}
