import { LESSONS } from "./learn-catalog";
import { LEARNING_UNITS } from "./learning-path";
import { parseLessonDraft, type LessonDraft } from "./learning-session";
export type { LessonAttempt, LessonDraft } from "./learning-session";

export type LessonCompletion = { answered: number; assisted: number; total: number; completedAt: string; firstTryCorrect?: number; hintsUsed?: number; attempts?: number };
export type CheckpointCompletion = { correct: number; total: number; completedAt: string };
export type LearningProgress = {
  lessons: Record<string, LessonCompletion>;
  checkpoints: Record<string, CheckpointCompletion>;
  drafts: Record<string, LessonDraft>;
  /** Tombstones let an explicit reset beat an older draft on another device. */
  clearedDrafts?: Record<string, string>;
};
export type LearningSyncStatus = "local" | "syncing" | "synced" | "offline" | "setup-required" | "sign-in-required" | "session-only";
export const EMPTY_LEARNING_PROGRESS: LearningProgress = { lessons: {}, checkpoints: {}, drafts: {} };
const lessonIds = new Set<string>(LESSONS.map((lesson) => lesson.slug));
const checkpointIds = new Set<string>(LEARNING_UNITS.map((unit) => unit.id));
const draftIds = new Set([...lessonIds, ...checkpointIds]);
const EVENT = "solveplot-learning-progress";
const cache = new Map<string, { raw: string | null; value: LearningProgress }>();
const memory = new Map<string, string>();
const unsaved = new Set<string>();
const statuses = new Map<string, LearningSyncStatus>();
const active = new Map<string, number>();
const pending = new Map<string, Promise<void>>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
const controllers = new Map<string, AbortController>();
const requestPhase = new Map<string, "read" | "write">();
const dirty = new Set<string>();
const MAX_PROGRESS_BYTES = 192 * 1024;

export function learningProgressKey(scope: string) {
  if (!/^(guest|user:[a-zA-Z0-9-]{1,80})$/.test(scope)) throw new Error("Invalid learning progress scope");
  return `solveplot-learning-progress-v1:${scope}`;
}

function count(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 30; }
function object(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function timestamp(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }

/** Only recognized records survive malformed/legacy device data. Missing accuracy stays unknown. */
export function parseLearningProgress(raw: string | null): LearningProgress {
  try {
    if (raw && raw.length > MAX_PROGRESS_BYTES) return EMPTY_LEARNING_PROGRESS;
    const input: unknown = JSON.parse(raw ?? "null");
    if (!object(input)) return EMPTY_LEARNING_PROGRESS;
    const result: LearningProgress = { lessons: {}, checkpoints: {}, drafts: {} };
    if (object(input.lessons)) for (const [id, entry] of Object.entries(input.lessons)) {
      if (lessonIds.has(id) && object(entry) && count(entry.answered) && count(entry.assisted) && count(entry.total) && entry.total > 0 && entry.answered + entry.assisted === entry.total && timestamp(entry.completedAt)) {
        const record: LessonCompletion = { answered: entry.answered, assisted: entry.assisted, total: entry.total, completedAt: entry.completedAt };
        if (count(entry.firstTryCorrect) && entry.firstTryCorrect <= entry.answered) record.firstTryCorrect = entry.firstTryCorrect;
        if (count(entry.hintsUsed) && entry.hintsUsed <= entry.total) record.hintsUsed = entry.hintsUsed;
        if (Number.isInteger(entry.attempts) && (entry.attempts as number) >= 0 && (entry.attempts as number) <= 6000) record.attempts = entry.attempts as number;
        result.lessons[id] = record;
      }
    }
    if (object(input.checkpoints)) for (const [id, entry] of Object.entries(input.checkpoints)) {
      if (checkpointIds.has(id) && object(entry) && count(entry.correct) && entry.total === 4 && entry.correct <= entry.total && timestamp(entry.completedAt)) {
        result.checkpoints[id] = { correct: entry.correct, total: entry.total, completedAt: entry.completedAt };
      }
    }
    if (object(input.clearedDrafts)) for (const [id, clearedAt] of Object.entries(input.clearedDrafts)) {
      if (draftIds.has(id) && timestamp(clearedAt)) (result.clearedDrafts ??= {})[id] = clearedAt;
    }
    if (object(input.drafts)) for (const [id, value] of Object.entries(input.drafts)) {
      const draft = parseLessonDraft(value);
      if (draftIds.has(id) && draft && (!result.clearedDrafts?.[id] || Date.parse(draft.updatedAt) > Date.parse(result.clearedDrafts[id]))) result.drafts[id] = draft;
    }
    return result;
  } catch { return EMPTY_LEARNING_PROGRESS; }
}

/** Stable field ordering is useful for idempotence, comparisons, and deterministic merge ties. */
export function stableProgressJSON(value: unknown): string {
  const canonical = (item: unknown): unknown => Array.isArray(item) ? item.map(canonical) : object(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, canonical(item[key])])) : item;
  return JSON.stringify(canonical(value));
}

