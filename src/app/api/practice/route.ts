import { getCurrentUser } from "@/lib/auth";
import { getLessonPracticeContext } from "@/lib/lesson-content";
import { getProblem } from "@/lib/problem-history";
import { createPracticeHandler, createPracticeRateLimiter } from "@/lib/practice-handler";
import { routeSolveCache } from "@/lib/solve-cache";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 15;

export const POST = createPracticeHandler({
  getCurrentUser,
  getProblem,
  getLessonContext: getLessonPracticeContext,
  getCache: () => routeSolveCache(createAdminClient()),
  getSecret: () => process.env.PRACTICE_SESSION_SECRET?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "",
  reserve: createPracticeRateLimiter(),
});
