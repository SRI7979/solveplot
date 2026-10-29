"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Copy, GraduationCap, Lightbulb, RotateCcw, ScanLine, X } from "lucide-react";
import { WorkspaceAppearance } from "@/components/appearance-provider";
import MathText from "@/components/math-text";
import MathExpression from "@/components/math-expression";
import DesmosCalculator from "@/components/desmos-calculator";
import { CalculatorVerificationProvider } from "@/components/calculator-verification";
import { preflight } from "@/components/preflight-gate";
import { calculatorPayload } from "@/lib/desmos-preflight";
import PracticeActions from "@/components/practice-actions";
import { LEARN_PATHS, getLessonHref, type Lesson } from "@/lib/learn-catalog";
import { techniqueName } from "@/lib/technique-vocabulary";
import { gradeLessonCheck } from "@/lib/lesson-check";
import { lessonChoiceOrder } from "@/lib/lesson-choice-order";
import { recordLessonCompletion } from "@/lib/learning-progress";
import type { LessonContent } from "@/lib/lesson-types";
import type { LessonCalculatorSetup, LessonJourney, LessonVisual } from "@/lib/lesson-journey-types";
import styles from "./sat-lesson-reader.module.css";
import LessonSplit from "./lesson-split";

type Attempt = { input: string; attempts: number; correct: boolean; submitted: boolean; assisted: boolean; hint: boolean; feedback: string; invalid: boolean };
const EMPTY_ATTEMPT: Attempt = { input: "", attempts: 0, correct: false, submitted: false, assisted: false, hint: false, feedback: "", invalid: false };
const subscribeToHydration = () => () => {};

