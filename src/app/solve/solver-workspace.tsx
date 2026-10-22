"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  FileImage,
  FileText,
  ImageIcon,
  List,
  ScanLine,
  Upload,
} from "lucide-react";
import { WorkspaceAppearance } from "@/components/appearance-provider";
import { CalculatorVerificationProvider } from "@/components/calculator-verification";
import DesmosCalculator from "@/components/desmos-calculator";
import MathText from "@/components/math-text";
import { createWorkspaceDraftStore } from "@/lib/workspace-draft";
import { MAX_PROBLEM_TEXT_LENGTH } from "@/lib/text-problem";
import { useSolverSplit } from "@/components/use-solver-split";
import { preflight } from "@/components/preflight-gate";
import { DESMOS_READY_EVENT, loadDesmos } from "@/lib/desmos-loader";
import SolutionExplanation from "@/components/solution-explanation";
import TechniqueSelector from "@/components/technique-selector";
import {
  isNewProblemShortcut,
  NEW_PROBLEM_EVENT,
  SHOW_CALCULATOR_EVENT,
} from "@/lib/workspace-events";
import { startSolveTiming, type SolveTimer } from "@/lib/client-timing";
import {
  calculatorPayload,
  preflightInRankOrder,
  reportable,
  type ReportedVerdict,
} from "@/lib/desmos-preflight";
import type { MethodSummary } from "@/lib/method-summary";
import { retryCountdown } from "@/lib/retry-countdown";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  solutionSchema,
  type Solution,
} from "@/lib/solver-schema";
import {
  baseSolution,
  explanationFromEvents,
  parseMethodsPayload,
  provisionalSolution,
  readNdjsonEvents,
  selectorMethods,
  type ExplanationStatus,
  type MethodsPayload,
  type VerdictStatus,
} from "@/lib/technique-selection-ui";
import styles from "./page.module.css";

const NO_EXPRESSIONS: Solution["expressions"] = [];
const NO_METHODS: MethodSummary[] = [];
const NDJSON = "application/x-ndjson";

/** Adapts a fetch response body into the string chunks readNdjsonEvents expects. */
async function* decodeBody(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      yield decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}
function ArrowIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type PreflightReply =
  | { status: "ready" | "retry"; payload: MethodsPayload }
  | { status: "failed"; error: string };

const HONEST_FAILURE =
  "The calculator could not verify any of the methods found. Check that the full question and all its values are included, then try again.";
const UNVERIFIED =
  "The calculator has not connected yet. Your solution is kept here. Retry the calculator to check and display it.";

type PreflightOptions = {
  retried?: boolean;
  distrust?: boolean;
  resuming?: boolean;
};

function isEvent(
  value: unknown,
): value is Record<string, unknown> & { type: string } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

type WorkspaceDraft = {
  image: { file: File; url: string } | null;
  inputMode: "image" | "text";
  problemText: string;
  solution: Solution | null;
  methods: MethodSummary[];
  verdicts: Record<string, VerdictStatus>;
  selectedMethodId: string | null;
  problemId: string | null;
  cacheKey: string | null;
  revision: number;
  base: Solution | null;
  explanations: [string, Solution][];
};
const drafts = createWorkspaceDraftStore<WorkspaceDraft>((url) =>
  URL.revokeObjectURL(url),
);