/** Strict boundary for writes; local salvage never silently makes a malformed server write valid. */
export function validateLearningProgress(value: unknown, now = Date.now()): LearningProgress | null {
  if (!object(value) || Object.keys(value).some(key => !["lessons", "checkpoints", "drafts", "clearedDrafts"].includes(key)) ||
      !object(value.lessons) || !object(value.checkpoints) || (value.drafts !== undefined && !object(value.drafts)) || (value.clearedDrafts !== undefined && !object(value.clearedDrafts))) return null;
  const raw = JSON.stringify(value);
  if (new TextEncoder().encode(raw).byteLength > MAX_PROGRESS_BYTES) return null;
  const parsed = parseLearningProgress(raw);
  for (const key of ["lessons", "checkpoints", "drafts", "clearedDrafts"] as const) {
    const given = value[key] ?? {};
    if (stableProgressJSON(given) !== stableProgressJSON(parsed[key] ?? {})) return null;
  }
  const dates = [...Object.values(parsed.lessons).map(item => item.completedAt), ...Object.values(parsed.checkpoints).map(item => item.completedAt),
    ...Object.values(parsed.drafts).map(item => item.updatedAt), ...Object.values(parsed.clearedDrafts ?? {})];
  if (dates.some(date => Date.parse(date) > now + 5 * 60_000)) return null;
  return parsed;
}

function bestLesson(a: LessonCompletion, b: LessonCompletion): LessonCompletion {
  if (a.total !== b.total) {
    const timeDifference = Date.parse(a.completedAt) - Date.parse(b.completedAt);
    return timeDifference > 0 ? a : timeDifference < 0 ? b : stableProgressJSON(a) >= stableProgressJSON(b) ? a : b;
  }
  // Once a modern run supplies first-try data, do not invent it from a legacy finish.
  const score = (record: LessonCompletion) => [record.firstTryCorrect === undefined ? 0 : 1, record.firstTryCorrect ?? 0, record.answered, -(record.hintsUsed ?? 0), -(record.attempts ?? 0)];
  const left = score(a), right = score(b);
  for (let i = 0; i < left.length; i++) if (left[i] !== right[i]) return left[i] > right[i] ? a : b;
  return a.completedAt < b.completedAt ? a : a.completedAt > b.completedAt ? b : stableProgressJSON(a) <= stableProgressJSON(b) ? a : b;
}

/** Commutative merge: best completion/checkpoint, newest draft, and explicit reset tombstones. */
export function mergeLearningProgress(left: LearningProgress, right: LearningProgress): LearningProgress {
  const result: LearningProgress = { lessons: { ...left.lessons }, checkpoints: { ...left.checkpoints }, drafts: {} };
  for (const [id, record] of Object.entries(right.lessons)) result.lessons[id] = result.lessons[id] ? bestLesson(result.lessons[id], record) : record;
  for (const [id, record] of Object.entries(right.checkpoints)) {
    const old = result.checkpoints[id];
    if (!old || record.correct > old.correct || (record.correct === old.correct && record.completedAt < old.completedAt)) result.checkpoints[id] = record;
  }
  const cleared: Record<string, string> = { ...left.clearedDrafts };
  for (const [id, date] of Object.entries(right.clearedDrafts ?? {})) if (!cleared[id] || Date.parse(date) > Date.parse(cleared[id]) || (Date.parse(date) === Date.parse(cleared[id]) && date > cleared[id])) cleared[id] = date;
  if (Object.keys(cleared).length) result.clearedDrafts = cleared;
  for (const source of [left.drafts, right.drafts]) for (const [id, draft] of Object.entries(source)) {
    if (cleared[id] && Date.parse(cleared[id]) >= Date.parse(draft.updatedAt)) continue;
    const old = result.drafts[id];
    if (!old || Date.parse(draft.updatedAt) > Date.parse(old.updatedAt) || (Date.parse(draft.updatedAt) === Date.parse(old.updatedAt) && stableProgressJSON(draft) > stableProgressJSON(old))) result.drafts[id] = draft;
  }
  return result;
}

export function getLearningProgress(scope: string): LearningProgress {
  if (typeof window === "undefined") return EMPTY_LEARNING_PROGRESS;
  const key = learningProgressKey(scope);
  let raw: string | null;
  try { raw = unsaved.has(key) ? memory.get(key) ?? null : window.localStorage.getItem(key); } catch { raw = memory.get(key) ?? null; }
  const known = cache.get(key);
  if (known && known.raw === raw) return known.value;
  const value = parseLearningProgress(raw);
  cache.set(key, { raw, value });
  return value;
}

