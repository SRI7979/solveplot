"use client";

import { useEffect, useRef, useState } from "react";
import { List, RotateCcw } from "lucide-react";
import type { RowEvaluation } from "@/lib/answer-consistency";
import {
  MATH_OPTIONS,
  type DesmosCalculatorInstance,
} from "@/lib/desmos-engine";
import {
  ROW_ID_PREFIX,
  verdictFromAnalysis,
  type DesmosAnalysis,
} from "@/lib/desmos-preflight";
import { DESMOS_READY_EVENT, loadDesmos } from "@/lib/desmos-loader";
import type { AnswerState } from "@/lib/solver-schema";
import {
  expressionsKey,
  usePublishCalculatorRows,
  useCalculatorTrace,
  type CalculatorRows,
} from "./calculator-verification";
import { recordVisibleError, usePreflightGate } from "./preflight-gate";
import styles from "./desmos-calculator.module.css";

type Bounds = { left: number; right: number; bottom: number; top: number };

type DesmosInstance = DesmosCalculatorInstance & {
  selectedExpressionId?: string;
  setSelectedExpressionId?: (id: string) => void;
  getState?: () => unknown;
  setState?: (state: unknown) => void;
};

type Props = {
  expressions: Array<{
    latex: string;
    purpose: string;
    slider?: { min: number; max: number; step: number } | null;
  }>;
  bounds: Bounds | null;
  revision: number;
  /** Moves this parameter's slider to this value before the student sees it. */
  answerState?: AnswerState | null;
  stateKey?: string;
  initialExpressionsOpen?: boolean;
};

const graphDrafts = new Map<string, unknown>();
function retainGraph(key: string, state: unknown) {
  graphDrafts.delete(key);
  graphDrafts.set(key, state);
  if (graphDrafts.size > 24)
    graphDrafts.delete(graphDrafts.keys().next().value!);
}

const defaultBounds: Bounds = { left: -10, right: 10, bottom: -10, top: 10 };

const rowIdPattern = new RegExp(`^${ROW_ID_PREFIX}(\\d+)$`);

/** The rows this component inserted, as Desmos currently holds them. */
function loadedRows(instance: DesmosInstance): string {
  return instance
    .getExpressions()
    .filter((item) => item.id && rowIdPattern.test(item.id))
    .map((item) => `${item.id}=${item.latex ?? ""}`)
    .join("\n");
}

/** Collects what Desmos computed for the rows this component inserted. */
function collectRows(analysis: DesmosAnalysis, key: string): CalculatorRows {
  const rows: CalculatorRows["rows"] = {};
  for (const [id, item] of Object.entries(analysis)) {
    const match = id.match(rowIdPattern);
    if (!match || !item) continue;
    const evaluation = item.evaluation as RowEvaluation | undefined;
    rows[Number(match[1])] = {
      isError: Boolean(item.isError),
      evaluation:
        evaluation?.type === "Number" && Number.isFinite(evaluation.value)
          ? { type: "Number", value: evaluation.value }
          : evaluation?.type === "ListOfNumber" &&
              Array.isArray(evaluation.value)
            ? { type: "ListOfNumber", value: [...evaluation.value] }
            : null,
    };
  }
  return { key, rows };
}

function validBounds(bounds: Bounds | null): Bounds {
  return bounds &&
    Object.values(bounds).every(Number.isFinite) &&
    bounds.left < bounds.right &&
    bounds.bottom < bounds.top
    ? bounds
    : defaultBounds;
}

