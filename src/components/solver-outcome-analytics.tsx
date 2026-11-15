"use client";

import { useEffect, useRef } from "react";
import { expressionsKey, useCalculatorRows } from "./calculator-verification";
import { reconcileWithCalculator } from "@/lib/answer-consistency";
import { captureAnalytics } from "@/lib/posthog-client";
import type { Solution } from "@/lib/solver-schema";
import type { SolverMeasurementTracker } from "@/lib/product-analytics";

/** Observes only an explicitly submitted solve, never a restored history/draft
 * or the public demo. A numeric match is not a proof of every source condition. */
export default function SolverOutcomeAnalytics({ solution, explanationReady, measurement, selectedMethodId }: {
  solution: Solution | null;
  selectedMethodId?: string | null;
  explanationReady: boolean;
  measurement: SolverMeasurementTracker | null;
}) {
  const rows = useCalculatorRows();
  const viewed = useRef<{ key: string; measurement: SolverMeasurementTracker | null } | null>(null);
  useEffect(() => {
    if (solution?.status !== "solved") return;
    measurement?.method(solution.method);
    const key = selectedMethodId ?? solution.method;
    if (viewed.current?.key === key && viewed.current.measurement === measurement) return;
    viewed.current = { key, measurement };
    if (solution.method === "desmos" || solution.method === "algebra") captureAnalytics(
      solution.method === "desmos" ? "desmos_method_viewed" : "algebra_method_viewed",
      { method_selected: solution.method, surface: "solver" },
    );
  }, [solution, measurement, selectedMethodId]);
  useEffect(() => {
    if (!measurement || solution?.status !== "solved") return;
    const cleanLiveRows = rows?.key === expressionsKey(solution.expressions) && solution.expressions.every((_, index) => rows.rows[index + 1] && !rows.rows[index + 1].isError);
    const row = cleanLiveRows && rows && solution.result?.row != null ? rows.rows[solution.result.row] : null;
    const check = row && !row.isError ? reconcileWithCalculator(solution, row.evaluation) : null;
    // Rowless written solutions can be delivered too; no calculator claim is made.
    // A demonstrated contradictory readout is never counted as a ready solution.
    if (explanationReady && check?.status !== "contradicted" && (solution.expressions.length === 0 || cleanLiveRows)) measurement.mark("solver_solution_ready");
    if (check?.status === "verified") measurement.mark("solver_readout_checked");
  }, [solution, explanationReady, measurement, rows]);
  return null;
}
