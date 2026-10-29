"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardCheck, Lightbulb, RotateCcw, ScanLine, X } from "lucide-react";
import { WorkspaceAppearance } from "@/components/appearance-provider";
import MathText from "@/components/math-text";
import DesmosCalculator from "@/components/desmos-calculator";
import { CalculatorVerificationProvider } from "@/components/calculator-verification";
import { gradeLessonCheck } from "@/lib/lesson-check";
import { lessonChoiceOrder } from "@/lib/lesson-choice-order";
import { recordCheckpointCompletion } from "@/lib/learning-progress";
import type { Checkpoint } from "@/lib/learn-checkpoint-types";
import base from "./sat-lesson-reader.module.css";
import styles from "./checkpoint-reader.module.css";
import LessonSplit from "./lesson-split";

type Attempt = {
  input: string;
  attempts: number;
  submitted: boolean;
  correct: boolean;
  firstTryCorrect: boolean;
  assisted: boolean;
  hintOpen: boolean;
  hintUsed: boolean;
  invalid: boolean;
  feedback: string;
};
const EMPTY_ATTEMPT: Attempt = {
  input: "", attempts: 0, submitted: false, correct: false, firstTryCorrect: false,
  assisted: false, hintOpen: false, hintUsed: false, invalid: false, feedback: "",
};
const subscribeToHydration = () => () => {};

