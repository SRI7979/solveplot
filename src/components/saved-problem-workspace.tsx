"use client";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronDown,
  FileImage,
  List,
  ScanLine,
} from "lucide-react";
import type { Solution } from "@/lib/solver-schema";
import { SHOW_CALCULATOR_EVENT } from "@/lib/workspace-events";
import { WorkspaceAppearance } from "./appearance-provider";
import { CalculatorVerificationProvider } from "./calculator-verification";
import DesmosCalculator from "./desmos-calculator";
import MathText from "./math-text";
import SolutionExplanation from "./solution-explanation";
import { useSolverSplit } from "./use-solver-split";
import styles from "@/app/solve/page.module.css";
export default function SavedProblemWorkspace({
  solution,
  imageUrl,
  problemId,
  userId,
  accountNav,
}: {
  solution: Solution;
  imageUrl: string | null;
  problemId: string;
  userId: string;
  accountNav: ReactNode;
}) {
  const [originalOpen, setOriginalOpen] = useState(false);
  const [panel, setPanel] = useState<"solution" | "calculator">("solution");
  const { containerRef, split, isDragging, separatorProps } = useSolverSplit();
  useEffect(() => {
    const show = () => setPanel("calculator");
    window.addEventListener(SHOW_CALCULATOR_EVENT, show);
    return () => window.removeEventListener(SHOW_CALCULATOR_EVENT, show);
  }, []);
  return (
    <WorkspaceAppearance className={styles.shell}>
      <header className={styles.header}>{accountNav}</header>
      <div
        className={styles.mobilePanels}
        data-workspace-panels
        role="tablist"
        aria-label="Workspace panels"
      >
        <button
          type="button"
          role="tab"
          aria-selected={panel === "solution"}
          aria-controls="question-panel"
          onClick={() => setPanel("solution")}
        >
          <List size={18} />
          Steps
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={panel === "calculator"}
          aria-controls="calculator-panel"
          onClick={() => setPanel("calculator")}
        >
          <ScanLine size={18} />
          Calculator
        </button>
      </div>
      <main className={styles.main}>
        <CalculatorVerificationProvider>
          <div
            className={styles.workspace}
            ref={(node) => {
              containerRef.current = node;
            }}
            data-mobile-panel={panel}
            data-dragging={isDragging}
            style={{ "--solution-width": `${split}%` } as CSSProperties}
          >
            <div className={styles.questionSolutionPanel} id="question-panel">
              <Link href="/history" className={styles.originalToggle}>
                ← History
              </Link>
              <section className={styles.uploadCard}>
                <div className={styles.summaryHeading}>
                  <h1
                    style={{ fontSize: 13, margin: 0, color: "var(--muted)" }}
                  >
                    Your saved problem
                  </h1>
                  <Link href="/solve?new=1" className="outlinedControl">
                    Replace <ArrowUpRight size={13} />
                  </Link>
                </div>
                <div className={styles.compactQuestion}>
                  <MathText>{solution.question}</MathText>
                </div>
                {imageUrl ? (
                  <>
                    <button
                      type="button"
                      className={styles.originalToggle}
                      aria-expanded={originalOpen}
                      onClick={() => setOriginalOpen((value) => !value)}
                    >
                      <FileImage size={15} />
                      {originalOpen
                        ? "Hide original question"
                        : "View original question"}
                      <ChevronDown size={15} />
                    </button>
                    {originalOpen && (
                      <div className={styles.originalImage}>
                        <Image
                          src={imageUrl}
                          width={900}
                          height={600}
                          unoptimized
                          alt="Your saved question"
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <p className={styles.savedNotice}>
                    The original image is unavailable. Your question and
                    explanation are still saved.
                  </p>
                )}
              </section>
              <hr
                className={styles.problemDivider}
                aria-label="Problem and solution"
              />
              <h2 className={styles.solutionLabel}>Your solution</h2>
              <SolutionExplanation
                solution={solution}
                tutorSource={
                  solution.status === "solved"
                    ? { kind: "history", problemId }
                    : undefined
                }
              />
            </div>
            <div className={styles.paneDivider} {...separatorProps}>
              <span aria-hidden="true" />
            </div>
            <section
              className={styles.calculatorCard}
              id="calculator-panel"
              aria-label="Desmos calculator"
            >
              <DesmosCalculator
                expressions={
                  solution.status === "solved" ? solution.expressions : []
                }
                bounds={
                  solution.status === "solved" ? solution.graphBounds : null
                }
                answerState={
                  solution.status === "solved" ? solution.answerState : null
                }
                revision={0}
                stateKey={`history:${userId}:${problemId}`}
              />
            </section>
          </div>
        </CalculatorVerificationProvider>
      </main>
    </WorkspaceAppearance>
  );
}