function emit() { if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT)); }
function status(scope: string, value: LearningSyncStatus) { if (statuses.get(scope) !== value) { statuses.set(scope, value); emit(); } }
export function getLearningSyncStatus(scope: string): LearningSyncStatus {
  const key = learningProgressKey(scope);
  const state = statuses.get(scope) ?? "local";
  return unsaved.has(key) && state !== "synced" && state !== "syncing" ? "session-only" : state;
}

function schedule(scope: string, delay = 650) {
  if (!scope.startsWith("user:") || !active.get(scope)) return;
  const old = timers.get(scope);
  if (old) clearTimeout(old);
  timers.set(scope, setTimeout(() => { timers.delete(scope); void syncLearningProgress(scope); }, delay));
}

function save(scope: string, value: LearningProgress, sync = true) {
  if (typeof window === "undefined") return;
  const key = learningProgressKey(scope);
  const raw = JSON.stringify(value);
  if (raw === cache.get(key)?.raw) return;
  memory.set(key, raw);
  try { window.localStorage.setItem(key, raw); unsaved.delete(key); } catch { unsaved.add(key); }
  cache.set(key, { raw, value });
  if (sync && scope.startsWith("user:")) { dirty.add(scope); statuses.set(scope, active.get(scope) ? "syncing" : "local"); }
  emit();
  if (sync) schedule(scope);
}

export function recordLessonCompletion(scope: string, id: string, result: Omit<LessonCompletion, "completedAt">) {
  const candidate = { ...result, completedAt: new Date().toISOString() };
  const valid = validateLearningProgress({ lessons: { [id]: candidate }, checkpoints: {}, drafts: {} });
  if (!valid) return;
  const previous = getLearningProgress(scope), known = previous.lessons[id];
  if (known && bestLesson(known, candidate) === known) return;
  save(scope, { ...previous, lessons: { ...previous.lessons, [id]: candidate } });
}

export function recordCheckpointCompletion(scope: string, id: string, result: Omit<CheckpointCompletion, "completedAt">) {
  if (!checkpointIds.has(id) || !count(result.correct) || result.total !== 4 || result.correct > result.total) return;
  const previous = getLearningProgress(scope);
  if (previous.checkpoints[id]?.correct >= result.correct) return;
  save(scope, { ...previous, checkpoints: { ...previous.checkpoints, [id]: { ...result, completedAt: new Date().toISOString() } } });
}

export function saveLessonDraft(scope: string, id: string, value: LessonDraft) {
  const draft = parseLessonDraft(value);
  if (!draftIds.has(id) || !draft) return;
  const previous = getLearningProgress(scope);
  const next = mergeLearningProgress(previous, { ...EMPTY_LEARNING_PROGRESS, drafts: { [id]: draft } });
  if (stableProgressJSON(previous) !== stableProgressJSON(next)) save(scope, next);
}
export function getLessonDraft(scope: string, id: string): LessonDraft | null { return getLearningProgress(scope).drafts[id] ?? null; }
export function clearLessonDraft(scope: string, id: string) {
  if (!draftIds.has(id)) return;
  const previous = getLearningProgress(scope);
  const drafts = { ...previous.drafts }; delete drafts[id];
  save(scope, { ...previous, drafts, clearedDrafts: { ...previous.clearedDrafts, [id]: new Date().toISOString() } });
}

async function failureStatus(response: Response): Promise<LearningSyncStatus> {
  if (response.status === 401) return "sign-in-required";
  const detail = await response.json().catch(() => ({})) as { kind?: string };
  return detail.kind === "account_changed" ? "sign-in-required" : detail.kind === "setup_required" ? "setup-required" : "offline";
}

