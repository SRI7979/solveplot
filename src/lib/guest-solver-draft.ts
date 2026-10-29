import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./solver-schema";
import { MAX_PROBLEM_TEXT_LENGTH } from "./text-problem";

/** Only unfinished input crosses sign-in. Solutions remain account-scoped in memory. */
export type SolverInputDraft = {
  inputMode: "text" | "image";
  problemText: string;
  image: { blob: Blob; name: string } | null;
};
type HandoffRecord = SolverInputDraft & { version: 1; id: string; ownerId: string | null; createdAt: number };
export const DRAFT_HANDOFF_TTL = 30 * 60 * 1000;
export const DRAFT_HANDOFF_KEY = "solveplot:solver-signin-draft:v1";
const ID = /^[a-zA-Z0-9-]{16,100}$/;

type Records = {
  put(record: HandoffRecord): Promise<void>;
  /** Read and delete in one transaction, so two tabs cannot claim the same input. */
  take(id: string): Promise<unknown>;
};
type TicketStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function validInput(value: unknown): value is SolverInputDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as SolverInputDraft;
  if (draft.inputMode !== "text" && draft.inputMode !== "image") return false;
  if (typeof draft.problemText !== "string" || draft.problemText.length > MAX_PROBLEM_TEXT_LENGTH) return false;
  if (draft.image !== null && (
    !draft.image || !(draft.image.blob instanceof Blob) ||
    !ACCEPTED_IMAGE_TYPES.some(type => type === draft.image!.blob.type) ||
    draft.image.blob.size === 0 || draft.image.blob.size > MAX_IMAGE_BYTES ||
    typeof draft.image.name !== "string" || draft.image.name.length > 200
  )) return false;
  return draft.inputMode === "image" ? draft.image !== null : draft.problemText.trim().length > 0;
}

/** Injectable storage keeps ownership, expiry, and one-shot behavior independently testable. */
export function createSolverDraftHandoff({ records, tickets, now = Date.now, newId = () => crypto.randomUUID() }: {
  records: Records;
  tickets: TicketStorage;
  now?: () => number;
  newId?: () => string;
}) {
  async function discard() {
    const id = tickets.getItem(DRAFT_HANDOFF_KEY);
    tickets.removeItem(DRAFT_HANDOFF_KEY);
    if (id && ID.test(id)) await records.take(id);
  }
  return {
    discard,
    async save(input: SolverInputDraft, ownerId: string | null = null) {
      if (!validInput(input)) throw new Error("Your question could not be kept for sign-in. Check the text or image and try again.");
      await discard();
      const id = newId();
      if (!ID.test(id)) throw new Error("Could not prepare your question for sign-in.");
      const record: HandoffRecord = { ...input, version: 1, id, ownerId, createdAt: now() };
      await records.put(record);
      try { tickets.setItem(DRAFT_HANDOFF_KEY, id); }
      catch (error) { await records.take(id); throw error; }
    },
    async consume(userId: string): Promise<SolverInputDraft | null> {
      if (!userId) return null;
      const id = tickets.getItem(DRAFT_HANDOFF_KEY);
      // Claim the tab ticket before awaiting IndexedDB; refreshes cannot replay it.
      tickets.removeItem(DRAFT_HANDOFF_KEY);
      if (!id || !ID.test(id)) return null;
      const value = await records.take(id);
      if (!validInput(value)) return null;
      const record = value as HandoffRecord;
      if (record.version !== 1 || record.id !== id ||
        (record.ownerId !== null && record.ownerId !== userId) ||
        !Number.isFinite(record.createdAt) || record.createdAt > now() + 60_000 ||
        now() - record.createdAt > DRAFT_HANDOFF_TTL) return null;
      return { inputMode: record.inputMode, problemText: record.problemText, image: record.image };
    },
  };
}

const DATABASE = "solveplot-signin-draft";
const STORE = "input";
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Close any older SolvePlot tabs and try signing in again."));
    request.onsuccess = () => resolve(request.result);
  });
}
const browserRecords: Records = {
  async put(record) {
    const db = await openDatabase();
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(STORE, "readwrite");
        const store = transaction.objectStore(STORE);
        // Expired, abandoned sign-in inputs are removed on the next handoff.
        const cursor = store.openCursor();
        cursor.onsuccess = () => {
          const entry = cursor.result;
          if (!entry) return;
          const createdAt = entry.value?.createdAt;
          if (!Number.isFinite(createdAt) || Date.now() - createdAt > DRAFT_HANDOFF_TTL) entry.delete();
          entry.continue();
        };
        store.put(record);
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    } finally { db.close(); }
  },
  async take(id) {
    const db = await openDatabase();
    try {
      return await new Promise<unknown>((resolve, reject) => {
        const transaction = db.transaction(STORE, "readwrite");
        const store = transaction.objectStore(STORE);
        const request = store.get(id);
        store.delete(id);
        transaction.oncomplete = () => resolve(request.result);
        transaction.onabort = () => reject(transaction.error);
        transaction.onerror = () => reject(transaction.error);
      });
    } finally { db.close(); }
  },
};

function browserHandoff() {
  return createSolverDraftHandoff({ records: browserRecords, tickets: window.sessionStorage });
}
export async function preserveSolverInput(input: SolverInputDraft, ownerId: string | null) {
  try { await browserHandoff().save(input, ownerId); }
  catch { throw new Error("Your browser couldn’t keep this question for sign-in. Allow site storage and try again; your question is still here."); }
}
export async function restoreSolverInput(userId: string) {
  // Storage-denied browsers have no accessible ticket; ordinary signed-in
  // visits should not show a restoration error when no handoff was possible.
  try { if (!window.sessionStorage.getItem(DRAFT_HANDOFF_KEY)) return null; }
  catch { return null; }
  return browserHandoff().consume(userId);
}
export async function discardSolverInput() {
  try { if (!window.sessionStorage.getItem(DRAFT_HANDOFF_KEY)) return; }
  catch { return; }
  return browserHandoff().discard();
}
