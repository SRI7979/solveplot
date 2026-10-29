import { z } from "zod";

import { generatePracticeProblem, gradePracticeAnswer, UnsupportedPracticeError } from "./practice-generation";
import { MAX_PRACTICE_TOKEN_LENGTH, openPracticeSession, sealPracticeSession } from "./practice-session";
import type { SolveCache } from "./solve-cache";
import type { Solution } from "./solver-schema";
import { contextFromSolution, contextFromSolve, type TutorContext } from "./tutor";
import { practiceSourceSchema } from "./practice-source";

const token = z.string().min(1).max(MAX_PRACTICE_TOKEN_LENGTH);
const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("generate"), source: practiceSourceSchema, previousToken: token.optional() }).strict(),
  z.object({ action: z.literal("grade"), token, answer: z.string().trim().min(1).max(80) }).strict(),
  z.object({ action: z.literal("hint"), token }).strict(),
  z.object({ action: z.literal("reveal"), token }).strict(),
]);
const MAX_BODY_BYTES = 24 * 1024;

type Reservation = { allowed: boolean; retryAfter: number };
export type PracticeDependencies = {
  getCurrentUser: () => Promise<{ id: string } | null>;
  getCache: () => SolveCache;
  getProblem: (userId: string, problemId: string) => Promise<{ solution: Solution } | null>;
  getLessonContext?: (slug: string) => TutorContext | null | Promise<TutorContext | null>;
  getSecret: () => string;
  reserve: (userId: string, action: "generate" | "grade" | "hint" | "reveal") => Promise<Reservation>;
  now?: () => number;
};

function response(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
}
function failure(error: string, status: number, extra: Record<string, unknown> = {}) { return response({ error, ...extra }, status); }

/** Bound the actual stream as well as Content-Length; never buffer an unlimited request. */
async function readBody(request: Request): Promise<unknown> {
  if (!request.body) return null;
  if (Number(request.headers.get("content-length")) > MAX_BODY_BYTES) throw new RangeError("Request too large");
  const reader = request.body.getReader();
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) { await reader.cancel(); throw new RangeError("Request too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return null; }
}

export function createPracticeHandler(dependencies: PracticeDependencies) {
  return async function POST(request: Request) {
    try {
      const origin = request.headers.get("origin");
      if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) return failure("Open practice from the SolvePlot website.", 403);
      const user = await dependencies.getCurrentUser();
      if (!user) return failure("Sign in to practice this trick.", 401);
      let raw: unknown;
      try { raw = await readBody(request); } catch (error) {
        if (error instanceof RangeError) return failure("That request is too large.", 413);
        throw error;
      }
      const parsed = requestSchema.safeParse(raw);
      if (!parsed.success) return failure("This practice request could not be read. Try opening practice again.", 400);
      const body = parsed.data;
      const reservation = await dependencies.reserve(user.id, body.action);
      if (!reservation.allowed) return response({ error: "You’re moving quickly. Wait a moment, then try again.", kind: "rate_limited", retryAfter: reservation.retryAfter }, 429, { "Retry-After": String(reservation.retryAfter) });
      const now = dependencies.now?.() ?? Date.now();
      const secret = dependencies.getSecret();
      if (body.action === "generate") {
        const previous = body.previousToken ? openPracticeSession(body.previousToken, user.id, secret, now) : null;
        if (body.previousToken && !previous) return failure("This practice session has expired. Start practice again from your solution.", 410, { kind: "expired" });
        if (previous && JSON.stringify(previous.source) !== JSON.stringify(body.source)) return failure("Start practice again from the selected solution.", 400);
        const source = body.source;
        const context = source.kind === "solve"
          ? await contextFromSolve(dependencies.getCache(), source.cacheKey, source.methodId)
          : source.kind === "lesson" ? await dependencies.getLessonContext?.(source.slug)
          : await dependencies.getProblem(user.id, source.problemId).then(problem => problem ? contextFromSolution(problem.solution, source.problemId) : null);
        if (!context) return failure("That solution is no longer available. Open your original problem and try again.", 404);
        const problem = generatePracticeProblem(context, { previousQuestion: previous?.problem.exercise.question });
        return response({ token: sealPracticeSession({ userId: user.id, source: body.source, problem }, secret, now), exercise: problem.exercise });
      }
      const session = openPracticeSession(body.token, user.id, secret, now);
      if (!session) return failure("This practice session has expired. Start practice again from your solution.", 410, { kind: "expired" });
      if (body.action === "hint") return response({ hint: session.problem.hint });
      if (body.action === "reveal") return response({ solution: session.problem.solution });
      const graded = gradePracticeAnswer(session.problem, body.answer);
      if (!graded) return failure(session.problem.correctChoice ? "Choose an answer or enter a number or fraction." : "Enter a number or fraction, such as 0.5 or 1/2.", 400);
      return response(graded);
    } catch (error) {
      if (error instanceof UnsupportedPracticeError) return failure(error.message, 422, { kind: "unsupported" });
      // Do not log session tokens, generated answers, or the original problem.
      console.error("[solveplot:practice] Request failed", error instanceof Error ? error.name : "UnknownError");
      return failure("Practice is temporarily unavailable. Your original solution is still here; try again shortly.", 503, { kind: "unavailable" });
    }
  };
}

/**
 * No model calls are made, so practice never spends a solve/tutor allowance.
 * This bounded process-local burst guard supplements auth for these inexpensive
 * deterministic requests. It is intentionally not a billing/daily-quota system.
 */
export function createPracticeRateLimiter(now: () => number = Date.now) {
  const windows = new Map<string, number[]>();
  return async (userId: string, action: "generate" | "grade" | "hint" | "reveal"): Promise<Reservation> => {
    const time = now(), key = `${userId}:${action === "generate" ? "generate" : "interaction"}`;
    const attempts = (windows.get(key) ?? []).filter(at => at > time - 60_000);
    const limit = action === "generate" ? 8 : 60;
    if (attempts.length >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((attempts[0] + 60_000 - time) / 1000)) };
    attempts.push(time);
    windows.delete(key);
    windows.set(key, attempts);
    if (windows.size > 10_000) windows.delete(windows.keys().next().value!);
    return { allowed: true, retryAfter: 0 };
  };
}