/** One shared sync per account. Always merge responses with the *current* local snapshot. */
export async function syncLearningProgress(scope: string): Promise<void> {
  learningProgressKey(scope);
  if (scope === "guest" || typeof window === "undefined") return;
  const existing = pending.get(scope);
  if (existing) {
    if (controllers.get(scope)?.signal.aborted) { await existing; if (pending.get(scope) === existing) pending.delete(scope); return syncLearningProgress(scope); }
    return existing;
  }
  const controller = new AbortController(); controllers.set(scope, controller); requestPhase.set(scope, "read");
  const expectedUser = scope.slice(5);
  const headers = { "Content-Type": "application/json", "X-SolvePlot-Account": expectedUser };
  const work = (async () => {
    status(scope, "syncing");
    try {
      const response = await fetch("/api/learn/progress", { credentials: "same-origin", cache: "no-store", headers, signal: controller.signal });
      if (!response.ok) { status(scope, await failureStatus(response)); return; }
      const payload = await response.json() as { userId?: unknown; progress?: unknown };
      if (controller.signal.aborted) return;
      if (payload.userId !== expectedUser) { status(scope, "sign-in-required"); return; }
      const remote = validateLearningProgress(payload.progress);
      if (!remote) { status(scope, "offline"); return; }
      save(scope, mergeLearningProgress(getLearningProgress(scope), remote), false);
      const sent = getLearningProgress(scope);
      if (stableProgressJSON(sent) === stableProgressJSON(remote)) { dirty.delete(scope); status(scope, "synced"); return; }
      const body = JSON.stringify({ progress: sent });
      requestPhase.set(scope, "write");
      const posted = await fetch("/api/learn/progress", { method: "POST", credentials: "same-origin", cache: "no-store", headers, body,
        keepalive: new TextEncoder().encode(body).byteLength < 60_000, signal: controller.signal });
      if (!posted.ok) { status(scope, await failureStatus(posted)); return; }
      const stored = await posted.json() as { userId?: unknown; progress?: unknown };
      if (controller.signal.aborted) return;
      if (stored.userId !== expectedUser) { status(scope, "sign-in-required"); return; }
      const accepted = validateLearningProgress(stored.progress);
      if (!accepted) { status(scope, "offline"); return; }
      const merged = mergeLearningProgress(getLearningProgress(scope), accepted);
      save(scope, merged, false);
      const caughtUp = stableProgressJSON(merged) === stableProgressJSON(accepted);
      if (caughtUp) { dirty.delete(scope); status(scope, "synced"); }
      else if (dirty.has(scope)) { status(scope, "syncing"); schedule(scope); }
    } catch { if (!controller.signal.aborted) status(scope, "offline"); }
    finally { if (controllers.get(scope) === controller) { controllers.delete(scope); requestPhase.delete(scope); } }
  })();
  pending.set(scope, work);
  try { await work; } finally { if (pending.get(scope) === work) pending.delete(scope); }
}

/** Best-effort final write. Server-side merge makes this safe without another GET.
 * Used on navigation/pagehide; never calls an AI service or reports success before acknowledgment.
 */
export async function flushLearningProgress(scope: string): Promise<void> {
  learningProgressKey(scope);
  if (typeof window === "undefined" || scope === "guest" || !dirty.has(scope)) return;
  const expectedUser = scope.slice(5);
  const body = JSON.stringify({ progress: getLearningProgress(scope) });
  // The browser caps keepalive bodies at 64 KiB. Larger drafts stay safely local
  // and use ordinary sync next time the learner opens Learn.
  if (new TextEncoder().encode(body).byteLength >= 60_000) { status(scope, "local"); return; }
  try {
    const response = await fetch("/api/learn/progress", { method: "POST", credentials: "same-origin", cache: "no-store", keepalive: true,
      headers: { "Content-Type": "application/json", "X-SolvePlot-Account": expectedUser }, body });
    if (!response.ok) { status(scope, await failureStatus(response)); return; }
    const stored = await response.json() as { userId?: unknown; progress?: unknown };
    if (stored.userId !== expectedUser) { status(scope, "sign-in-required"); return; }
    const accepted = validateLearningProgress(stored.progress);
    if (!accepted) { status(scope, "offline"); return; }
    const merged = mergeLearningProgress(getLearningProgress(scope), accepted);
    save(scope, merged, false);
    if (stableProgressJSON(merged) === stableProgressJSON(accepted)) { dirty.delete(scope); status(scope, "synced"); }
    else if (dirty.has(scope)) { status(scope, "syncing"); schedule(scope); }
  } catch { status(scope, "offline"); }
}

/** Mounting a signed-in Learn view enables sync; no guest or background model requests occur. */
export function startLearningSync(scope: string) {
  learningProgressKey(scope);
  if (typeof window === "undefined" || scope === "guest") return () => {};
  active.set(scope, (active.get(scope) ?? 0) + 1);
  if (active.get(scope) === 1) void syncLearningProgress(scope);
  const refresh = () => schedule(scope, 0);
  const storage = (event: StorageEvent) => { if (!event.key || event.key === learningProgressKey(scope)) schedule(scope); };
  const flush = () => queueMicrotask(() => { void flushLearningProgress(scope); });
  window.addEventListener("online", refresh); window.addEventListener("focus", refresh); window.addEventListener("storage", storage); window.addEventListener("pagehide", flush);
  return () => {
    window.removeEventListener("online", refresh); window.removeEventListener("focus", refresh); window.removeEventListener("storage", storage); window.removeEventListener("pagehide", flush);
    const count = Math.max(0, (active.get(scope) ?? 1) - 1); active.set(scope, count);
    if (!count) {
      const timer = timers.get(scope); if (timer) clearTimeout(timer); timers.delete(scope);
      if (requestPhase.get(scope) === "read") controllers.get(scope)?.abort();
      // Run after the player's own cleanup has persisted its final slide/answer.
      flush();
    }
  };
}

export function subscribeLearningProgress(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", listener);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener("storage", listener); };
}
