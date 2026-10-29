"use client";

import { Children, useCallback, useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { GripVertical } from "lucide-react";
import styles from "./lesson-split.module.css";

const DEFAULT_RATIO = 48;
const DIVIDER_WIDTH = 36;
const MIN_PANEL_WIDTH = 300;
const subscribeToHydration = () => () => {};

/** Changes the pane widths without remounting the live calculator. */
export default function LessonSplit({ children, className, calculatorId, hasCalculator = true }: {
  children: ReactNode;
  className: string;
  calculatorId: string;
  hasCalculator?: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const container = useRef<HTMLElement>(null);
  const activePointer = useRef<{ id: number; target: HTMLDivElement; offset: number } | null>(null);
  const bounds = useRef({ min: 25, max: 75 });
  const lastOpen = useRef(DEFAULT_RATIO);
  const [ratio, setRatio] = useState(DEFAULT_RATIO);
  const [minRatio, setMinRatio] = useState(25);
  const [collapsed, setCollapsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const panes = Children.toArray(children);

  const measure = useCallback(() => {
    const rect = container.current?.getBoundingClientRect();
    if (!rect) return null;
    const available = Math.max(1, rect.width - DIVIDER_WIDTH);
    const minimum = Math.min(48, MIN_PANEL_WIDTH / available * 100);
    bounds.current = { min: minimum, max: 100 - minimum };
    setMinRatio(minimum);
    return { left: rect.left, available };
  }, []);

  function resize(value: number) {
    const next = Math.max(bounds.current.min, Math.min(bounds.current.max, value));
    lastOpen.current = next;
    setRatio(next);
    setCollapsed(false);
  }

  function toggle() {
    if (collapsed) { measure(); resize(lastOpen.current); }
    else setCollapsed(true);
  }

  const finishDrag = useCallback(() => {
    const pointer = activePointer.current;
    activePointer.current = null;
    if (pointer?.target.hasPointerCapture(pointer.id)) pointer.target.releasePointerCapture(pointer.id);
    setDragging(false);
  }, []);

  useEffect(() => {
    const update = () => {
      measure();
      // A phone uses the stacked layout; retain the desktop preference there.
      if (window.matchMedia("(max-width: 800px)").matches) { finishDrag(); return; }
      setRatio(Math.max(bounds.current.min, Math.min(bounds.current.max, lastOpen.current)));
    };
    const observer = new ResizeObserver(update);
    if (container.current) observer.observe(container.current);
    window.addEventListener("blur", finishDrag);
    return () => {
      observer.disconnect();
      window.removeEventListener("blur", finishDrag);
      const pointer = activePointer.current;
      activePointer.current = null;
      if (pointer?.target.hasPointerCapture(pointer.id)) pointer.target.releasePointerCapture(pointer.id);
    };
  }, [finishDrag, measure]);

  return <main ref={container} className={`${className} ${styles.split}`}
    style={{ "--lesson-ratio": ratio } as CSSProperties}
    data-calculator-collapsed={collapsed} data-resizing={dragging} data-single-panel={!hasCalculator} data-complete={!hasCalculator}>
    {panes[0]}
    {hasCalculator && <div className={styles.divider}>
      <div className={styles.rail}>
        <div className={styles.handle} role="separator" tabIndex={hydrated ? 0 : -1} aria-disabled={!hydrated}
          aria-label="Resize lesson and calculator" aria-controls={calculatorId} aria-orientation="vertical"
          aria-valuemin={Math.round(minRatio)} aria-valuemax={100}
          aria-valuenow={collapsed ? 100 : Math.round(ratio)}
          aria-valuetext={collapsed ? "Calculator hidden" : `${Math.round(100 - ratio)} percent calculator`}
          title="Drag to resize. Arrow keys resize; Enter hides or shows the calculator. Double-click to reset."
          onPointerDown={(event) => {
            if (event.button !== 0 || !event.isPrimary || activePointer.current) return;
            event.preventDefault(); measure();
            event.currentTarget.focus({ preventScroll: true });
            activePointer.current = { id: event.pointerId, target: event.currentTarget, offset: event.clientX - event.currentTarget.getBoundingClientRect().left };
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            const pointer = activePointer.current;
            if (!pointer || event.pointerId !== pointer.id) return;
            const geometry = measure();
            if (!geometry) return;
            const leftWidth = event.clientX - geometry.left - pointer.offset;
            if (geometry.available - leftWidth < 90) setCollapsed(true);
            else resize(leftWidth / geometry.available * 100);
          }}
          onPointerUp={(event) => { if (activePointer.current?.id === event.pointerId) finishDrag(); }}
          onPointerCancel={(event) => { if (activePointer.current?.id === event.pointerId) finishDrag(); }}
          onLostPointerCapture={(event) => { if (activePointer.current?.id === event.pointerId) finishDrag(); }}
          onDoubleClick={() => { measure(); resize(DEFAULT_RATIO); }}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Escape"].includes(event.key)) return;
            event.preventDefault(); measure();
            const increment = event.shiftKey ? 10 : 2;
            if (event.key === "Enter") toggle();
            else if (event.key === "Escape") finishDrag();
            else if (event.key === "End") setCollapsed(true);
            else if (event.key === "Home") resize(bounds.current.min);
            else if (event.key === "ArrowLeft") resize(collapsed ? bounds.current.max : ratio - increment);
            else if (collapsed || ratio >= bounds.current.max) setCollapsed(true);
            else resize(ratio + increment);
          }}><span><GripVertical size={16} /></span></div>
      </div>
    </div>}
    {panes[1]}
  </main>;
}
