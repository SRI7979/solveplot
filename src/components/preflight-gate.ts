"use client";

import { useEffect, useMemo, useState } from "react";
import { createPreflightEngine, type PreflightEngine } from "@/lib/desmos-engine";
import { calculatorPayload, type CalculatorPayload, type PreflightVerdict } from "@/lib/desmos-preflight";
import { DESMOS_READY_EVENT, loadDesmos } from "@/lib/desmos-loader";
import type { AnswerState } from "@/lib/solver-schema";

/**
 * The rendering gate. Every path that shows calculator rows (the solve page,
 * a technique switch, a saved history entry, the explanation's copyable
 * lines) asks here first, and shows rows only for a batch the hidden Desmos
 * instance reported clean. Verdicts are memoized by batch content, so a batch
 * the solve flow already checked renders with no second check.
 */

let engine: Promise<PreflightEngine> | null = null;
const settled = new Map<string, PreflightVerdict>();
const inFlight = new Map<string, Promise<PreflightVerdict>>();

function getEngine(): Promise<PreflightEngine> {
  if (!engine) {
    const pending = loadDesmos().then((desmos) => createPreflightEngine(desmos, document));
    engine = pending;
    pending.catch(() => { if (engine === pending) engine = null; });
  }
  return engine;
}

/** The memoized verdict for a batch, if one is already known. */
export function knownVerdict(key: string): PreflightVerdict | undefined {
  return settled.get(key);
}

/** Checks a batch in the hidden instance (once per distinct batch). Rejects if Desmos never loads. */
export function preflight(payload: CalculatorPayload): Promise<PreflightVerdict> {
  const known = settled.get(payload.key);
  if (known) return Promise.resolve(known);
  let pending = inFlight.get(payload.key);
  if (!pending) {
    pending = getEngine()
      .then((instance) => instance.check(payload))
      .then((verdict) => {
        // A timeout is not evidence; the next render may check again.
        if (verdict.status !== "timeout") settled.set(payload.key, verdict);
        return verdict;
      })
      .finally(() => inFlight.delete(payload.key));
    inFlight.set(payload.key, pending);
  }
  return pending;
}

/** The visible calculator saw an error the hidden check did not: never show this batch again. */
export function recordVisibleError(key: string, verdict: Extract<PreflightVerdict, { status: "error" }>) {
  settled.set(key, verdict);
}

export type GateState =
  | { status: "empty" }
  | { status: "pending" }
  | { status: "clean"; verdict: PreflightVerdict }
  | { status: "error"; verdict: Extract<PreflightVerdict, { status: "error" }> }
  | { status: "unverified" };

function stateFor(payload: CalculatorPayload): GateState {
  if (payload.items.length === 0) return { status: "empty" };
  const known = settled.get(payload.key);
  if (!known) return { status: "pending" };
  return known.status === "error" ? { status: "error", verdict: known } : { status: "clean", verdict: known };
}

/**
 * The gate's state for these rows: "clean" only once the hidden instance
 * reported every row free of errors. "unverified" (Desmos could not load, or
 * never settled) shows nothing, like "error": unverified is not clean.
 */
export function usePreflightGate(
  rows: ReadonlyArray<{ latex: string; slider?: { min: number; max: number; step: number } | null }>,
  answerState: AnswerState | null | undefined,
): { payload: CalculatorPayload; gate: GateState } {
  const payload = useMemo(() => calculatorPayload(rows, answerState), [rows, answerState]);
  const [result, setResult] = useState<{ key: string; gate: GateState } | null>(null);
  const [readyRevision, setReadyRevision] = useState(0);
  useEffect(() => {
    // A later successful retry rechecks unverified rows in both the graph and
    // explanation. Never memoize a network failure as a bad math verdict.
    const ready = () => setReadyRevision((value) => value + 1);
    window.addEventListener(DESMOS_READY_EVENT, ready);
    return () => window.removeEventListener(DESMOS_READY_EVENT, ready);
  }, []);
  useEffect(() => {
    if (payload.items.length === 0 || settled.has(payload.key)) return;
    let active = true;
    preflight(payload).then(
      (verdict) => {
        if (!active) return;
        setResult({
          key: payload.key,
          gate: verdict.status === "error" ? { status: "error", verdict } : verdict.status === "clean" ? { status: "clean", verdict } : { status: "unverified" },
        });
      },
      () => active && setResult({ key: payload.key, gate: { status: "unverified" } }),
    );
    return () => {
      active = false;
    };
  }, [payload, readyRevision]);
  const known = stateFor(payload);
  const gate = known.status !== "pending" ? known : result?.key === payload.key ? result.gate : known;
  return { payload, gate };
}
