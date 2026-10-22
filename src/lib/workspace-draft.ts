/** A single account-scoped, in-memory draft. No uploads or answers enter browser storage. */
export function createWorkspaceDraftStore<
  T extends { image: { url: string } | null },
>(release: (url: string) => void) {
  let retained: { owner: string; draft: T } | null = null;
  return {
    read(owner: string): T | null {
      return retained?.owner === owner ? retained.draft : null;
    },
    write(owner: string, draft: T) {
      const previous = retained?.draft.image?.url;
      if (previous && previous !== draft.image?.url) release(previous);
      retained = { owner, draft };
    },
    clear(owner: string) {
      if (retained?.owner !== owner) return;
      if (retained.draft.image) release(retained.draft.image.url);
      retained = null;
    },
  };
}
