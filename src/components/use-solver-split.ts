"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type RefObject,
} from "react";

const DEFAULT_SPLIT = 40;
const DIVIDER_WIDTH = 12;
const MIN_SOLUTION_WIDTH = 320;
const MIN_CALCULATOR_WIDTH = 340;
const STORAGE_KEY = "solveplot-solver:split";

type SplitState = { split: number; min: number; max: number };
type DragState = { pointerId: number; target: HTMLDivElement; offset: number };

export type SolverSplit = {
  containerRef: RefObject<HTMLElement | null>;
  split: number;
  minSplit: number;
  maxSplit: number;
  isDragging: boolean;
  separatorProps: HTMLAttributes<HTMLDivElement>;
  resetSplit: () => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function savePreference(value: number) {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // A blocked storage policy should not prevent resizing.
  }
}

/** Resizes the existing grid columns without replacing either panel. */
export function useSolverSplit(): SolverSplit {
  const containerRef = useRef<HTMLElement | null>(null);
  const preferredSplit = useRef(DEFAULT_SPLIT);
  const bounds = useRef({ min: 28, max: 62 });
  const drag = useRef<DragState | null>(null);
  const mounted = useRef(false);
  const [state, setState] = useState<SplitState>({
    split: DEFAULT_SPLIT,
    min: 28,
    max: 62,
  });
  const [isDragging, setIsDragging] = useState(false);

  const measure = useCallback(() => {
    const element = containerRef.current;
    if (!element) return null;
    const styles = getComputedStyle(element);
    const paddingLeft = parseFloat(styles.paddingLeft) || 0;
    const paddingRight = parseFloat(styles.paddingRight) || 0;
    const width = element.clientWidth - paddingLeft - paddingRight;
    if (width <= 0) return null;

    let min = Math.max(28, (MIN_SOLUTION_WIDTH / width) * 100);
    let max = Math.min(
      62,
      ((width - DIVIDER_WIDTH - MIN_CALCULATOR_WIDTH) / width) * 100,
    );
    if (min > max) {
      // Mobile uses tabs; retain a valid range while its columns are hidden.
      min = max =
        (MIN_SOLUTION_WIDTH /
          (MIN_SOLUTION_WIDTH + MIN_CALCULATOR_WIDTH + DIVIDER_WIDTH)) *
        100;
    }
    bounds.current = { min, max };
    const split = clamp(preferredSplit.current, min, max);
    setState((current) =>
      current.split === split && current.min === min && current.max === max
        ? current
        : { split, min, max },
    );

    return {
      left:
        element.getBoundingClientRect().left + element.clientLeft + paddingLeft,
      width,
    };
  }, []);

  const setSplit = useCallback((value: number, persist = false) => {
    const { min, max } = bounds.current;
    preferredSplit.current = clamp(value, 28, 62);
    const split = clamp(preferredSplit.current, min, max);
    setState((current) =>
      current.split === split ? current : { ...current, split },
    );
    if (persist) savePreference(preferredSplit.current);
  }, []);

  const finishDrag = useCallback(() => {
    const activeDrag = drag.current;
    if (!activeDrag) return;
    drag.current = null;
    savePreference(preferredSplit.current);
    if (mounted.current) setIsDragging(false);
    if (activeDrag.target.hasPointerCapture(activeDrag.pointerId)) {
      activeDrag.target.releasePointerCapture(activeDrag.pointerId);
    }
  }, []);

  const resetSplit = useCallback(
    () => setSplit(DEFAULT_SPLIT, true),
    [setSplit],
  );

  useEffect(() => {
    mounted.current = true;
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      const value = saved === null ? NaN : Number(saved);
      if (Number.isFinite(value)) preferredSplit.current = clamp(value, 28, 62);
    } catch {
      // Use the default when session storage is unavailable.
    }

    const element = containerRef.current;
    const observer = new ResizeObserver(measure);
    if (element) observer.observe(element);
    const initialFrame = requestAnimationFrame(measure);

    return () => {
      mounted.current = false;
      cancelAnimationFrame(initialFrame);
      observer.disconnect();
      finishDrag();
    };
  }, [finishDrag, measure]);

  const separatorProps: HTMLAttributes<HTMLDivElement> = {
    role: "separator",
    tabIndex: 0,
    "aria-label": "Resize solution and calculator",
    "aria-controls": "question-panel calculator-panel",
    "aria-orientation": "vertical",
    "aria-valuenow": Number(state.split.toFixed(1)),
    "aria-valuemin": Number(state.min.toFixed(1)),
    "aria-valuemax": Number(state.max.toFixed(1)),
    "aria-valuetext": `${Math.round(state.split)} percent solution, ${Math.round(100 - state.split)} percent calculator`,
    title: "Drag to resize. Use arrow keys, or double-click to reset.",
    onPointerDown: (event) => {
      if (event.button !== 0 || drag.current) return;
      event.preventDefault();
      measure();
      event.currentTarget.focus({ preventScroll: true });
      drag.current = {
        pointerId: event.pointerId,
        target: event.currentTarget,
        offset:
          event.clientX - event.currentTarget.getBoundingClientRect().left,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    },
    onPointerMove: (event) => {
      const activeDrag = drag.current;
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      const geometry = measure();
      if (!geometry) return;
      setSplit(
        ((event.clientX - geometry.left - activeDrag.offset) / geometry.width) *
          100,
      );
    },
    onPointerUp: (event) => {
      if (drag.current?.pointerId === event.pointerId) finishDrag();
    },
    onPointerCancel: (event) => {
      if (drag.current?.pointerId === event.pointerId) finishDrag();
    },
    onLostPointerCapture: (event) => {
      if (drag.current?.pointerId === event.pointerId) finishDrag();
    },
    onDoubleClick: resetSplit,
    onKeyDown: (event) => {
      const increment = event.shiftKey ? 10 : 2;
      let next: number;
      switch (event.key) {
        case "ArrowLeft":
          next = state.split - increment;
          break;
        case "ArrowRight":
          next = state.split + increment;
          break;
        case "Home":
          next = state.min;
          break;
        case "End":
          next = state.max;
          break;
        case "Enter":
          event.preventDefault();
          resetSplit();
          return;
        default:
          return;
      }
      event.preventDefault();
      setSplit(clamp(next, state.min, state.max), true);
    },
  };

  return {
    containerRef,
    split: state.split,
    minSplit: state.min,
    maxSplit: state.max,
    isDragging,
    separatorProps,
    resetSplit,
  };
}
