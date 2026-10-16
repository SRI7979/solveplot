"use client";

import { useEffect, useRef, useState } from "react";
import { loadDesmos } from "../../../src/lib/desmos-loader";
import type { DesmosCalculatorInstance } from "../../../src/lib/desmos-engine";

type Method = "difference" | "intersections";

type Props = {
  method: Method;
  activeStep: number;
  resetSignal: number;
  expressionsOpen: boolean;
};

type Expression = {
  id: string;
  latex?: string;
  color?: string;
  secret?: boolean;
  lineWidth?: number;
  lineOpacity?: number;
  pointSize?: number;
  pointOpacity?: number;
  showLabel?: boolean;
  label?: string;
};

type Calculator = Omit<
  DesmosCalculatorInstance,
  "setExpression" | "setExpressions" | "updateSettings"
> & {
  setExpression: (expression: Expression) => void;
  setExpressions: (expressions: Expression[]) => void;
  updateSettings: (settings: Record<string, unknown>) => void;
};

const TEAL = "#287c73";
const BLUE = "#547ac0";
const CURVE = "mock_curve";
const LINE = "mock_line";
const NEGATIVE_POINT = "mock_negative_point";
const POSITIVE_POINT = "mock_positive_point";

const BOUNDS = {
  difference: { left: -3, right: 10, bottom: -20, top: 12 },
  intersections: { left: -4, right: 10, bottom: -8, top: 30 },
};

function loadMethod(calculator: Calculator, method: Method) {
  const difference = method === "difference";
  calculator.setBlank();
  calculator.setExpressions([
    {
      id: CURVE,
      latex: difference ? "y=x^{2}-4x+1-(2x+8)" : "y=x^{2}-4x+1",
      color: TEAL,
      lineWidth: 3,
      lineOpacity: 1,
    },
    ...(!difference
      ? [{ id: LINE, latex: "y=2x+8", color: BLUE, lineWidth: 3, lineOpacity: 1 }]
      : []),
    {
      id: NEGATIVE_POINT,
      latex: difference ? "(-1,0)" : "(-1,6)",
      color: TEAL,
      secret: true,
      pointSize: 7,
      pointOpacity: 0.65,
      showLabel: false,
    },
    {
      id: POSITIVE_POINT,
      latex: difference ? "(7,0)" : "(7,22)",
      color: TEAL,
      secret: true,
      pointSize: 12,
      pointOpacity: 1,
      showLabel: true,
      label: difference ? "(7, 0)" : "(7, 22)",
    },
  ]);
  calculator.setMathBounds(BOUNDS[method]);
}

function highlightStep(calculator: Calculator, activeStep: number) {
  const ids = new Set(calculator.getExpressions().map((expression) => expression.id));
  const update = (expression: Expression) => {
    // A highlight must not recreate a row the student removed or replace edits.
    if (ids.has(expression.id)) calculator.setExpression(expression);
  };
  update({ id: CURVE, lineWidth: activeStep === 0 ? 4.5 : 3, lineOpacity: 1 });
  update({ id: LINE, lineWidth: 3, lineOpacity: 1 });
  update({
    id: POSITIVE_POINT,
    pointSize: activeStep === 0 ? 8 : activeStep === 1 ? 12 : 15,
    pointOpacity: activeStep === 0 ? 0.7 : 1,
    showLabel: activeStep > 0,
  });
}

export default function MockCalculator({
  method,
  activeStep,
  resetSignal,
  expressionsOpen,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const calculatorRef = useRef<Calculator | null>(null);
  const loadedMethodRef = useRef<Method | null>(null);
  const latestPropsRef = useRef({ method, activeStep, expressionsOpen });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    latestPropsRef.current = { method, activeStep, expressionsOpen };
  }, [method, activeStep, expressionsOpen]);

  useEffect(() => {
    let active = true;
    let instance: Calculator | null = null;
    let observer: ResizeObserver | undefined;
    let resizeFrame = 0;

    loadDesmos()
      .then((desmos) => {
        if (!active || !mountRef.current) return;
        const current = latestPropsRef.current;
        instance = desmos.GraphingCalculator(mountRef.current, {
          autosize: false,
          expressions: true,
          expressionsCollapsed: !current.expressionsOpen,
          expressionsTopbar: true,
          settingsMenu: true,
          zoomButtons: true,
          keypad: true,
          pointsOfInterest: true,
          trace: true,
          border: false,
          fontSize: 16,
          showGrid: true,
          showXAxis: true,
          showYAxis: true,
        }) as Calculator;
        calculatorRef.current = instance;
        loadMethod(instance, current.method);
        loadedMethodRef.current = current.method;
        highlightStep(instance, current.activeStep);

        observer = new ResizeObserver(() => {
          cancelAnimationFrame(resizeFrame);
          resizeFrame = requestAnimationFrame(() => {
            if (active) instance?.resize();
          });
        });
        observer.observe(mountRef.current);
        instance.resize();
        setError(null);
        setReady(true);
      })
      .catch((failure: unknown) => {
        if (!active) return;
        observer?.disconnect();
        instance?.destroy();
        calculatorRef.current = null;
        loadedMethodRef.current = null;
        setReady(false);
        setError(failure instanceof Error ? failure.message : "Desmos could not load.");
      });

    return () => {
      active = false;
      cancelAnimationFrame(resizeFrame);
      observer?.disconnect();
      instance?.destroy();
      calculatorRef.current = null;
      loadedMethodRef.current = null;
    };
  }, [loadAttempt]);

  useEffect(() => {
    const calculator = calculatorRef.current;
    if (!ready || !calculator || loadedMethodRef.current === method) return;
    loadMethod(calculator, method);
    loadedMethodRef.current = method;
  }, [method, ready]);

  useEffect(() => {
    const calculator = calculatorRef.current;
    if (ready && calculator) highlightStep(calculator, activeStep);
  }, [activeStep, method, ready]);

  useEffect(() => {
    const calculator = calculatorRef.current;
    if (!ready || !calculator) return;
    calculator.updateSettings({ expressionsCollapsed: !expressionsOpen });
    calculator.resize();
  }, [expressionsOpen, ready]);

  useEffect(() => {
    const calculator = calculatorRef.current;
    if (ready && calculator) calculator.setMathBounds(BOUNDS[method]);
  }, [resetSignal, method, ready]);

  return (
    <div style={{ position: "absolute", inset: 0, background: "#ffffff" }}>
      <div
        ref={mountRef}
        className="calculatorMount"
        style={{ position: "absolute", inset: 0 }}
        aria-label="Interactive Desmos graphing calculator"
      />
      {(!ready || error) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: 24,
            background: "#ffffff",
            color: "#666c6a",
            textAlign: "center",
          }}
        >
          <p role="status" aria-live="polite">{error || "Loading Desmos…"}</p>
          {error && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setReady(false);
                setLoadAttempt((attempt) => attempt + 1);
              }}
              style={{
                border: "1px solid #d4d8d5",
                borderRadius: 999,
                minHeight: 44,
                padding: "10px 20px",
                background: "#ffffff",
                boxShadow: "0 3px 0 #e3e6e1",
                color: TEAL,
                font: "inherit",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry calculator
            </button>
          )}
        </div>
      )}
    </div>
  );
}