export default function DesmosCalculator({
  expressions,
  bounds,
  revision,
  answerState = null,
  stateKey,
  initialExpressionsOpen = false,
}: Props) {
  const graphKey = useRef(stateKey);
  useEffect(() => {
    graphKey.current = stateKey;
  }, [stateKey]);
  const containerRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<DesmosInstance | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expressionError, setExpressionError] = useState(false);
  const [entriesEdited, setEntriesEdited] = useState(false);
  const [replay, setReplay] = useState(0);
  const [lineCount, setLineCount] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [expressionsOpen, setExpressionsOpen] = useState(initialExpressionsOpen);
  const expressionsOpenRef = useRef(expressionsOpen);
  useEffect(() => {
    expressionsOpenRef.current = expressionsOpen;
  }, [expressionsOpen]);
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  // Rows this component pulled after the visible calculator flagged them.
  const [blockedKey, setBlockedKey] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY?.trim();
  const publishRows = usePublishCalculatorRows();
  const { selection, select, traceId } = useCalculatorTrace();
  // The batch is built exactly as the hidden pre-flight instance received it
  // (normalized LaTeX, the slider at the answer state), and it is inserted
  // only once that instance reported every row clean. Nothing that errors in
  // Desmos is ever shown; an older saved method that no longer runs is
  // hidden with an explanation instead.
  const { payload, gate } = usePreflightGate(expressions, answerState);
  const blocked = blockedKey === payload.key;
  const insertable = gate.status === "clean" && !blocked;
  // The analysis observer is registered once; it reads the latest batch here.
  // Once the student edits a loaded row, its values no longer describe the
  // explanation, so verification stops until the entries are restored.
  const loaded = useRef<{
    key: string;
    rows: string;
    payloadKey: string;
    ids: string[];
  } | null>(null);

  useEffect(() => {
    // Preflight or the workspace retry can reconnect independently after this
    // component's first attempt failed. Reuse that API without remounting an
    // already running calculator or touching its equations and viewport.
    const ready = () => {
      if (!window.Desmos?.GraphingCalculator) return;
      setError(null);
      setScriptReady(true);
    };
    window.addEventListener(DESMOS_READY_EVENT, ready);
    return () => window.removeEventListener(DESMOS_READY_EVENT, ready);
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    let active = true;
    loadDesmos().then(
      () => {
        if (!active) return;
        setError(null);
        setScriptReady(true);
        // Also covers an API that finished after a previous timeout, before the
        // retry. Cached API readiness still needs to wake unverified gates.
        window.dispatchEvent(new Event(DESMOS_READY_EVENT));
      },
      () => {
        if (active)
          setError(
            "Desmos could not connect. Check your connection and try again.",
          );
      },
    );
    return () => {
      active = false;
    };
  }, [apiKey, loadAttempt]);

  useEffect(() => {
    if (!scriptReady || !containerRef.current) return;

    let active = true;
    let observer: ResizeObserver | undefined;
    let instance: DesmosInstance | undefined;

    try {
      if (!window.Desmos) throw new Error("Desmos did not initialize");
      instance = window.Desmos.GraphingCalculator(containerRef.current, {
        ...MATH_OPTIONS,
        autosize: false,
        expressions: true,
        expressionsCollapsed: true,
        settingsMenu: true,
        keypad: true,
        fontSize: 17,
        invertedColors: false,
      });
      calculatorRef.current = instance;
      instance.observe("selectedExpressionId.trace", () => {
        const batch = loaded.current;
        // Keep the last traced row when focus moves into its explanation.
        // A different/user-created row still clears the link below.
        if (!instance?.selectedExpressionId) return;
        const match = instance?.selectedExpressionId?.match(rowIdPattern);
        select(
          batch && instance && loadedRows(instance) === batch.rows && match
            ? { key: batch.key, row: Number(match[1]) }
            : null,
        );
      });
      let tripwire: ReturnType<typeof setTimeout> | undefined;
      instance.observe("expressionAnalysis", () => {
        if (!active || !instance) return;
        const analysis = instance.expressionAnalysis;
        const batch = loaded.current;
        const unedited = batch !== null && loadedRows(instance) === batch.rows;
        // Tripwire, defense in depth: the hidden check ran the same engine on
        // the same batch, so an unedited loaded row should never error here.
        // If one still does once the analysis settles, the rows come out and
        // the batch is never shown again.
        clearTimeout(tripwire);
        if (
          batch &&
          unedited &&
          verdictFromAnalysis(analysis, batch.ids)?.status === "error"
        ) {
          tripwire = setTimeout(() => {
            const current = loaded.current;
            if (
              !active ||
              !instance ||
              current !== batch ||
              loadedRows(instance) !== batch.rows
            )
              return;
            const verdict = verdictFromAnalysis(
              instance.expressionAnalysis,
              batch.ids,
            );
            if (verdict?.status !== "error") return;
            recordVisibleError(batch.payloadKey, verdict);
            loaded.current = null;
            instance.setBlank();
            publishRows(null);
            setLineCount(0);
            setExpressionError(false);
            setBlockedKey(batch.payloadKey);
          }, 150);
        }
        setExpressionError(
          Object.values(analysis).some((item) => item?.isError),
        );
        if (batch) setEntriesEdited(!unedited);
        publishRows(
          batch === null || !unedited ? null : collectRows(analysis, batch.key),
        );
      });
      // Editing a valid expression may leave its computed result unchanged, so
      // expressionAnalysis alone does not report every student edit.
      instance.observeEvent("change.solveplot", () => {
        if (!active || !instance) return;
        const batch = loaded.current;
        if (!batch) return;
        const changed = loadedRows(instance) !== batch.rows;
        setEntriesEdited(changed);
        if (changed) {
          publishRows(null);
          select(null);
        }
      });
      observer = new ResizeObserver(() => {
        if (active) instance?.resize();
      });
      observer.observe(containerRef.current);
      instance.resize();
    } catch {
      queueMicrotask(() => {
        if (active)
          setError(
            "The calculator could not start. Check your Desmos API key and reload.",
          );
      });
    }

    return () => {
      active = false;
      observer?.disconnect();
      calculatorRef.current = null;
      instance?.unobserve("expressionAnalysis");
      instance?.unobserve("selectedExpressionId.trace");
      instance?.unobserveEvent("change.solveplot");
      if (instance?.getState && graphKey.current && loaded.current)
        retainGraph(graphKey.current, instance.getState());
      instance?.destroy();
      loaded.current = null;
      publishRows(null);
      select(null);
    };
  }, [scriptReady, loadAttempt, publishRows, select]);

  useEffect(() => {
    calculatorRef.current?.updateSettings?.({
      expressionsCollapsed: !expressionsOpen,
    });
  }, [expressionsOpen, scriptReady]);

  useEffect(() => {
    const calculator = calculatorRef.current;
    const batch = loaded.current;
    if (
      !calculator ||
      !batch ||
      selection?.key !== batch.key ||
      loadedRows(calculator) !== batch.rows
    )
      return;
    const id = `${ROW_ID_PREFIX}${selection.row}`;
    if (typeof calculator.setSelectedExpressionId === "function")
      calculator.setSelectedExpressionId(id);
    // v1.11 exposes row styling; this fallback highlights the corresponding
    // curve without editing its mathematics or forcing the keypad open.
    batch.ids.forEach((rowId) =>
      calculator.setExpression?.({
        id: rowId,
        lineWidth: rowId === id ? 4 : 2.5,
        pointSize: rowId === id ? 12 : 8,
      }),
    );
  }, [selection, lineCount]);

  useEffect(() => {
    return () => {
      const calculator = calculatorRef.current;
      if (stateKey && calculator?.getState && loaded.current)
        retainGraph(stateKey, calculator.getState());
    };
  }, [stateKey]);

  function retryCalculator() {
    const calculator = calculatorRef.current;
    if (calculator) {
      // An existing calculator may contain the student's own equations and
      // viewport. A reconnect must not clear them or reload the whole page.
      calculator.resize();
      setError(null);
      window.dispatchEvent(new Event(DESMOS_READY_EVENT));
      return;
    }
    setError(null);
    setScriptReady(false);
    setLoadAttempt((value) => value + 1);
  }

  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setExpanded(false);
      expandButtonRef.current?.focus();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [expanded]);

  useEffect(() => {
    const calculator = calculatorRef.current;
    if (!scriptReady || !calculator) return;

    let active = true;

    // Load all dependencies together so regressions do not wait on animated rows.
    queueMicrotask(() => {
      if (!active) return;
      try {
        setError(null);
        setExpressionError(false);
        setEntriesEdited(false);
        setLineCount(0);
        loaded.current = null;
        publishRows(null);
        select(null);
        calculator.setBlank();
        calculator.setMathBounds(defaultBounds);
      } catch {
        setError("The calculator could not reset. Reload it and try again.");
        return;
      }

      if (!insertable || payload.items.length === 0) return;

      try {
        calculator.setExpressions(payload.items);
        // Keep the public key tied to the canonical solution. loadedRows still
        // proves that the actual sanitized calculator rows were not edited.
        loaded.current = {
          key: expressionsKey(expressions),
          rows: loadedRows(calculator),
          payloadKey: payload.key,
          ids: payload.items.map((item) => item.id),
        };
        calculator.setMathBounds(validBounds(bounds));
        const draft = stateKey ? graphDrafts.get(stateKey) : null;
        if (draft && calculator.setState) {
          calculator.setState(draft);
          calculator.updateSettings?.({
            invertedColors: false,
            expressionsCollapsed: !expressionsOpenRef.current,
          });
          setEntriesEdited(loadedRows(calculator) !== loaded.current.rows);
        }
        setLineCount(payload.items.length);
      } catch {
        loaded.current = null;
        setError("Could not add these lines. Try solving again.");
      }
    });

    return () => {
      active = false;
    };
  }, [
    scriptReady,
    expressions,
    payload,
    insertable,
    bounds,
    revision,
    replay,
    publishRows,
    select,
    stateKey,
  ]);

  const unavailableMessage = !apiKey
    ? "Add NEXT_PUBLIC_DESMOS_API_KEY to .env.local, then restart the dev server to load the calculator."
    : error;
  const withheld =
    payload.items.length > 0 &&
    (blocked || gate.status === "error" || gate.status === "unverified");
  const status = unavailableMessage
    ? "Calculator unavailable"
    : !scriptReady
      ? "Loading calculator…"
      : withheld
        ? "Lines not shown"
        : expressionError
          ? "Check the flagged line"
          : entriesEdited
            ? "Entries edited"
            : lineCount > 0
              ? `${lineCount} ${lineCount === 1 ? "line" : "lines"} added`
              : "Ready";

  return (
    <>
      {expanded && (
        <div
          className={styles.fullscreenBackdrop}
          aria-hidden="true"
          onClick={() => setExpanded(false)}
        />
      )}
      <div
        className={`${styles.shell} ${expanded ? styles.expanded : ""}`}
        data-testid="desmos-calculator"
      >
        <div className={styles.graphHeader}>
          <h2>Calculator</h2>
          <div className={styles.graphControls}>
            <button
              type="button"
              className={`${styles.expressionToggle} choiceControl`}
              aria-pressed={expressionsOpen}
              title="Show or hide Desmos expressions"
              data-motion="expressions"
              onClick={() => setExpressionsOpen((value) => !value)}
            >
              <List size={17} />
              <span>Expressions</span>
            </button>
            <button
              type="button"
              className={`${styles.graphIconButton} iconControl`}
              title="Reset graph view"
              aria-label="Reset graph view"
              data-motion="reset"
              disabled={!scriptReady || !!unavailableMessage}
              onClick={() =>
                calculatorRef.current?.setMathBounds(validBounds(bounds))
              }
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M4 11a8 8 0 1 1 2.1 6.6M4 5v6h6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              ref={expandButtonRef}
              type="button"
              className={`${styles.graphIconButton} iconControl`}
              title={expanded ? "Exit full screen" : "Full screen"}
              aria-label={expanded ? "Exit full screen" : "Full screen"}
              data-motion="fullscreen"
              aria-pressed={expanded}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 3v6H3m12 12v-6h6M3 9l6-6m6 18 6-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 3H3v6m12 12h6v-6M3 3l6 6m12 12-6-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
        {expressions.length > 0 && (
          <div className={styles.traceBar}>
            {selection &&
            selection.key === expressionsKey(expressions) &&
            !entriesEdited &&
            insertable &&
            lineCount > 0 ? (
              <button
                type="button"
                className="textControl"
                onClick={() => {
                  const row = document.getElementById(
                    `${traceId}-row-${selection.row}`,
                  );
                  row?.scrollIntoView({
                    block: "center",
                    behavior: window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches
                      ? "instant"
                      : "smooth",
                  });
                  row?.focus({ preventScroll: true });
                }}
              >
                Line {String(selection.row).padStart(2, "0")}{" "}
                <span>View its explanation</span>{" "}
                <span aria-hidden="true">↗</span>
              </button>
            ) : (
              <span>Select a step to follow it on the graph</span>
            )}
          </div>
        )}
        <div className={styles.calculatorFrame}>
          <div
            ref={containerRef}
            className={styles.calculator}
            aria-label="Interactive Desmos graphing calculator"
          />
          {(!scriptReady || unavailableMessage) && (
            <div className={styles.placeholder}>
              <p>{unavailableMessage || "Loading calculator…"}</p>
              {unavailableMessage && apiKey && (
                <button
                  className={`${styles.reload} secondaryButton`}
                  type="button"
                  onClick={retryCalculator}
                >
                  Retry calculator
                </button>
              )}
            </div>
          )}
        </div>
        {(lineCount > 0 ||
          expressions.length > 0 ||
          entriesEdited ||
          unavailableMessage ||
          withheld ||
          expressionError) && (
          <div className={styles.toolbar}>
            <span
              className={styles.status}
              role="status"
              aria-live="polite"
              data-testid="desmos-status"
            >
              {status}
            </span>
            <button
              type="button"
              className={`${styles.replay} textControl`}
              title="Restore the original loaded equations"
              data-motion="restore"
              disabled={!scriptReady || !!unavailableMessage || !insertable}
              onClick={() => {
                if (stateKey) graphDrafts.delete(stateKey);
                setReplay((value) => value + 1);
              }}
            >
              <RotateCcw size={15} aria-hidden="true" /> Restore entries
            </button>
          </div>
        )}
        {withheld && !unavailableMessage && scriptReady && (
          <div
            className={styles.expressionWarning}
            role="status"
            data-testid="rows-withheld"
          >
            {gate.status === "unverified" ? (
              <>
                These lines could not be checked in Desmos, so they are not
                shown.{" "}
                <button
                  type="button"
                  className={`${styles.replay} textControl`}
                  onClick={retryCalculator}
                >
                  Retry check
                </button>
              </>
            ) : (
              "These lines did not run cleanly in Desmos, so they are not shown. Solve the problem again for a working method."
            )}
          </div>
        )}
        {expressionError && !withheld && !unavailableMessage && (
          <p className={styles.expressionWarning} role="status">
            Check the flagged line in Desmos, or restore the entries.
          </p>
        )}
      </div>
    </>
  );
}