export default function LessonReader({ lesson, content, journey, related, progressScope }: { lesson: Lesson; content: LessonContent; journey: LessonJourney; related: Lesson[]; progressScope: string }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Attempt>>({});
  const [mobileCalculator, setMobileCalculator] = useState(false);
  const [revision, setRevision] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const calculator = useRef<HTMLElement>(null);
  const moved = useRef(false);
  const path = LEARN_PATHS.find((item) => item.id === lesson.path)!;
  const backHref = lesson.path === "sat" ? "/learn?path=sat" : "/learn";
  const complete = step === journey.slides.length;
  const slide = journey.slides[Math.min(step, journey.slides.length - 1)];
  const check = complete ? undefined : slide.check;
  const choices = check?.kind === "choice" ? lessonChoiceOrder(check.choices, `${progressScope}:${lesson.slug}:${slide.id}`) : [];
  const attempt = answers[slide.id] ?? EMPTY_ATTEMPT;
  const finishedCheck = attempt.correct || attempt.assisted;
  const checks = journey.slides.filter((item) => item.check);
  const correctCount = checks.filter((item) => answers[item.id]?.correct && !answers[item.id]?.assisted).length;
  const assistedCount = checks.filter((item) => answers[item.id]?.assisted).length;

  // Equal setups share references, so typing an answer or advancing a guided
  // table-building slide never resets the student's calculator work.
  const calculatorInputs = useMemo(() => {
    const known = new Map<string, Pick<LessonCalculatorSetup, "expressions" | "bounds">>();
    return journey.slides.map(({ calculator: setup }) => {
      const key = JSON.stringify([setup.expressions, setup.bounds]);
      if (!known.has(key)) known.set(key, { expressions: setup.expressions, bounds: setup.bounds });
      return known.get(key)!;
    });
  }, [journey]);
  const setup = calculatorInputs[Math.min(step, journey.slides.length - 1)];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const setup of new Set(calculatorInputs)) {
        if (cancelled) return;
        if (setup.expressions.length) await preflight(calculatorPayload(setup.expressions, null));
      }
    })().catch(() => {}); // The visible calculator offers retry if the API cannot load.
    return () => { cancelled = true; };
  }, [calculatorInputs]);

  useEffect(() => { if (moved.current) heading.current?.focus({ preventScroll: true }); }, [step]);

  useEffect(() => {
    if (complete) recordLessonCompletion(progressScope, lesson.slug, { answered: correctCount, assisted: assistedCount, total: checks.length });
  }, [complete, progressScope, lesson.slug, correctCount, assistedCount, checks.length]);

  function updateAttempt(change: Partial<Attempt>) {
    setAnswers((previous) => ({ ...previous, [slide.id]: { ...(previous[slide.id] ?? EMPTY_ATTEMPT), ...change } }));
  }
  function choose(input: string) { updateAttempt({ input, submitted: false, invalid: false, feedback: "" }); }
  function go(next: number) {
    moved.current = true;
    if (next !== step && journey.slides[next]?.check?.kind === "number") setRevision((value) => value + 1);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function advance() {
    if (complete) return;
    if (check && !finishedCheck) {
      const grade = gradeLessonCheck(check, attempt.input);
      if (!grade) { updateAttempt({ invalid: true, feedback: "Enter a number or a fraction, such as 3/2." }); return; }
      updateAttempt({ ...grade, submitted: true, attempts: attempt.attempts + 1, invalid: false });
      return;
    }
    go(step + 1);
  }
  function openCalculator() {
    setMobileCalculator(true);
    requestAnimationFrame(() => calculator.current?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }));
  }
  function restart() { setAnswers({}); setRevision((value) => value + 1); go(0); }
  function review(index: number) {
    setAnswers((previous) => ({ ...previous, [journey.slides[index].id]: EMPTY_ATTEMPT }));
    setRevision((value) => value + 1);
    go(index);
  }

  return <WorkspaceAppearance className={styles.shell}>
    <header className={styles.topbar}>
      <Link href={backHref} className={styles.exit} aria-label="Back to lessons"><X size={21} /></Link>
      <div className={styles.course}><span className={styles.courseIcon}><GraduationCap size={22} /></span><div><span>{path.title}</span><strong>{lesson.title}</strong></div></div>
    </header>
    <div className={styles.progressRow}><div className={styles.progress} role="progressbar" aria-label="Lesson slides" aria-valuemin={0} aria-valuemax={journey.slides.length} aria-valuenow={step}><div style={{ width: `${step / journey.slides.length * 100}%` }} /></div><span>{complete ? <Check size={17} /> : `${step + 1} / ${journey.slides.length}`}</span></div>
    <LessonSplit className={styles.layout} calculatorId="lesson-calculator-panel">
      <section className={styles.lesson} aria-label={`${lesson.title} lesson`}>
        <div key={step} className={styles.slide}>
          <div className={styles.phase}><span>{complete ? <Check size={14} /> : step + 1}</span>{complete ? "Lesson complete" : slide.phase}</div>
          <h1 ref={heading} tabIndex={-1}>{complete ? "You’ve finished this lesson" : slide.title}</h1>
          {complete ? <>
            <div className={styles.completionMark}><Check size={38} /><i /><i /><i /><i /><i /></div>
            <p className={styles.intro}>You answered {correctCount} of {checks.length} checks{assistedCount ? ` and worked through ${assistedCount} with the explanation` : ""}.</p>
            <h2 className={styles.smallHeading}>What to remember</h2>
            <ul className={styles.recap}>{journey.summary.map((text) => <li key={text}><Check size={17} /><span><MathText>{text}</MathText></span></li>)}</ul>
            {assistedCount > 0 && <div className={styles.review}><h2 className={styles.smallHeading}>Try these again without the explanation</h2>{journey.slides.map((item, index) => answers[item.id]?.assisted && <button key={item.id} className="outlinedControl" onClick={() => review(index)}>{item.title}<ArrowRight size={15} /></button>)}</div>}
            {lesson.slug !== "circles" && <div className={styles.practice}><h2 className={styles.smallHeading}>Another problem</h2><PracticeActions source={{ kind: "lesson", slug: lesson.slug }} techniqueName={techniqueName(content.example.techniqueId)} /></div>}
            <div className={styles.related}><h2 className={styles.smallHeading}>Next lessons</h2>{related.slice(0, 2).map((item) => <Link key={item.slug} href={getLessonHref(item)}>{item.title}<ArrowRight size={16} /></Link>)}</div>
            <details className={styles.sources}><summary>Reference guides<ChevronDown size={15} /></summary>{content.sources.map((source) => <a key={source.href} href={source.href} target="_blank" rel="noreferrer">{source.title}<ArrowRight size={13} /></a>)}</details>
          </> : <>
            <div className={styles.intro}>{slide.body.map((paragraph) => <p key={paragraph}><MathText>{paragraph}</MathText></p>)}</div>
            {step === 0 && <p className={styles.prerequisite}><span>Before you start</span><MathText>{journey.prerequisite}</MathText></p>}
            {slide.visual && <Visual visual={slide.visual} />}
            {slide.entries && <div className={styles.entries}>{slide.entries.map((entry, index) => <Entry key={`${entry.latex}:${index}`} {...entry} />)}</div>}
            {check?.kind === "choice" && <fieldset className={styles.choiceGroup}><legend className={styles.srOnly}>{slide.title}</legend><div className={styles.choices}>{choices.map((choice, index) => <label key={choice.id} data-selected={attempt.input === choice.id} data-correct={attempt.submitted && attempt.correct && choice.id === attempt.input} data-incorrect={attempt.submitted && !attempt.correct && choice.id === attempt.input}>
              <input type="radio" name={`check-${slide.id}`} value={choice.id} checked={attempt.input === choice.id} disabled={finishedCheck} onChange={() => choose(choice.id)} aria-describedby={attempt.submitted ? "lesson-feedback" : undefined} />
              <span className={styles.choiceKey}>{attempt.input === choice.id ? <Check size={16} /> : String.fromCharCode(65 + index)}</span><span><MathText>{choice.text}</MathText></span>
            </label>)}</div></fieldset>}
            {check?.kind === "number" && <form className={styles.numericForm} onSubmit={(event) => { event.preventDefault(); if (attempt.input.trim() && !attempt.submitted) advance(); }}><label htmlFor="lesson-answer">Your answer{check.unit ? ` (${check.unit})` : ""}</label><input id="lesson-answer" inputMode="text" autoComplete="off" spellCheck={false} maxLength={80} placeholder="Enter a number or fraction" value={attempt.input} disabled={finishedCheck} onChange={(event) => choose(event.target.value)} aria-invalid={attempt.invalid || (attempt.submitted && !attempt.correct)} aria-describedby={attempt.invalid || attempt.submitted ? "lesson-feedback" : undefined} /></form>}
            {slide.note && <p className={styles.note}><Lightbulb size={17} /><span><MathText>{slide.note}</MathText></span></p>}
            {check && attempt.hint && !attempt.assisted && <aside className={styles.tip} role="status"><Lightbulb size={18} /><p><MathText>{check.hint}</MathText></p></aside>}
            {check && attempt.assisted && <aside className={styles.walkthrough} role="status"><h2>Let’s work through it</h2>{check.kind === "number" ? <ol>{check.solution.map((text) => <li key={text}><MathText>{text}</MathText></li>)}</ol> : <p><MathText>{check.choices.find((choice) => choice.id === check.correctId)!.text}</MathText></p>}<p><MathText>{check.explanation}</MathText></p><small>You can retry this check at the end.</small></aside>}
            <button type="button" className={`textControl ${styles.mobileOpen}`} disabled={!hydrated} onClick={openCalculator}><ScanLine size={16} />Open calculator<ArrowRight size={14} /></button>
          </>}
        </div>
        <footer className={styles.footer} data-feedback={attempt.submitted && !complete ? attempt.correct ? "correct" : "incorrect" : undefined}>
          {check && (attempt.submitted || attempt.invalid) && !attempt.assisted && <div id="lesson-feedback" className={styles.feedback} role="status"><span>{attempt.correct ? <Check size={20} /> : <Lightbulb size={20} />}</span><div><strong>{attempt.correct ? "That’s right" : attempt.invalid ? "Check the format" : "Not quite yet"}</strong><p><MathText>{attempt.feedback}</MathText></p></div></div>}
          {check && !finishedCheck && attempt.attempts >= 2 && <button type="button" className={`textControl ${styles.help}`} onClick={() => updateAttempt({ assisted: true, submitted: false })}>Walk me through this<ArrowRight size={14} /></button>}
          <div className={styles.footerActions}>
            <button type="button" className={`outlinedControl ${styles.back}`} onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous slide"><ArrowLeft size={18} /></button>
            {check && !finishedCheck && <button type="button" className={`textControl ${styles.hintButton}`} disabled={!hydrated} onClick={() => updateAttempt({ hint: !attempt.hint })}><Lightbulb size={16} />{attempt.hint ? "Hide hint" : "Need a hint?"}</button>}
            {complete ? <Link href={backHref} className="primaryButton">Back to lessons<ArrowRight size={17} /></Link> : <button type="button" className="primaryButton" disabled={!hydrated || Boolean(check && !finishedCheck && (!attempt.input.trim() || attempt.submitted))} onClick={advance}>{check && !finishedCheck ? "Check answer" : step === 0 ? "Let’s begin" : step === journey.slides.length - 1 ? "Finish lesson" : "Continue"}<ArrowRight size={17} /></button>}
          </div>
          {complete && <button type="button" className={`textControl ${styles.restart}`} onClick={restart}><RotateCcw size={14} />Repeat this lesson</button>}
        </footer>
      </section>
      <aside ref={calculator} id="lesson-calculator-panel" className={styles.calculator} data-mobile-open={mobileCalculator} aria-label="Lesson calculator">
        <button type="button" className={styles.mobileCalculatorToggle} disabled={!hydrated} onClick={() => setMobileCalculator((open) => !open)} aria-expanded={mobileCalculator} aria-controls="lesson-calculator"><ScanLine size={19} /><span>Calculator</span><ChevronDown size={18} /></button>
        <div id="lesson-calculator" className={styles.calculatorContent}>
          <div className={styles.calculatorBody}><CalculatorVerificationProvider><DesmosCalculator expressions={setup.expressions} bounds={setup.bounds} revision={revision} initialExpressionsOpen showStepTrace={false} /></CalculatorVerificationProvider></div>
          {setup.expressions.length === 0 && <div className={styles.calculatorNotes}>
            <button type="button" className={`textControl ${styles.clearCalculator}`} onClick={() => setRevision((value) => value + 1)}><RotateCcw size={14} />Clear calculator</button>
          </div>}
          <button type="button" className={`textControl ${styles.returnToSlide}`} onClick={() => { setMobileCalculator(false); heading.current?.focus(); heading.current?.scrollIntoView({ block: "start", behavior: "instant" }); }}>Back to the question<ArrowLeft size={14} /></button>
        </div>
      </aside>
    </LessonSplit>
  </WorkspaceAppearance>;
}

