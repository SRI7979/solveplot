import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createLearningProgressHandlers } from "@/lib/learning-progress-handler";
import { createSupabaseLearningProgressStore } from "@/lib/learning-progress-store";

const handlers = createLearningProgressHandlers({ getCurrentUser, getStore: async () => createSupabaseLearningProgressStore(await createClient()) });
export const GET = handlers.GET;
export const POST = handlers.POST;