export default function SolverWorkspace({
  accountNav,
  fontClassName = "",
  userId,
  startFresh = false,
}: {
  accountNav: ReactNode;
  fontClassName?: string;
  userId?: string;
  startFresh?: boolean;
}) {
  const [initial] = useState(() => {
    if (!userId) return null;
    if (startFresh) {
      drafts.clear(userId);
      return null;
    }
    return drafts.read(userId);
  });
  const [image, setImage] = useState<{ file: File; url: string } | null>(
    initial?.image ?? null,
  );
  const [inputMode, setInputMode] = useState<"image" | "text">(
    initial?.inputMode ?? "image",
  );
  const [problemText, setProblemText] = useState(initial?.problemText ?? "");
  const textInput = useRef<HTMLTextAreaElement>(null);
  const hasInput =
    inputMode === "text" ? problemText.trim().length > 0 : image !== null;
  const [solution, setSolution] = useState<Solution | null>(
    initial?.solution ?? null,
  );
  const [methods, setMethods] = useState<MethodSummary[]>(
    initial?.methods ?? NO_METHODS,
  );
  const [verdicts, setVerdicts] = useState<Record<string, VerdictStatus>>(
    initial?.verdicts ?? {},
  );
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(
    initial?.selectedMethodId ?? null,
  );
  const [explanationStatus, setExplanationStatus] =
    useState<ExplanationStatus>("ready");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [awaitingCalculator, setAwaitingCalculator] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [imageZoomed, setImageZoomed] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<"solution" | "calculator">(
    "solution",
  );
  const [revision, setRevision] = useState(initial?.revision ?? 0);
  const [problemId, setProblemId] = useState<string | null>(
    initial?.problemId ?? null,
  );
  // The solve the shown methods come from, for the tutor and saved tricks.
  const [cacheKey, setCacheKey] = useState<string | null>(
    initial?.cacheKey ?? null,
  );
  const [historyWarning, setHistoryWarning] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  // A daily limit or a full day's capacity: information, not an error.
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageDialog = useRef<HTMLDialogElement>(null);
  const viewImageButton = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const switchRequest = useRef<AbortController | null>(null);
  // Invalidates a switch's in-flight explanation if a newer switch or a fresh
  // solve supersedes it before the response arrives.
  const switchToken = useRef(0);
  // One per solve: pre-flight results, stream events, and reports from an
  // earlier solve are ignored once a new one starts.
  const solveToken = useRef(0);
  const waitingPreflight = useRef<{
    payload: MethodsPayload;
    token: number;
    options: PreflightOptions;
  } | null>(null);
  // What async handlers read after an await, where state would be stale.
  const current = useRef<{
    methods: MethodSummary[];
    cacheKey: string | null;
    selectedId: string | null;
    base: Solution | null;
    /** The method the open solve stream is explaining, until the stream ends. */
    streamMethodId: string | null;
  }>({
    methods: initial?.methods ?? NO_METHODS,
    cacheKey: initial?.cacheKey ?? null,
    selectedId: initial?.selectedMethodId ?? null,
    base: initial?.base ?? null,
    streamMethodId: null,
  });
  // Explanations that arrived, by method, so switching back is instant.
  const explained = useRef(new Map<string, Solution>(initial?.explanations));
  // Where this solve's time goes, as the student experiences it (no UI).
  const timer = useRef<SolveTimer | null>(null);
  const busy = loading || sampleLoading;
  const [originalOpen, setOriginalOpen] = useState(false);
  const { containerRef, split, isDragging, separatorProps } = useSolverSplit();
  // Only techniques whose rows ran cleanly in the hidden Desmos instance.
  const listed = useMemo(
    () => selectorMethods(methods, verdicts),
    [methods, verdicts],
  );

  useEffect(
    () => () => {
      if (image && !userId) URL.revokeObjectURL(image.url);
    },
    [image, userId],
  );
  useEffect(() => {
    if (!userId) return;
    const ready = !loading && explanationStatus === "ready";
    drafts.write(userId, {
      image,
      inputMode,
      problemText,
      solution: ready ? solution : null,
      methods: ready ? methods : NO_METHODS,
      verdicts: ready ? verdicts : {},
      selectedMethodId: ready ? selectedMethodId : null,
      problemId,
      cacheKey: ready ? cacheKey : null,
      revision,
      base: ready ? current.current.base : null,
      explanations: ready ? [...explained.current] : [],
    });
  }, [
    userId,
    image,
    inputMode,
    problemText,
    solution,
    methods,
    verdicts,
    selectedMethodId,
    problemId,
    cacheKey,
    revision,
    loading,
    explanationStatus,
  ]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => () => switchRequest.current?.abort(), []);

  useEffect(() => {
    if (cooldownUntil === null) return;
    const interval = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((cooldownUntil - Date.now()) / 1000),
      );
      setCooldownSeconds(remaining);
      if (remaining === 0) setCooldownUntil(null);
    }, 250);
    return () => window.clearInterval(interval);
  }, [cooldownUntil]);

  const resetResult = useCallback(() => {
    waitingPreflight.current = null;
    setAwaitingCalculator(false);
    solveToken.current += 1;
    switchToken.current += 1;
    switchRequest.current?.abort();
    current.current = {
      methods: NO_METHODS,
      cacheKey: null,
      selectedId: null,
      base: null,
      streamMethodId: null,
    };
    explained.current = new Map();
    setSolution(null);
    setMethods(NO_METHODS);
    setVerdicts({});
    setSelectedMethodId(null);
    setExplanationStatus("ready");
    setProblemId(null);
    setCacheKey(null);
    setHistoryWarning(null);
  }, []);

  const selectFile = useCallback(
    (file: File) => {
      if (!ACCEPTED_IMAGE_TYPES.some((type) => type === file.type)) {
        setError("Choose a PNG, JPG, or WebP screenshot.");
        return;
      }
      if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
        setError("Choose a screenshot smaller than 8 MB that is not empty.");
        return;
      }
      setImage({ file, url: URL.createObjectURL(file) });
      setInputMode("image");
      setOriginalOpen(false);
      setMobilePanel("solution");
      resetResult();
      setError(null);
      setRevision((value) => value + 1);
    },
    [resetResult],
  );

  useEffect(() => {
    const pasteImage = (event: ClipboardEvent) => {
      if (busy || event.defaultPrevented) return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          "input:not([type=file]), textarea, [contenteditable]:not([contenteditable=false]), [role=textbox], .dcg-container",
        )
      )
        return;
      const files = Array.from(event.clipboardData?.files ?? []).filter(
        (item) => item.type.startsWith("image/"),
      );
      const file =
        files[0] ??
        Array.from(event.clipboardData?.items ?? [])
          .find(
            (item) => item.kind === "file" && item.type.startsWith("image/"),
          )
          ?.getAsFile();
      if (!file) return;
      event.preventDefault();
      if (files.length > 1)
        setError(
          "Upload one image at a time, with one complete math question.",
        );
      else selectFile(file);
    };
    window.addEventListener("paste", pasteImage);
    return () => window.removeEventListener("paste", pasteImage);
  }, [busy, selectFile]);

  async function loadSample() {
    setSampleLoading(true);
    setError(null);
    try {
      const response = await fetch("/sample-question.png");
      if (!response.ok)
        throw new Error(
          "The sample could not be loaded. Upload your own screenshot instead.",
        );
      selectFile(
        new File([await response.blob()], "sample-question.png", {
          type: "image/png",
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not load the sample question.",
      );
    } finally {
      setSampleLoading(false);
    }
  }

  /**
   * Shows a technique that passed pre-flight. Its rows and answer come from
   * the methods already on hand, so the calculator swaps (or clears, for a
   * technique with no rows) at once. Only the default's explanation is written
   * up front; any other technique's is requested now, the first time it is
   * chosen, and kept, so choosing it again is instant with no request.
   */
  function showMethod(method: MethodSummary) {
    const base = current.current.base;
    if (!base) return;
    const ready = explained.current.get(method.id);
    current.current.selectedId = method.id;
    setSelectedMethodId(method.id);
    setSolution(ready ?? provisionalSolution(base, method));
    setExplanationStatus(ready ? "ready" : "pending");
    setRevision((value) => value + 1);
    if (!ready && method.id !== current.current.streamMethodId)
      void fetchExplanation(method.id);
  }

  /**
   * Generates (or reads the server's cached copy of) one technique's
   * explanation. Any failure, including an HTTP error, a lost connection, or
   * the one-line fallback summary, leaves the rows and answer in place and
   * turns the explanation panel into a retry; it is never swallowed.
   */
  async function fetchExplanation(methodId: string) {
    const key = current.current.cacheKey;
    if (!key) return;
    switchRequest.current?.abort();
    const controller = new AbortController();
    switchRequest.current = controller;
    const token = ++switchToken.current;
    let delivered: Solution | null = null;
    try {
      const response = await fetch("/api/solve/method", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: NDJSON },
        body: JSON.stringify({ cacheKey: key, methodId }),
        signal: controller.signal,
      });
      if (response.ok && response.body) {
        const events: unknown[] = [];
        for await (const event of readNdjsonEvents(decodeBody(response.body))) {
          if (switchToken.current !== token) return;
          events.push(event);
        }
        delivered = explanationFromEvents(events);
      }
    } catch {
      // Handled below: a newer request superseded this one, or it failed.
    }
    if (switchToken.current !== token) return;
    if (switchRequest.current === controller) switchRequest.current = null;
    if (delivered) explained.current.set(methodId, delivered);
    if (current.current.selectedId !== methodId) return;
    if (delivered) setSolution(delivered);
    setExplanationStatus(delivered ? "ready" : "failed");
  }

  function retryExplanation() {
    const methodId = current.current.selectedId;
    if (!methodId) return;
    setExplanationStatus("pending");
    void fetchExplanation(methodId);
  }

  async function sendReport(
    key: string,
    reports: ReportedVerdict[],
  ): Promise<PreflightReply | null> {
    try {
      const response = await fetch("/api/solve/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cacheKey: key, verdicts: reports }),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 422)
        return {
          status: "failed",
          error: typeof data?.error === "string" ? data.error : HONEST_FAILURE,
        };
      const payload = response.ok ? parseMethodsPayload(data) : null;
      return payload && (data.status === "ready" || data.status === "retry")
        ? { status: data.status, payload }
        : null;
    } catch {
      return null;
    }
  }

  /** Nothing can honestly be shown: say so, and show no rows at all. */
  function fail(message: string) {
    resetResult();
    request.current?.abort();
    setLoading(false);
    setError(message);
  }

  /**
   * The pre-flight gate for one solve. Techniques are checked in rank order in
   * a hidden Desmos instance; the first whose every row runs cleanly is shown
   * (one check when the winner is clean), and a technique with any erroring
   * row is never shown or listed. Every result is reported so later solves of
   * this problem reuse it. When every technique errors, the server retries
   * call 1 once with the Desmos errors attached; if that fails too, this is an
   * honest failure with no rows.
   */
  async function runPreflight(
    payload: MethodsPayload,
    token: number,
    options: PreflightOptions = {},
  ) {
    waitingPreflight.current = null;
    setAwaitingCalculator(false);
    current.current = {
      ...current.current,
      methods: payload.methods,
      cacheKey: payload.cacheKey,
      base: baseSolution(payload),
      streamMethodId:
        options.retried || options.distrust
          ? null
          : options.resuming
            ? current.current.streamMethodId
            : payload.selectedMethodId,
    };
    setMethods(payload.methods);
    setCacheKey(payload.cacheKey);
    setVerdicts({});
    const reports: ReportedVerdict[] = [];
    const run = await preflightInRankOrder(payload.methods, preflight, {
      trusted: (method) => !options.distrust && method.verified,
      isCancelled: () => solveToken.current !== token,
      onVerdict: (method, verdict, checked) => {
        setVerdicts((previous) => ({
          ...previous,
          [method.id]: verdict.status,
        }));
        const report = checked ? reportable(method.id, verdict) : null;
        if (report) reports.push(report);
      },
      onPromote: (method) => {
        setLoading(false);
        timer.current?.mark("rows_shown");
        showMethod(method);
        if (method.verified && !options.distrust && method.rows.length > 0)
          void confirmCached(method, payload, token);
      },
    }).catch(() => null);
    if (solveToken.current !== token) return;
    const waitForCalculator = () => {
      // Keep the already-generated methods and any streamed explanation. A
      // CDN failure must not turn reconnecting into another paid solve.
      waitingPreflight.current = { payload, token, options };
      setAwaitingCalculator(true);
      setLoading(false);
      setError(UNVERIFIED);
    };
    if (!run) return waitForCalculator();
    if (run.promoted) {
      if (reports.length > 0) void sendReport(payload.cacheKey, reports);
      return;
    }
    const everyMethodErrored = payload.methods.every(
      (method) => run.verdicts.get(method.id)?.status === "error",
    );
    if (!everyMethodErrored) {
      if (reports.length > 0) void sendReport(payload.cacheKey, reports);
      return waitForCalculator();
    }
    const reply = await sendReport(payload.cacheKey, reports);
    if (solveToken.current !== token) return;
    if (reply?.status === "retry" && !options.retried) {
      // The stream was explaining a method that errored; the retry's methods replace it.
      request.current?.abort();
      explained.current = new Map();
      return runPreflight(reply.payload, token, { retried: true });
    }
    fail(reply?.status === "failed" ? reply.error : HONEST_FAILURE);
  }

  function resumeCalculatorCheck() {
    const waiting = waitingPreflight.current;
    if (!waiting || solveToken.current !== waiting.token) return;
    waitingPreflight.current = null;
    setError(null);
    setLoading(true);
    void runPreflight(waiting.payload, waiting.token, {
      ...waiting.options,
      resuming: true,
    });
  }

  async function retryCalculatorCheck() {
    const waiting = waitingPreflight.current;
    if (!waiting || solveToken.current !== waiting.token) return;
    setLoading(true);
    setError(null);
    try {
      await loadDesmos();
      // Loading can itself announce readiness; resume once per pending batch.
      if (waitingPreflight.current === waiting) resumeCalculatorCheck();
    } catch {
      if (solveToken.current !== waiting.token) return;
      setLoading(false);
      setError(UNVERIFIED);
    }
  }

  // Refresh this listener with the current handlers after each render. A
  // reconnect resumes only the still-current solve, never a discarded one.
  useEffect(() => {
    window.addEventListener(DESMOS_READY_EVENT, resumeCalculatorCheck);
    return () =>
      window.removeEventListener(DESMOS_READY_EVENT, resumeCalculatorCheck);
  });

  /**
   * A method the server's cache marked verified is shown without a
   * selection-time check, but the rendering gate still checks it. If this
   * browser's Desmos disagrees, it is reported and never shown, and the rest
   * are re-checked here instead of trusting the cache.
   */
  async function confirmCached(
    method: MethodSummary,
    payload: MethodsPayload,
    token: number,
  ) {
    const verdict = await preflight(
      calculatorPayload(method.rows, method.answerState),
    ).catch(() => null);
    if (solveToken.current !== token || verdict?.status !== "error") return;
    void sendReport(payload.cacheKey, [
      { methodId: method.id, status: "error", errors: verdict.errors },
    ]);
    explained.current.delete(method.id);
    setLoading(true);
    setSolution(null);
    await runPreflight(
      {
        ...payload,
        methods: payload.methods.filter((item) => item.id !== method.id),
      },
      token,
      { distrust: true },
    );
  }

  function handleStreamSolution(event: Record<string, unknown>) {
    if (typeof event.problemId === "string") setProblemId(event.problemId);
    if (typeof event.historyWarning === "string")
      setHistoryWarning(event.historyWarning);
    current.current.streamMethodId = null;
    const parsed = solutionSchema.safeParse(event.solution);
    if (!parsed.success) return;
    if (parsed.data.status === "needs_clarification") {
      setLoading(false);
      setSolution(parsed.data);
      return;
    }
    const methodId = typeof event.methodId === "string" ? event.methodId : null;
    if (!methodId) return;
    // The default's explanation is written during the solve; a fallback
    // summary means it failed, so the panel offers a retry instead.
    const delivered = explanationFromEvents([event]);
    if (delivered) explained.current.set(methodId, delivered);
    if (current.current.selectedId !== methodId) return;
    if (delivered) setSolution(delivered);
    setExplanationStatus(delivered ? "ready" : "failed");
  }

  async function solve() {
    if (!hasInput || busy || request.current || cooldownSeconds > 0) return;
    const controller = new AbortController();
    request.current = controller;
    let timedOut = false;
    // Leave room for the server's 180 s route limit to return its own error.
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 195_000);
    resetResult();
    const token = solveToken.current;
    timer.current = startSolveTiming();
    setLoading(true);
    setError(null);
    setNotice(null);
    setNeedsSignIn(false);
    setRevision((value) => value + 1);
    try {
      const form = new FormData();
      if (inputMode === "image" && image) form.append("image", image.file);
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: {
          Accept: NDJSON,
          ...(inputMode === "text"
            ? { "Content-Type": "application/json" }
            : {}),
        },
        body:
          inputMode === "text"
            ? JSON.stringify({ problem: problemText.trim() })
            : form,
        signal: controller.signal,
      });
      timer.current?.mark("response");
      timer.current?.serverTiming(response.headers.get("server-timing"));
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (response.status === 401) setNeedsSignIn(true);
        // Waiting a few seconds does not help either limit, so no countdown;
        // history and already-solved problems stay available.
        if (
          (data?.kind === "daily_cap" || data?.kind === "at_capacity") &&
          typeof data.error === "string"
        ) {
          setNotice(data.error);
          return;
        }
        const wait = retryCountdown(
          response.status,
          data,
          response.headers.get("Retry-After"),
        );
        if (wait !== null) {
          setCooldownSeconds(wait);
          setCooldownUntil(Date.now() + wait * 1000);
        }
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : response.status === 413
              ? // The host refused the upload before the app saw it (on Vercel, over 4.5 MB).
                "That screenshot is too large to upload. Crop it to the question or export a smaller image."
              : "The solver could not finish. Please try again.",
        );
      }
      if (!response.body)
        throw new Error(
          "The solver returned an empty response. Please try again.",
        );
      // Rows arrive with the "methods" event and go through pre-flight while
      // the server writes the explanation; the "solution" event fills it in.
      let sawResult = false;
      for await (const event of readNdjsonEvents(decodeBody(response.body))) {
        if (solveToken.current !== token) break;
        if (!isEvent(event)) continue;
        if (event.type === "methods") {
          timer.current?.mark("methods");
          const payload = parseMethodsPayload(event);
          if (!payload)
            throw new Error(
              "The solver returned an invalid response. Please try again.",
            );
          sawResult = true;
          void runPreflight(payload, token);
        } else if (event.type === "solution") {
          sawResult = true;
          timer.current?.mark("explanation");
          handleStreamSolution(event);
        } else if (event.type === "saved") {
          // History is written after the explanation is sent, so it never delays it.
          if (typeof event.problemId === "string")
            setProblemId(event.problemId);
          if (typeof event.historyWarning === "string")
            setHistoryWarning(event.historyWarning);
        } else if (event.type === "error") {
          if (!sawResult)
            throw new Error(
              typeof event.error === "string"
                ? event.error
                : "The solver could not finish. Please try again.",
            );
          current.current.streamMethodId = null;
          const selected = current.current.selectedId;
          if (selected && !explained.current.has(selected))
            setExplanationStatus("failed");
        }
      }
      if (!sawResult && solveToken.current === token)
        throw new Error(
          "The solver returned an invalid response. Please try again.",
        );
      if (solveToken.current === token) timer.current?.finish();
    } catch (cause) {
      if (!controller.signal.aborted)
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not connect to the solver. Please try again.",
        );
      else if (timedOut)
        setError("This took too long. Check the question and try again.");
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) {
        request.current = null;
        // Pre-flight may still be choosing what to show; it ends loading itself.
        if (
          solveToken.current !== token ||
          current.current.selectedId ||
          !current.current.methods.length
        )
          setLoading(false);
      }
    }
  }

  const clearImage = useCallback(() => {
    setImage(null);
    setProblemText("");
    resetResult();
    setError(null);
    setRevision((value) => value + 1);
    if (fileInput.current) fileInput.current.value = "";
  }, [resetResult]);

  // "New problem" in the sidebar, or N: cancel any solve and clear the workspace in place.
  useEffect(() => {
    const startOver = () => {
      request.current?.abort();
      clearImage();
      setMobilePanel("solution");
    };
    const onKey = (event: KeyboardEvent) => {
      if (!isNewProblemShortcut(event)) return;
      event.preventDefault();
      startOver();
    };
    window.addEventListener(NEW_PROBLEM_EVENT, startOver);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(NEW_PROBLEM_EVENT, startOver);
      window.removeEventListener("keydown", onKey);
    };
  }, [clearImage]);

  useEffect(() => {
    const show = () => setMobilePanel("calculator");
    window.addEventListener(SHOW_CALCULATOR_EVENT, show);
    return () => window.removeEventListener(SHOW_CALCULATOR_EVENT, show);
  }, []);

  function switchTechnique(methodId: string) {
    if (methodId === current.current.selectedId) return;
    const method = listed.find((item) => item.id === methodId);
    if (method) showMethod(method);
  }

  function panelKey(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    setMobilePanel(next === 0 ? "solution" : "calculator");
    event.currentTarget.parentElement
      ?.querySelectorAll("button")
      [next]?.focus();
  }
  return (
    <WorkspaceAppearance className={`${styles.shell} ${fontClassName}`}>
      <header className={styles.header}>{accountNav}</header>
      <div
        className={styles.mobilePanels}
        data-workspace-panels
      >
        <div className="segmentedControl workspacePanelSwitch"
        role="tablist"
        aria-label="Workspace panels"
      >
        <button
          id="steps-tab"
          type="button"
          role="tab"
          className="choiceControl"
          aria-selected={mobilePanel === "solution"}
          tabIndex={mobilePanel === "solution" ? 0 : -1}
          aria-controls="question-panel"
          onKeyDown={(event) => panelKey(event, 0)}
          onClick={() => setMobilePanel("solution")}
        >
          <List size={18} />
          Steps
        </button>
        <button
          id="calculator-tab"
          type="button"
          role="tab"
          className="choiceControl"
          aria-selected={mobilePanel === "calculator"}
          tabIndex={mobilePanel === "calculator" ? 0 : -1}
          aria-controls="calculator-panel"
          onKeyDown={(event) => panelKey(event, 1)}
          onClick={() => setMobilePanel("calculator")}
        >
          <ScanLine size={18} />
          Calculator
        </button>
        </div>
      </div>
      <main className={styles.main}>
        <h1 className={styles.srOnly}>SAT Math solver</h1>
        <CalculatorVerificationProvider>
          <div
            className={styles.workspace}
            ref={(node) => {
              containerRef.current = node;
            }}
            data-mobile-panel={mobilePanel}
            data-empty={(!solution && !loading) || undefined}
            data-dragging={isDragging}
            style={{ "--solution-width": `${split}%` } as CSSProperties}
          >
            <div
              className={styles.questionSolutionPanel}
              id="question-panel"
              aria-label="Guided solution"
            >
              <section
                className={styles.uploadCard}
                aria-labelledby="upload-title"
              >
                <input
                  ref={fileInput}
                  id="question-image"
                  className={styles.srOnly}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) selectFile(file);
                    event.target.value = "";
                  }}
                />
                {solution ? (
                  <>
                    <div className={styles.summaryHeading}>
                      <h2 id="upload-title">Your problem</h2>
                      <button
                        type="button"
                        className="outlinedControl replaceControl"
                        onClick={() => {
                          if (inputMode === "image") clearImage();
                          else {
                            resetResult();
                            setError(null);
                            setRevision((value) => value + 1);
                            requestAnimationFrame(() =>
                              textInput.current?.focus(),
                            );
                          }
                        }}
                        disabled={busy}
                      >
                        {inputMode === "text" ? "Edit question" : "Replace"}{" "}
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                    <div className={styles.compactQuestion}>
                      <MathText>
                        {solution.question || "Your uploaded question"}
                      </MathText>
                    </div>
                    {inputMode === "text" ? (
                      <>
                        <button
                          type="button"
                          className={`${styles.originalToggle} textControl`}
                          aria-expanded={originalOpen}
                          onClick={() => setOriginalOpen((value) => !value)}
                        >
                          <FileText size={15} />
                          {originalOpen
                            ? "Hide original text"
                            : "View original text"}
                          <ChevronDown size={15} />
                        </button>
                        {originalOpen && (
                          <pre className={styles.originalText}>
                            {problemText.trim()}
                          </pre>
                        )}
                      </>
                    ) : (
                      image && (
                        <>
                          <button
                            type="button"
                            className={`${styles.originalToggle} textControl`}
                            aria-expanded={originalOpen}
                            aria-controls="original-image"
                            onClick={() => setOriginalOpen((value) => !value)}
                          >
                            <FileImage size={15} />
                            {originalOpen
                              ? "Hide original question"
                              : "View original question"}
                            <ChevronDown size={15} />
                          </button>
                          {originalOpen && (
                            <div
                              id="original-image"
                              className={styles.originalImage}
                            >
                              <Image
                                src={image.url}
                                width={900}
                                height={600}
                                unoptimized
                                alt="Your uploaded math question"
                              />
                              <button
                                type="button"
                                className="textControl"
                                ref={viewImageButton}
                                onClick={() => imageDialog.current?.showModal()}
                              >
                                Open full-size image <ArrowUpRight size={13} />
                              </button>
                            </div>
                          )}
                        </>
                      )
                    )}
                  </>
                ) : (
                  <>
                    <header className={styles.uploadHeading}>
                      <h2 id="upload-title">New problem</h2>
                      <p>Upload a screenshot or type your question.</p>
                    </header>
                    <div
                      className={`${styles.inputModes} segmentedControl`}
                      role="group"
                      aria-label="Problem input type"
                    >
                      <button
                        type="button"
                        className="choiceControl"
                        aria-pressed={inputMode === "image"}
                        disabled={busy}
                        onClick={() => {
                          setInputMode("image");
                          resetResult();
                          setError(null);
                        }}
                      >
                        <ImageIcon size={16} /> Image
                      </button>
                      <button
                        type="button"
                        className="choiceControl"
                        aria-pressed={inputMode === "text"}
                        disabled={busy}
                        onClick={() => {
                          setInputMode("text");
                          resetResult();
                          setError(null);
                        }}
                      >
                        <FileText size={16} /> Type a problem
                      </button>
                    </div>
                    {inputMode === "text" ? (
                      <div className={styles.textEntry}>
                        <label htmlFor="problem-text">Your question</label>
                        <textarea
                          id="problem-text"
                          ref={textInput}
                          className={`${styles.problemText} appField`}
                          value={problemText}
                          disabled={busy}
                          rows={8}
                          maxLength={MAX_PROBLEM_TEXT_LENGTH}
                          spellCheck={false}
                          autoCapitalize="off"
                          aria-describedby="problem-text-help"
                          placeholder={
                            "Example: y = x^2 − 4x + 1 and y = 2x + 8.\n\nWhat is the positive x-coordinate where the graphs intersect?"
                          }
                          onChange={(event) => {
                            setProblemText(event.target.value);
                            if (methods.length || awaitingCalculator)
                              resetResult();
                            setError(null);
                          }}
                          onKeyDown={(event) => {
                            if (
                              (event.metaKey || event.ctrlKey) &&
                              event.key === "Enter" &&
                              !busy &&
                              !needsSignIn &&
                              cooldownSeconds === 0
                            ) {
                              event.preventDefault();
                              if (awaitingCalculator) retryCalculatorCheck();
                              else void solve();
                            }
                          }}
                        />
                        <div className={styles.textEntryHelp}>
                          <p id="problem-text-help">
                            Include any answer choices. Use ^ for powers, like
                            x^2.
                          </p>
                          <span>
                            {problemText.length.toLocaleString()} / 6,000
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={`${styles.uploadZone} ${image ? styles.hasImage : ""} ${dragging ? styles.dragging : ""} ${busy ? styles.uploadDisabled : ""}`}
                        role="group"
                        aria-label="Question image upload"
                        aria-describedby="paste-help"
                        tabIndex={0}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (!busy) setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setDragging(false);
                          if (!busy && event.dataTransfer.files.length > 1)
                            setError(
                              "Upload one image at a time, with one complete math question.",
                            );
                          else if (!busy && event.dataTransfer.files[0])
                            selectFile(event.dataTransfer.files[0]);
                        }}
                      >
                        {image ? (
                          <>
                            <Image
                              src={image.url}
                              width={900}
                              height={600}
                              unoptimized
                              alt="Your uploaded math question"
                              className={styles.preview}
                            />
                            <div className={styles.fileDetails}>
                              <span>{image.file.name}</span>
                              <button
                                type="button"
                                className="textControl dangerControl"
                                onClick={clearImage}
                                disabled={busy}
                                aria-label="Remove uploaded image"
                              >
                                Remove
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className={styles.uploadIcon}>
                              <Upload size={27} strokeWidth={1.8} />
                            </span>
                            <strong>Drop your question here</strong>
                            <p>A clear screenshot works best.</p>
                          </>
                        )}
                        <button
                          type="button"
                          className="secondaryButton"
                          onClick={() => fileInput.current?.click()}
                          disabled={busy}
                        >
                          <ImageIcon size={17} />
                          {image ? "Replace image" : "Choose image"}
                        </button>
                        <small>PNG, JPG, or WebP · up to 8 MB</small>
                        <small id="paste-help">
                          Paste an image with ⌘V or Ctrl+V
                        </small>
                      </div>
                    )}
                    {(inputMode === "text" || image) && (
                      <button
                        type="button"
                        className={`${styles.solveButton} primaryButton`}
                        disabled={
                          !hasInput ||
                          busy ||
                          cooldownSeconds > 0 ||
                          needsSignIn
                        }
                        onClick={
                          awaitingCalculator ? retryCalculatorCheck : solve
                        }
                      >
                        {loading ? (
                          <>
                            <span className={styles.spinner} /> Solving…
                          </>
                        ) : cooldownSeconds > 0 ? (
                          `Try again in ${cooldownSeconds}s`
                        ) : (
                          <>
                            {awaitingCalculator
                              ? "Retry calculator"
                              : error
                                ? "Try again"
                                : "Solve"}
                            <ArrowIcon />
                          </>
                        )}
                      </button>
                    )}
                    {loading && (
                      <div className={styles.cancelRow}>
                        <button
                          type="button"
                          className={`${styles.textButton} textControl`}
                          onClick={() => request.current?.abort()}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                    {!hasInput && (
                      <section className={styles.sampleSection}>
                        <div>
                          <h3>Try a sample question</h3>
                          <p>Explore how a Desmos method works.</p>
                        </div>
                        <button
                          type="button"
                          className="primaryButton"
                          onClick={loadSample}
                          disabled={busy}
                        >
                          {sampleLoading ? "Loading…" : "Use sample"}
                          <ArrowRight size={18} />
                        </button>
                      </section>
                    )}
                  </>
                )}
                {notice && (
                  <p
                    className={styles.limitNotice}
                    role="status"
                    data-testid="limit-notice"
                  >
                    {notice} <Link href="/history">Open your history</Link>
                  </p>
                )}
                {(error || needsSignIn) && (
                  <div className={styles.error} role="alert">
                    {error || "Your session expired"}
                    {needsSignIn && (
                      <>
                        {" "}
                        <Link href="/login?next=%2Fsolve">
                          Sign in to continue
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </section>
              {(solution || loading) && (
                <section
                  className={styles.resultCard}
                  aria-labelledby="result-title"
                  aria-busy={loading}
                  id="explanation-panel"
                >
                  <hr
                    className={styles.problemDivider}
                    aria-label="Problem and solution"
                  />
                  <h2 id="result-title" className={styles.solutionLabel}>
                    Your solution
                  </h2>
                  {loading ? (
                    <div className={styles.loadingState} role="status">
                      <span className={styles.spinner} />
                      <p>Reading your question and checking a Desmos method…</p>
                    </div>
                  ) : (
                    solution && (
                      <>
                        <SolutionExplanation
                          solution={solution}
                          techniqueSelector={
                            listed.length > 0 && selectedMethodId ? (
                              <TechniqueSelector
                                methods={listed}
                                selectedId={selectedMethodId}
                                onSelect={switchTechnique}
                              />
                            ) : undefined
                          }
                          explanationStatus={explanationStatus}
                          onRetryExplanation={retryExplanation}
                          tutorSource={
                            solution.status === "solved" &&
                            cacheKey &&
                            selectedMethodId
                              ? {
                                  kind: "solve",
                                  cacheKey,
                                  methodId: selectedMethodId,
                                }
                              : undefined
                          }
                        />
                        {problemId && (
                          <p className={styles.savedNotice} role="status">
                            Saved to{" "}
                            <Link
                              href={`/history/${encodeURIComponent(problemId)}`}
                            >
                              your history
                            </Link>
                          </p>
                        )}
                        {historyWarning && (
                          <p className={styles.error} role="status">
                            {historyWarning}
                          </p>
                        )}
                      </>
                    )
                  )}
                </section>
              )}
            </div>
            <div className={styles.paneDivider} {...separatorProps}>
              <span aria-hidden="true" />
            </div>
            <section
              className={styles.calculatorCard}
              aria-label="Desmos calculator"
              id="calculator-panel"
            >
              <DesmosCalculator
                expressions={
                  solution?.status === "solved"
                    ? solution.expressions
                    : NO_EXPRESSIONS
                }
                bounds={
                  solution?.status === "solved" ? solution.graphBounds : null
                }
                answerState={
                  solution?.status === "solved" ? solution.answerState : null
                }
                revision={revision}
                stateKey={
                  userId && cacheKey && selectedMethodId
                    ? `${userId}:${cacheKey}:${selectedMethodId}:${revision}`
                    : undefined
                }
              />
            </section>
          </div>
        </CalculatorVerificationProvider>
      </main>
      {image && (
        <dialog
          ref={imageDialog}
          className={styles.imageDialog}
          aria-labelledby="question-preview-title"
          onClose={() => {
            setImageZoomed(false);
            viewImageButton.current?.focus();
          }}
          onClick={(event) => {
            if (event.target === imageDialog.current)
              imageDialog.current?.close();
          }}
        >
          <div className={styles.imageDialogHeading}>
            <h2 id="question-preview-title">Your question</h2>
            <div>
              <button
                type="button"
                className="secondaryButton"
                aria-pressed={imageZoomed}
                onClick={() => setImageZoomed((value) => !value)}
              >
                {imageZoomed ? "Fit to screen" : "Zoom in"}
              </button>
              <button
                type="button"
                className="secondaryButton"
                onClick={() => imageDialog.current?.close()}
              >
                Close
              </button>
            </div>
          </div>
          <div className={styles.imageDialogBody}>
            <Image
              src={image.url}
              width={1200}
              height={900}
              unoptimized
              alt="Your uploaded math question, enlarged"
              className={`${styles.largePreview} ${imageZoomed ? styles.zoomedPreview : ""}`}
            />
          </div>
        </dialog>
      )}
    </WorkspaceAppearance>
  );
}
