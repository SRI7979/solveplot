"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronRight, Layers3, List, ScanLine } from "lucide-react";
import MathExpression from "@/components/math-expression";
import MathText from "@/components/math-text";
import SolutionExplanation from "@/components/solution-explanation";
import DesmosCalculator from "@/components/desmos-calculator";
import { CalculatorVerificationProvider } from "@/components/calculator-verification";
import { SelectionAskTutor, TutorIcon, TutorPanel } from "@/components/tutor-panel";
import workspace from "@/app/solve/page.module.css";
import explanation from "@/components/solution-explanation.module.css";
import { SHOW_CALCULATOR_EVENT } from "@/lib/workspace-events";
import { LibraryPreview } from "./landing-library-preview";
import { ProductScene, ProductSurface } from "./product-scene";
import { DemoCopyButton, DemoSaveButton, LANDING_SOLUTION, useDemoTutor } from "./landing-solver-demo";
import styles from "./product-showcase.module.css";

function SectionHeading({ title, children }: { title: string; children?: React.ReactNode }) {
  return <header className={styles.sectionHeading}><h2>{title}</h2><div className={styles.sectionDescription}>{children}</div></header>;
}

const MOBILE_PREVIEW = "(max-width: 860px)";
function subscribeMobilePreview(update: () => void) {
  const media = window.matchMedia(MOBILE_PREVIEW);
  media.addEventListener("change", update);
  return () => media.removeEventListener("change", update);
}
function mobilePreviewSnapshot() { return window.matchMedia(MOBILE_PREVIEW).matches; }
function desktopPreviewSnapshot() { return false; }

function SolverPreview() {
  const tutor = useDemoTutor();
  const id = useId();
  const [panel, setPanel] = useState<"solution" | "calculator">("solution");
  const mobile = useSyncExternalStore(subscribeMobilePreview, mobilePreviewSnapshot, desktopPreviewSnapshot);
  const preview = useRef<HTMLDivElement>(null);
  const calculator = useRef<HTMLDivElement>(null);
  function panelKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === "Home" ? 0 : event.key === "End" ? 1 : 1 - index;
    setPanel(next === 0 ? "solution" : "calculator");
    event.currentTarget.parentElement?.querySelectorAll("button")[next]?.focus();
  }
  useEffect(() => {
    const show = () => {
      setPanel("calculator");
      requestAnimationFrame(() => {
        const target = window.matchMedia(MOBILE_PREVIEW).matches ? preview.current : calculator.current;
        target?.scrollIntoView({
          block: "start",
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        });
      });
    };
    window.addEventListener(SHOW_CALCULATOR_EVENT, show);
    return () => window.removeEventListener(SHOW_CALCULATOR_EVENT, show);
  }, []);
  return <ProductScene className={styles.solverStage}>
    <ProductSurface className={styles.solverApp}>
      <div ref={preview} className={styles.previewTop} />
      <div className={styles.mobilePanels}>
        <div className="segmentedControl workspacePanelSwitch" role="tablist" aria-label="Demo panels">
          <button id={`${id}-steps-tab`} type="button" role="tab" className="choiceControl" aria-selected={panel === "solution"} tabIndex={panel === "solution" ? 0 : -1} aria-controls={`${id}-steps-panel`} onKeyDown={event => panelKey(event, 0)} onClick={() => setPanel("solution")}><List size={18} /> Steps</button>
          <button id={`${id}-calculator-tab`} type="button" role="tab" className="choiceControl" aria-selected={panel === "calculator"} tabIndex={panel === "calculator" ? 0 : -1} aria-controls={`${id}-calculator-panel`} onKeyDown={event => panelKey(event, 1)} onClick={() => setPanel("calculator")}><ScanLine size={18} /> Calculator</button>
        </div>
      </div>
      <CalculatorVerificationProvider>
        <div className={styles.previewPanels} data-mobile-panel={panel}>
        <div id={`${id}-steps-panel`} className={styles.guidedPanel} role="tabpanel" aria-labelledby={mobile ? `${id}-steps-tab` : undefined} aria-label={mobile ? undefined : "Solution steps"} aria-hidden={mobile && panel !== "solution" || undefined} inert={mobile && panel !== "solution"}>
          <div className={workspace.summaryHeading}><h2>Your problem</h2><Link className="outlinedControl" href="/solve">Replace <ArrowUpRight size={13} /></Link></div>
          <div className={workspace.compactQuestion}><MathText>{LANDING_SOLUTION.question}</MathText></div>
          <hr className={workspace.problemDivider} /><h2 className={workspace.solutionLabel}>Your solution</h2>
          <SolutionExplanation solution={LANDING_SOLUTION} tutorController={tutor} saveControl={<DemoSaveButton />} />
        </div>
        <div id={`${id}-calculator-panel`} className={styles.calculatorPanel} ref={calculator} role="tabpanel" aria-labelledby={mobile ? `${id}-calculator-tab` : undefined} aria-label={mobile ? undefined : "Calculator"} aria-hidden={mobile && panel !== "calculator" || undefined} inert={mobile && panel !== "calculator"}>
          <DesmosCalculator expressions={LANDING_SOLUTION.expressions} bounds={LANDING_SOLUTION.graphBounds} revision={0} initialExpressionsOpen />
        </div>
        </div>
      </CalculatorVerificationProvider>
    </ProductSurface>
    <div className={styles.demoFooter}><span className={styles.demoLabel} title="The question and tutor replies in this preview are examples.">Demo</span><Link href="/solve">Open solver <ArrowUpRight size={14} /></Link></div>
  </ProductScene>;
}

