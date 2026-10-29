import type { SupabaseClient } from "@supabase/supabase-js";
import { parseLearningProgress, type LearningProgress } from "./learning-progress";
import type { LearningProgressStore } from "./learning-progress-handler";

/** Uses the signed-in session client and RLS, never a service-role identity. */
export function createSupabaseLearningProgressStore(client: SupabaseClient): LearningProgressStore {
  return {
    async read(userId) {
      const { data, error } = await client.from("learning_progress").select("data, revision").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data ? { progress: parseLearningProgress(JSON.stringify(data.data)), revision: Number(data.revision) } : null;
    },
    async create(userId: string, progress: LearningProgress) {
      const { data, error } = await client.from("learning_progress").insert({ user_id: userId, data: progress, revision: 1 }).select("revision").maybeSingle();
      if (error?.code === "23505") return false;
      if (error) throw error;
      return Boolean(data);
    },
    async replace(userId: string, revision: number, progress: LearningProgress) {
      const { data, error } = await client.from("learning_progress").update({ data: progress, revision: revision + 1 }).eq("user_id", userId).eq("revision", revision).select("revision").maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },
  };
}
