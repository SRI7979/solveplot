import { EMPTY_LEARNING_PROGRESS, mergeLearningProgress, stableProgressJSON, validateLearningProgress, type LearningProgress } from "./learning-progress";

export type StoredLearningProgress = { progress: LearningProgress; revision: number };
/** Revisions make read–merge–write safe when two devices save at once. */
export type LearningProgressStore = {
  read(userId: string): Promise<StoredLearningProgress | null>;
  create(userId: string, progress: LearningProgress): Promise<boolean>;
  replace(userId: string, revision: number, progress: LearningProgress): Promise<boolean>;
};
type Dependencies = { getCurrentUser(): Promise<{ id: string } | null>; getStore(): Promise<LearningProgressStore> | LearningProgressStore };
const MAX_BYTES = 192 * 1024;
const headers = { "Cache-Control": "private, no-store", "Vary": "Cookie" };
function error(message: string, status: number, kind: string) { return Response.json({ error: message, kind }, { status, headers }); }
function setupMissing(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const detail = value as { code?: string; message?: string; cause?: unknown };
  return /PGRST205|42P01/.test(detail.code ?? "") && /learning_progress/i.test(detail.message ?? "") || Boolean(detail.cause && setupMissing(detail.cause));
}
function storageFailure(cause: unknown) {
  return setupMissing(cause) ? error("Progress sync is waiting for database setup. Your progress stays saved on this device.", 503, "setup_required")
    : error("Progress could not sync right now. Your progress stays saved on this device.", 503, "unavailable");
}
function crossSite(request: Request) {
  const origin = request.headers.get("origin");
  return request.headers.get("sec-fetch-site") === "cross-site" || Boolean(origin && origin !== new URL(request.url).origin);
}
async function readBody(request: Request): Promise<{ value?: unknown; failure?: Response }> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) return { failure: error("Use a JSON progress update.", 415, "invalid_content_type") };
  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_BYTES) return { failure: error("That progress update is too large.", 413, "too_large") };
  const reader = request.body?.getReader();
  if (!reader) return { failure: error("A progress update is required.", 400, "invalid_progress") };
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return { failure: error("That progress update is too large.", 413, "too_large") }; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch { return { failure: error("That progress update could not be read.", 400, "invalid_progress") }; }
}

export function createLearningProgressHandlers(dependencies: Dependencies) {
  async function authorized(request: Request) {
    try {
      const user = await dependencies.getCurrentUser();
      if (!user) return { failure: error("Sign in to sync your progress.", 401, "sign_in_required") };
      // The header is a precondition only. It never chooses whose row is read or written.
      const expected = request.headers.get("x-solveplot-account");
      if (expected && expected !== user.id) return { failure: error("Your account changed. Reload Learn before syncing.", 409, "account_changed") };
      return { user };
    } catch { return { failure: error("Sign-in is temporarily unavailable.", 503, "unavailable") }; }
  }
  return {
    async GET(request: Request) {
      const auth = await authorized(request); if (auth.failure) return auth.failure;
      const user = auth.user!;
      try {
        const stored = await (await dependencies.getStore()).read(user.id);
        return Response.json({ userId: user.id, progress: stored?.progress ?? EMPTY_LEARNING_PROGRESS, revision: stored?.revision ?? 0 }, { headers });
      } catch (cause) { return storageFailure(cause); }
    },
    async POST(request: Request) {
      if (crossSite(request)) return error("Use SolvePlot to save progress.", 403, "cross_site");
      const auth = await authorized(request); if (auth.failure) return auth.failure;
      const body = await readBody(request); if (body.failure) return body.failure;
      if (!body.value || typeof body.value !== "object" || Array.isArray(body.value) || Object.keys(body.value).length !== 1 || !("progress" in body.value)) return error("That progress update is invalid.", 400, "invalid_progress");
      const incoming = validateLearningProgress((body.value as { progress: unknown }).progress);
      if (!incoming) return error("That progress update is invalid.", 400, "invalid_progress");
      const user = auth.user!;
      try {
        const store = await dependencies.getStore();
        for (let attempt = 0; attempt < 4; attempt++) {
          const previous = await store.read(user.id);
          const progress = mergeLearningProgress(previous?.progress ?? EMPTY_LEARNING_PROGRESS, incoming);
          if (previous && stableProgressJSON(previous.progress) === stableProgressJSON(progress)) return Response.json({ userId: user.id, ...previous }, { headers });
          const saved = previous ? await store.replace(user.id, previous.revision, progress) : await store.create(user.id, progress);
          if (saved) return Response.json({ userId: user.id, progress, revision: previous ? previous.revision + 1 : 1 }, { headers });
        }
        return error("Another device saved progress at the same time. Your changes remain on this device; try syncing again.", 409, "conflict");
      } catch (cause) { return storageFailure(cause); }
    },
  };
}