function TutorPreview() {
  const tutor = useDemoTutor(true);
  const source = useRef<HTMLDivElement>(null);
  return <ProductScene className={styles.tutorStage}>
    <ProductSurface className={styles.tutorDocument}>
      <div className={styles.sourceExcerpt} ref={source}>
        <div className={explanation.sectionHeading}><h3>In Desmos</h3><span>3 lines</span></div>
        <ol className={explanation.expressionSteps}>
          <li data-active="true">
            <div className={explanation.lineHeading} data-tutor-ignore>
              <div className={explanation.stepSelect}><span className={`${explanation.stepNumber} stepIndicator`}>2</span><span><small>Type</small><strong>Enter line 2</strong></span></div>
              <span className={explanation.lineActions}><button type="button" className={`${explanation.copyButton} copyButton`} data-motion="tutor" onClick={() => tutor.open({ kind: "row", row: 2 }, "calculator line 2")}><TutorIcon /> Ask AI</button><DemoCopyButton row={2} /></span>
            </div>
            <div className={explanation.equation}><MathExpression latex={LANDING_SOLUTION.expressions[1].latex} /></div>
            <p><MathText>{LANDING_SOLUTION.expressions[1].purpose}</MathText></p>
          </li>
        </ol>
        <SelectionAskTutor tutor={tutor} containerRef={source} />
      </div>
      <div className={styles.inlineTutor}>
        {tutor.view.status !== "idle" ? <TutorPanel tutor={tutor} /> : <button className="secondaryButton" type="button" onClick={() => tutor.open({ kind: "row", row: 2 }, "calculator line 2")}><TutorIcon /> Ask AI</button>}
      </div>
    </ProductSurface>
    <div className={styles.demoFooter}><span className={styles.demoLabel} title="This preview uses a saved reply. Open the solver to ask your own question.">Demo</span><Link href="/solve">Ask about your question <ArrowUpRight size={14} /></Link></div>
  </ProductScene>;
}

const PRACTICE_TOPICS = {
  regression: ["Fit a quadratic from a table", "Find unknown coefficients", "Match roots in radical form"],
  intersections: ["Find where two lines meet", "Intersect a line and a parabola", "Read a positive x-coordinate"],
} as const;