export default function CheckpointReader({ checkpoint, progressScope }: { checkpoint: Checkpoint; progressScope: string }) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Attempt>>({});
  const [revision, setRevision] = useState(0);
  const [mobileCalculator, setMobileCalculator] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const calculator = useRef<HTMLElement>(null);
  const moved = useRef(false);
  const total = checkpoint.questions.length;
  const complete = step === total;
  const item = checkpoint.questions[Math.min(step, total - 1)];
  const check = item.check;
  const choices = check.kind === "choice" ? lessonChoiceOrder(check.choices, `${progressScope}:${checkpoint.id}:${item.id}`) : [];
  const attempt = answers[item.id] ?? EMPTY_ATTEMPT;
  const finishedQuestion = attempt.correct || attempt.assisted;
  const reviewedCount = checkpoint.questions.filter((question) => answers[question.id]?.correct || answers[question.id]?.assisted).length;
  const firstTryCount = checkpoint.questions.filter((question) => answers[question.id]?.firstTryCorrect).length;
  const assistedCount = checkpoint.questions.filter((question) => answers[question.id]?.assisted).length;
  const hintCount = checkpoint.questions.filter((question) => answers[question.id]?.hintUsed).length;
  const backHref = "/learn?path=" + checkpoint.path;

  useEffect(() => {
    if (moved.current) heading.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    if (complete && reviewedCount === total) {
      recordCheckpointCompletion(progressScope, checkpoint.id, { correct: firstTryCount, total });
    }
  }, [complete, reviewedCount, total, firstTryCount, progressScope, checkpoint.id]);

  function updateAttempt(change: Partial<Attempt>) {
    setAnswers((previous) => ({ ...previous, [item.id]: { ...(previous[item.id] ?? EMPTY_ATTEMPT), ...change } }));
  }

  function choose(input: string) {
    if (finishedQuestion) return;
    updateAttempt({ input, submitted: false, invalid: false, feedback: "" });
  }

  function go(next: number) {
    moved.current = true;
    setRevision((value) => value + 1);
    setMobileCalculator(false);
    setStep(Math.max(0, Math.min(total, next)));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function advance() {
    if (complete) return;
    if (!finishedQuestion) {
      if (attempt.submitted) return;
      const grade = gradeLessonCheck(check, attempt.input);
      if (!grade) {
        updateAttempt({ invalid: true, feedback: check.kind === "number" ? "Enter a number or a fraction, such as 3/2." : "Choose one answer before checking." });
        return;
      }
      updateAttempt({
        ...grade, submitted: true, invalid: false, attempts: attempt.attempts + 1,
        firstTryCorrect: grade.correct && attempt.attempts === 0,
      });
      return;
    }
    go(step + 1);
  }

  function openCalculator() {
    setMobileCalculator(true);
    requestAnimationFrame(() => calculator.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    }));
  }

  function restart() {
    setAnswers({});
    go(0);
  }

  return <WorkspaceAppearance className={base.shell + " " + styles.shell}>
    <header className={base.topbar}>
      <Link href={backHref} className={base.exit} aria-label="Back to lessons"><X size={21} /></Link>
      <div className={base.course}>
        <span className={base.courseIcon}><ClipboardCheck size={21} /></span>
        <div><span>{checkpoint.path === "sat" ? "SAT math topics" : "Desmos skills"}</span><strong>{checkpoint.title}</strong></div>
      </div>
    </header>
    <div className={base.progressRow}>
      <div className={base.progress} role="progressbar" aria-label="Checkpoint questions reviewed" aria-valuemin={0} aria-valuemax={total} aria-valuenow={reviewedCount}>
        <div style={{ width: reviewedCount / total * 100 + "%" }} />
      </div>
      <span>{complete ? <Check size={17} /> : step + 1 + " / " + total}</span>
    </div>
    <LessonSplit className={base.layout + " " + styles.layout} calculatorId="checkpoint-calculator-panel" hasCalculator={!complete}>
      <section className={base.lesson + " " + styles.question} aria-label={checkpoint.title}>
        <div key={step} className={base.slide}>
          <div className={base.phase}><span>{complete ? <Check size={14} /> : step + 1}</span>{complete ? "Checkpoint complete" : "Question " + (step + 1) + " of " + total}</div>
          <h1 ref={heading} tabIndex={-1}>{complete ? firstTryCount + " of " + total + " on first try" : item.title}</h1>
          {complete ? <>
            <p className={base.intro}>You’ve worked through every question in this section.</p>
            <ol className={styles.results} aria-label="Checkpoint results">
              {checkpoint.questions.map((question, index) => {
                const result = answers[question.id];
                return <li key={question.id} data-assisted={result?.assisted}>
                  <span className={styles.resultNumber}>{index + 1}</span>
                  <div><strong>{question.title}</strong><span>{result?.assisted ? "Reviewed with the explanation" : result?.firstTryCorrect ? "Correct on first try" : "Correct after retrying"}{result?.hintUsed ? " · Used a hint" : ""}</span></div>
                  {result?.assisted ? <Lightbulb size={18} /> : <Check size={18} />}
                </li>;
              })}
            </ol>
            {(assistedCount > 0 || hintCount > 0) && <p className={styles.reviewNote}>You can retake this checkpoint to try the questions again without help.</p>}
            <div className={styles.completeActions}>
              <Link href={backHref} className="primaryButton">Back to lessons<ArrowRight size={17} /></Link>
              <button type="button" className="outlinedControl" onClick={restart}><RotateCcw size={16} />Retake checkpoint</button>
            </div>
          </> : <>
            <div className={base.intro}>{item.body.map((paragraph) => <p key={paragraph}><MathText>{paragraph}</MathText></p>)}</div>
            {check.kind === "choice" ? <fieldset className={base.choiceGroup}>
              <legend className={base.srOnly}>{item.title}</legend>
              <div className={base.choices}>{choices.map((choice, index) => <label key={choice.id}
                data-selected={attempt.input === choice.id}
                data-correct={attempt.submitted && attempt.correct && attempt.input === choice.id}
                data-incorrect={attempt.submitted && !attempt.correct && attempt.input === choice.id}>
                <input type="radio" name={"checkpoint-" + item.id} value={choice.id} checked={attempt.input === choice.id}
                  disabled={finishedQuestion} onChange={() => choose(choice.id)}
                  aria-describedby={attempt.submitted ? "checkpoint-feedback" : undefined} />
                <span className={base.choiceKey}>{attempt.input === choice.id ? <Check size={16} /> : String.fromCharCode(65 + index)}</span>
                <span><MathText>{choice.text}</MathText></span>
              </label>)}</div>
            </fieldset> : <form className={base.numericForm} onSubmit={(event) => {
              event.preventDefault();
              if (attempt.input.trim() && !attempt.submitted && !finishedQuestion) advance();
            }}>
              <label htmlFor="checkpoint-answer">Your answer{check.unit ? " (" + check.unit + ")" : ""}</label>
              <input id="checkpoint-answer" autoComplete="off" spellCheck={false} maxLength={80}
                placeholder="Enter a number or fraction" value={attempt.input} disabled={finishedQuestion}
                onChange={(event) => choose(event.target.value)}
                aria-invalid={attempt.invalid || (attempt.submitted && !attempt.correct)}
                aria-describedby={attempt.invalid || attempt.submitted ? "checkpoint-feedback" : undefined} />
            </form>}
            {attempt.hintOpen && !attempt.assisted && <aside className={base.tip} role="status"><Lightbulb size={18} /><p><MathText>{check.hint}</MathText></p></aside>}
            {attempt.assisted && <aside className={base.walkthrough} role="status">
              <h2>Work through the solution</h2>
              {check.kind === "number" ? <ol>{check.solution.map((line) => <li key={line}><MathText>{line}</MathText></li>)}</ol>
                : <p><MathText>{check.choices.find((choice) => choice.id === check.correctId)!.text}</MathText></p>}
              <p><MathText>{check.explanation}</MathText></p>
              <small>This question is marked as reviewed with help.</small>
            </aside>}
            <button type="button" className={"textControl " + base.mobileOpen} disabled={!hydrated} onClick={openCalculator}><ScanLine size={16} />Open calculator<ArrowRight size={14} /></button>
          </>}
        </div>
        {!complete && <footer className={base.footer} data-feedback={attempt.submitted ? attempt.correct ? "correct" : "incorrect" : undefined}>
          {(attempt.submitted || attempt.invalid) && !attempt.assisted && <div id="checkpoint-feedback" className={base.feedback} role="status">
            <span>{attempt.correct ? <Check size={20} /> : <Lightbulb size={20} />}</span>
            <div><strong>{attempt.correct ? "That’s right" : attempt.invalid ? "Check the format" : "Try another answer"}</strong><p><MathText>{attempt.feedback}</MathText></p></div>
          </div>}
          {!finishedQuestion && attempt.attempts >= 2 && <button type="button" className={"textControl " + base.help}
            onClick={() => updateAttempt({ assisted: true, submitted: false, invalid: false })}>Show the explanation<ArrowRight size={14} /></button>}
          <div className={base.footerActions}>
            <button type="button" className={"outlinedControl " + base.back} onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous question"><ArrowLeft size={18} /></button>
            {!finishedQuestion && <button type="button" className={"textControl " + base.hintButton} disabled={!hydrated}
              onClick={() => updateAttempt({ hintOpen: !attempt.hintOpen, hintUsed: true })}><Lightbulb size={16} />{attempt.hintOpen ? "Hide hint" : "Need a hint?"}</button>}
            <button type="button" className="primaryButton" onClick={advance}
              disabled={!hydrated || !finishedQuestion && (!attempt.input.trim() || attempt.submitted)}>
              {finishedQuestion ? step === total - 1 ? "See results" : "Next question" : "Check answer"}<ArrowRight size={17} />
            </button>
          </div>
        </footer>}
      </section>
      {!complete && <aside ref={calculator} id="checkpoint-calculator-panel" className={base.calculator} data-mobile-open={mobileCalculator} aria-label="Checkpoint calculator">
        <button type="button" className={base.mobileCalculatorToggle} disabled={!hydrated} onClick={() => setMobileCalculator((open) => !open)}
          aria-expanded={mobileCalculator} aria-controls="checkpoint-calculator"><ScanLine size={19} /><span>Calculator</span><ChevronDown size={18} /></button>
        <div id="checkpoint-calculator" className={base.calculatorContent}>
          <div className={base.calculatorBody}><CalculatorVerificationProvider>
            <DesmosCalculator expressions={item.calculator.expressions} bounds={item.calculator.bounds} revision={revision} initialExpressionsOpen showStepTrace={false} />
          </CalculatorVerificationProvider></div>
          {item.calculator.expressions.length === 0 && <div className={base.calculatorNotes}>
            <button type="button" className={"textControl " + base.clearCalculator} onClick={() => setRevision((value) => value + 1)}><RotateCcw size={14} />Clear calculator</button>
          </div>}
          <button type="button" className={"textControl " + base.returnToSlide} onClick={() => {
            setMobileCalculator(false);
            heading.current?.focus();
            heading.current?.scrollIntoView({ block: "start", behavior: "instant" });
          }}>Back to the question<ArrowLeft size={14} /></button>
        </div>
      </aside>}
    </LessonSplit>
  </WorkspaceAppearance>;
}