function Entry({ latex, label }: { latex: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => { if (status === "idle") return; const timer = setTimeout(() => setStatus("idle"), 2200); return () => clearTimeout(timer); }, [status]);
  return <div className={styles.entry}><div><span>{label}</span><MathExpression latex={latex} /></div><button className="iconControl" type="button" aria-label={status === "copied" ? "Copied entry" : `Copy ${label.toLowerCase()}`} onClick={async () => { try { await navigator.clipboard.writeText(latex); setStatus("copied"); } catch { setStatus("failed"); } }}>{status === "copied" ? <Check size={17} /> : <Copy size={17} />}</button><span className={styles.srOnly} role="status">{status === "copied" ? "Entry copied" : ""}</span>{status === "failed" && <small role="status">Select the expression to copy it.</small>}</div>;
}

function Visual({ visual }: { visual: LessonVisual }) {
  if (visual.kind === "table") return <figure className={styles.tableVisual}><div><table><thead><tr>{visual.columns.map((column) => <th scope="col" key={column}><MathText>{column}</MathText></th>)}</tr></thead><tbody>{visual.rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}><MathText>{cell}</MathText></td>)}</tr>)}</tbody></table></div>{visual.caption && <figcaption><MathText>{visual.caption}</MathText></figcaption>}</figure>;
  return <div className={visual.kind === "flow" ? styles.flow : styles.comparison}>{visual.items.map((item, index) => <div key={item.label} className={styles.visualItem}>{visual.kind === "flow" && <span className={styles.flowNumber}>{index + 1}</span>}<div><span className={styles.visualLabel}>{item.label}</span>{item.math && <div className={styles.visualMath}><MathExpression latex={item.math} /></div>}{item.text && <p><MathText>{item.text}</MathText></p>}</div></div>)}</div>;
}