function FuturePreviews() {
  const [variation, setVariation] = useState(0);
  const [topic, setTopic] = useState<"regression" | "intersections">("regression");
  const [practice, setPractice] = useState(0);
  return <section className={styles.futureSection} aria-labelledby="planned-features-title">
    <div className={styles.futureHeading}><h2 id="planned-features-title">Planned features</h2><p>Similar problems and practice by technique are in development.</p></div>
    <div className={styles.futureGrid}>
      <article className={styles.futureItem}>
        <header><h3>Similar problems</h3><span className={styles.comingSoon}>Coming soon</span></header><p>Try another question that uses the same technique.</p>
        <ProductScene className={styles.similarPreview}>
          <ProductSurface className={styles.similarSource}>
            <div className={styles.miniHeader}><span><Check size={16} /> Your solution</span><span>Answer 248</span></div>
            <MathExpression latex={"3x^2-16x+2=0"} />
            <div className={styles.sourceMethod}><span className={styles.methodTag}>Bracket regression</span><Layers3 size={18} /></div>
          </ProductSurface>
          <ProductSurface className={styles.similarTarget}>
            <div className={styles.miniHeader}><span><ScanLine size={17} /> Similar problem</span><span>{variation + 1} / 2</span></div>
            <div className={styles.practiceQuestion} key={variation}>
              <MathExpression latex={variation === 0 ? "2x^2-9x+1=0" : "2x^2-11x+3=0"} />
              <p>One root is <MathExpression latex={"(a+\\sqrt b)/4"} />.<br />Find <i>a + b</i>.</p>
            </div>
            <div className={styles.similarBottom}><span>Same technique</span><button className="secondaryButton" type="button" onClick={() => setVariation(variation ? 0 : 1)}>Next example <ArrowRight size={16} /></button></div>
          </ProductSurface>
        </ProductScene>
      </article>
      <article className={styles.futureItem}>
        <header><h3>Practice by technique</h3><span className={styles.comingSoon}>Coming soon</span></header><p>Choose a technique to practice.</p>
        <ProductScene className={styles.practicePreview}>
          <ProductSurface className={styles.practiceLibrary}>
            <div className={styles.miniHeader}><span><Bookmark size={17} /> Your techniques</span><span>Practice</span></div>
            <div className={`segmentedControl ${styles.practiceTabs}`} aria-label="Preview practice topics">{(["regression", "intersections"] as const).map(value => <button type="button" className="choiceControl" key={value} aria-pressed={topic === value} onClick={() => { setTopic(value); setPractice(0); }}>{value === "regression" ? "Regression" : "Intersections"}</button>)}</div>
            <div className={styles.practiceList} key={topic}>{PRACTICE_TOPICS[topic].map((title, index) => <button type="button" key={title} aria-pressed={practice === index} onClick={() => setPractice(index)}><span>{index + 1}</span><strong>{title}</strong><ChevronRight size={16} /></button>)}</div>
          </ProductSurface>
          <ProductSurface className={styles.practiceFocus}>
            <span className={styles.focusIcon}><ScanLine size={21} /></span><div><small>Question {practice + 1} of 3</small><strong>{PRACTICE_TOPICS[topic][practice]}</strong></div><span className={styles.focusStatus}>Preview</span>
          </ProductSurface>
        </ProductScene>
      </article>
    </div>
  </section>;
}

export function ProductShowcase() {
  return <div className={styles.showcase}>
    <section className={styles.productSection} id="preview" aria-labelledby="solver-showcase-title">
      <SectionHeading title="Solver"><p>Upload or type a question. The calculator entries and their explanations appear together.</p></SectionHeading>
      <div id="interactive-solution"><h3 id="solver-showcase-title" className={styles.srOnly}>Interactive SolvePlot solution</h3><SolverPreview /></div>
    </section>
    <section className={styles.productSection} id="tutor" aria-labelledby="tutor-showcase-title">
      <SectionHeading title="AI Tutor"><p>Choose Ask AI next to a line, or highlight the part you want explained.</p></SectionHeading>
      <h3 id="tutor-showcase-title" className={styles.srOnly}>Ask AI Tutor interactive example</h3><TutorPreview />
    </section>
    <section className={styles.productSection} id="experience" aria-labelledby="library-showcase-title">
      <SectionHeading title="History and Saved tricks"><p>Your previous questions and the methods you’ve saved.</p><Link href="/tricks">Saved tricks <ArrowUpRight size={15} /></Link></SectionHeading>
      <h3 id="library-showcase-title" className={styles.srOnly}>History and Saved tricks interactive preview</h3><LibraryPreview />
    </section>
    <FuturePreviews />
  </div>;
}
