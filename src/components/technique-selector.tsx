"use client";
import { useEffect, useId, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { methodApproach } from "@/lib/method-scoring";
import type { MethodSummary } from "@/lib/method-summary";
import styles from "./technique-selector.module.css";
export default function TechniqueSelector({
  methods,
  selectedId,
  onSelect,
}: {
  methods: MethodSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const headingId = useId();
  const menu = useRef<HTMLDetailsElement>(null);
  const selected =
    methods.find((method) => method.id === selectedId) ?? methods[0];
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (menu.current && !menu.current.contains(event.target as Node))
        menu.current.open = false;
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  if (!selected) return null;
  const recommended = selected.badges.includes("Recommended");
  return (
    <section
      className={styles.container}
      aria-labelledby={headingId}
      data-testid="technique-selector"
    >
      <div className={styles.heading}>
        <span className={styles.recommendation}>
          {recommended
            ? "Recommended method"
            : methodApproach(selected) === "math"
              ? "Math alternative"
              : "Alternative method"}
        </span>
        {methods.length > 1 && (
          <details
            className={styles.menu}
            ref={menu}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary className="outlinedControl">
              Other methods <ChevronDown size={14} />
            </summary>
            <div className={styles.options}>
              <p>Choose a method</p>
              {methods.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className="menuChoice"
                  aria-pressed={method.id === selected.id}
                  onClick={() => {
                    onSelect(method.id);
                    if (menu.current) menu.current.open = false;
                  }}
                >
                  <span>
                    <strong>{method.name}</strong>
                    <small>
                      {method.badges.includes("Recommended")
                        ? "Recommended · "
                        : ""}
                      {methodApproach(method) === "math"
                        ? "Math way"
                        : "Desmos way"}
                    </small>
                  </span>
                  {method.id === selected.id && <Check size={17} />}
                </button>
              ))}
            </div>
          </details>
        )}
      </div>
      <h3 id={headingId}>{selected.name}</h3>
    </section>
  );
}
