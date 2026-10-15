import type { DesmosApi } from "./desmos-engine";

export const DESMOS_READY_EVENT = "desmo:calculator-ready";

export function desmosScriptUrl(apiKey: string): string {
  return `https://www.desmos.com/api/v1.11/calculator.js?apiKey=${encodeURIComponent(apiKey.trim())}`;
}

type ScriptRequest = { src: string; onLoad: () => void; onError: () => void };
type LoaderEnvironment = {
  readApi: () => DesmosApi | undefined;
  /** Remove only this attempt's script if the request fails or times out. */
  insertScript: (request: ScriptRequest) => () => void;
  onReady?: () => void;
};
type LoaderOptions = { timeoutMs?: number; retryDelayMs?: number; attempts?: number };

/** One request shared by the visible calculator and hidden validation engine. */
export function createDesmosLoader(environment: LoaderEnvironment, options: LoaderOptions = {}) {
  const { timeoutMs = 12_000, retryDelayMs = 250, attempts = 2 } = options;
  let pending: Promise<DesmosApi> | null = null;

  function attempt(src: string): Promise<DesmosApi> {
    return new Promise((resolve, reject) => {
      let finished = false;
      let removeScript: (() => void) | undefined;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        const api = environment.readApi();
        if (error || !api?.GraphingCalculator) {
          removeScript?.();
          reject(error ?? new Error("Desmos did not initialize"));
        } else resolve(api);
      };
      const timeout = setTimeout(() => finish(new Error("Desmos timed out while loading")), timeoutMs);
      try {
        removeScript = environment.insertScript({
          src,
          onLoad: () => finish(),
          onError: () => finish(new Error("Desmos could not load")),
        });
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Desmos could not load"));
      }
    });
  }

  return function load(apiKey: string): Promise<DesmosApi> {
    const api = environment.readApi();
    if (api?.GraphingCalculator) return Promise.resolve(api);
    if (!apiKey.trim()) return Promise.reject(new Error("The Desmos API key is missing"));
    if (pending) return pending;
    const run = async () => {
      let failure: unknown;
      for (let index = 0; index < attempts; index += 1) {
        if (index > 0) await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        const available = environment.readApi();
        if (available?.GraphingCalculator) return available;
        try {
          const loaded = await attempt(desmosScriptUrl(apiKey));
          environment.onReady?.();
          return loaded;
        } catch (error) {
          failure = error;
        }
      }
      throw failure;
    };
    const request = run();
    pending = request;
    // A rejected attempt must never poison future visits or the retry button.
    request.then(() => { pending = null; }, () => { pending = null; });
    return request;
  };
}

let browserLoader: ReturnType<typeof createDesmosLoader> | undefined;

/** Starts loading itself; preflight does not depend on a mounted graph or tab. */
export function loadDesmos(): Promise<DesmosApi> {
  if (typeof window === "undefined") return Promise.reject(new Error("Desmos needs a browser"));
  browserLoader ??= createDesmosLoader({
    readApi: () => window.Desmos,
    insertScript: ({ src, onLoad, onError }) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.desmoCalculator = "true";
      script.addEventListener("load", onLoad, { once: true });
      script.addEventListener("error", onError, { once: true });
      document.head.append(script);
      return () => {
        script.removeEventListener("load", onLoad);
        script.removeEventListener("error", onError);
        script.remove();
      };
    },
    onReady: () => window.dispatchEvent(new Event(DESMOS_READY_EVENT)),
  });
  return browserLoader(process.env.NEXT_PUBLIC_DESMOS_API_KEY?.trim() ?? "");
}
