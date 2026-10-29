"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Copy, Lightbulb, RotateCcw, X } from "lucide-react";
import { WorkspaceAppearance } from "@/components/appearance-provider";
import { LearnTheme } from "@/components/learn-theme";
import MathText from "@/components/math-text";
import MathExpression from "@/components/math-expression";
import DesmosCalculator from "@/components/desmos-calculator";
import { CalculatorVerificationProvider } from "@/components/calculator-verification";
import { useLearningProgress } from "@/components/use-learning-progress";
import { lessonChoiceOrder } from "@/lib/lesson-choice-order";
import { saveLessonDraft, recordLessonCompletion, recordCheckpointCompletion } from "@/lib/learning-progress";
import { EMPTY_LESSON_ATTEMPT, lessonContentVersion, lessonRunStats, restoreLessonRun } from "@/lib/lesson-run";
import { gradeLessonCheck } from "@/lib/lesson-check";
import { getNextLearningStop } from "@/lib/learning-path";
import type { Lesson, LearnPathId } from "@/lib/learn-catalog";
import type { LessonContent } from "@/lib/lesson-types";
import type { LessonCalculatorSetup, LessonJourney, LessonVisual } from "@/lib/lesson-journey-types";
import type { LessonAttempt, LessonDraft } from "@/lib/learning-session";
import { FunctionExplorer } from "./lesson-visuals";
import LessonHelpModal from "./lesson-help-modal";
import styles from "./lesson-reader.module.css";

const subscribe = () => () => {};
type Run = { step: number; attempts: Record<string, LessonAttempt> };

export default function LessonReader({ lesson, journey, progressScope }: {
  lesson: Lesson; content: LessonContent; journey: LessonJourney; related: Lesson[]; progressScope: string;
}) {
  return <LearningSession sessionId={lesson.slug} title={lesson.title} path={lesson.path} journey={journey} progressScope={progressScope} next={getNextLearningStop(lesson.slug)} />;
}

/** The same teaching surface for authored skill lessons and their checkpoints. */
export function LearningSession({ sessionId, title, path, journey, progressScope, next, checkpoint = false }: {
  sessionId: string; title: string; path: LearnPathId; journey: LessonJourney; progressScope: string;
  next: { title: string; href: string; checkpoint?: boolean } | null; checkpoint?: boolean;
}) {
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const progress = useLearningProgress(progressScope);
  const [run, setRun] = useState<Run>({ step: 0, attempts: {} });
  const [revision, setRevision] = useState(0);
  const [repeat, setRepeat] = useState(0);
  const [resumed, setResumed] = useState(false);
  const [help, setHelp] = useState<"hint" | "explanation" | "solution" | null>(null);
  const [pulse, setPulse] = useState<{ id: number; slide: string; tone: "correct" | "incorrect" } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = useRef<HTMLElement>(null);
  const swipe = useRef<Animation | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const interacted = useRef(false);
  const moved = useRef(false);
  const direction = useRef(1);
  const acceptedDraft = useRef("");
  const latest = useRef(run);
  const version = useMemo(() => lessonContentVersion(journey), [journey]);
  const { step, attempts } = run;
  const complete = step === journey.slides.length;
  const slide = journey.slides[Math.min(step, journey.slides.length - 1)];
  const check = complete ? undefined : slide.check;
  const choices = check?.kind === "choice" ? lessonChoiceOrder(check.choices, `${progressScope}:${sessionId}:${slide.id}`) : [];
  const attempt = attempts[slide.id] ?? EMPTY_LESSON_ATTEMPT;
  const resolved = attempt.correct || attempt.assisted;
  const stats = useMemo(() => lessonRunStats(journey, attempts), [journey, attempts]);
  const answerId = useId();
  const feedbackId = useId();
  const backHref = path === "sat" ? "/learn?path=sat" : "/learn";
  const setups = useMemo(() => {
    const known = new Map<string, LessonCalculatorSetup>();
    return journey.slides.map(({ calculator }) => {
      const key = JSON.stringify([calculator.expressions, calculator.bounds]);
      if (!known.has(key)) known.set(key, calculator);
      return known.get(key)!;
    });
  }, [journey]);
  const setup = setups[Math.min(step, setups.length - 1)];
  const showExplorer = !complete && sessionId === "introduction-to-desmos" && slide.id === "explore-rule";
  const showCalculator = !complete && !showExplorer;
  const calculatorKey = `${progressScope}:${sessionId}:${lessonContentVersion([setup.expressions, setup.bounds])}:${repeat}`;

  // Cloud data can arrive after hydration. Restore only until interaction;
  // a refresh must never move an exercise under a learner's cursor.
  useEffect(() => {
    const draft = progress.drafts[sessionId];
    if (!hydrated || interacted.current || !draft || acceptedDraft.current === draft.updatedAt) return;
    const restored = restoreLessonRun(journey, draft);
    if (!restored) return;
    let active = true;
    queueMicrotask(() => {
      if (!active || interacted.current) return;
      acceptedDraft.current = draft.updatedAt;
      latest.current = restored;
      setRun(restored);
      setResumed(restored.step > 0 && restored.step < journey.slides.length);
    });
    return () => { active = false; };
  }, [hydrated, journey, progress.drafts, sessionId]);

  const persist = useCallback(() => {
    if (!interacted.current) return;
    const draft: LessonDraft = { version: 1, contentVersion: version, step: latest.current.step, attempts: latest.current.attempts, updatedAt: new Date().toISOString(), completed: latest.current.step === journey.slides.length && lessonRunStats(journey, latest.current.attempts).complete };
    saveLessonDraft(progressScope, sessionId, draft);
  }, [journey, progressScope, sessionId, version]);
  useEffect(() => { const timer = setTimeout(persist, 300); return () => clearTimeout(timer); }, [persist, run]);
  useEffect(() => {
    const hide = () => { if (document.hidden) persist(); };
    window.addEventListener("pagehide", persist);
    document.addEventListener("visibilitychange", hide);
    return () => { persist(); window.removeEventListener("pagehide", persist); document.removeEventListener("visibilitychange", hide); };
  }, [persist]);
  useEffect(() => {
    if (!complete || !stats.complete) return;
    if (checkpoint) recordCheckpointCompletion(progressScope, sessionId, { correct: stats.firstTryCorrect, total: stats.total });
    else recordLessonCompletion(progressScope, sessionId, { answered: stats.answered, assisted: stats.assisted, total: stats.total, firstTryCorrect: stats.firstTryCorrect, hintsUsed: stats.hintsUsed, attempts: stats.attempts });
  }, [checkpoint, complete, progressScope, sessionId, stats]);
  useLayoutEffect(() => {
    if (!moved.current || !question.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = question.current.animate([{ opacity: .3, transform: `translateX(${direction.current * 20}px)` }, { opacity: 1, transform: "translateX(0)" }], { duration: 230, easing: "cubic-bezier(.2,.7,.2,1)" });
    swipe.current = animation;
    return () => { animation.cancel(); if (swipe.current === animation) swipe.current = null; };
  }, [step]);
  useEffect(() => { if (moved.current) heading.current?.focus({ preventScroll: true }); }, [step]);

  function change(nextRun: Run) { interacted.current = true; latest.current = nextRun; setRun(nextRun); }
  function update(patch: Partial<LessonAttempt>) { change({ ...run, attempts: { ...attempts, [slide.id]: { ...attempt, ...patch } } }); }
  function choose(value: string) { update({ input: value, submitted: false, invalid: false, why: false, feedback: "" }); }
  function go(nextStep: number) {
    if (nextStep < 0 || nextStep > journey.slides.length || nextStep === step || (nextStep > step && check && !resolved)) return;
    if (nextStep === journey.slides.length && !stats.complete) return;
    moved.current = true;
    direction.current = nextStep > step ? 1 : -1;
    setHelp(null);
    setPulse(null);
    change({ ...run, step: nextStep });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function advance() {
    if (!hydrated || complete) return;
    if (check && !resolved) {
      if (attempt.submitted) { update({ submitted: false, invalid: false, why: false }); input.current?.focus(); return; }
      const grade = gradeLessonCheck(check, attempt.input);
      if (!grade) { update({ invalid: true, feedback: check.kind === "number" ? "Use a number or a fraction, such as 3/2." : "Choose one answer." }); return; }
      setPulse(previous => ({ id: (previous?.id ?? 0) + 1, slide: slide.id, tone: grade.correct ? "correct" : "incorrect" }));
      update({ ...grade, tries: attempt.tries + 1, submitted: true, invalid: false, firstTryCorrect: grade.correct && attempt.tries === 0 && !attempt.usedHint && !attempt.assisted });
      return;
    }
    go(step + 1);
  }
  function restart() {
    moved.current = true; direction.current = -1;
    setRepeat(value => value + 1); setRevision(0);
    setHelp(null); setPulse(null);
    change({ step: 0, attempts: {} });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const state = complete || (attempt.submitted && attempt.correct) ? "correct" : attempt.submitted || attempt.invalid ? "incorrect" : "idle";
  const primaryLabel = complete ? "Back to lessons" : check && !resolved ? attempt.submitted ? "Try again" : "Check answer" : "Continue";

  return <WorkspaceAppearance><LearnTheme className={styles.shell}>
    <header className={styles.sessionHeader}>
      <Link href={backHref} className={styles.exit} aria-label="Save progress and exit lesson" onClick={persist}><X size={22} /></Link>
      <div className={styles.progressArea}><div className={styles.progress} role="progressbar" aria-label={`${title} progress`} aria-valuemin={0} aria-valuemax={journey.slides.length} aria-valuenow={step}><span style={{ width: `${step / journey.slides.length * 100}%` }} /></div><span className={styles.slideCount}>{complete ? <Check size={18} /> : `${step + 1} / ${journey.slides.length}`}</span></div>
    </header>
    <main className={styles.exercise} data-state={state} data-complete={complete} data-session={sessionId} data-testid="learning-session" onPointerDownCapture={() => { interacted.current = true; }} onKeyDownCapture={() => { interacted.current = true; }}>
      {pulse && pulse.slide === slide.id && !complete && attempt.submitted && <span key={pulse.id} className={styles.feedbackRipple} data-tone={pulse.tone} data-testid="lesson-feedback-ripple" aria-hidden="true" />}
      {complete && <div className={styles.completionRipple} data-testid="completion-ripple" aria-hidden="true"><i /><i /><i /></div>}
      <div className={styles.lessonName}><span>{checkpoint ? "Section checkpoint" : "Desmos skills"}</span><span aria-hidden="true">/</span>{title}</div>
      {step > 0 && !complete && <button type="button" className={styles.previous} onClick={() => go(step - 1)} aria-label="Previous slide"><ArrowLeft size={19} /></button>}
      <div className={styles.content} data-calculator={showCalculator}>
        <section ref={question} className={styles.question} aria-label="Lesson exercise" onClickCapture={event => { if (event.target instanceof Element && event.target.closest('button[aria-label="Full screen"]')) swipe.current?.cancel(); }}>
          {!complete && <><div className={styles.questionHeading}><span className={styles.phase}>{slide.phase}</span>{resumed && <span className={styles.resumeNote}>Lesson resumed</span>}</div><h1 ref={heading} tabIndex={-1}>{slide.title}</h1></>}
          {complete ? <div className={styles.completion} data-testid="lesson-complete">
            <div className={styles.completionSymbol} data-testid="completion-symbol" aria-hidden="true"><span className={styles.completionMedallion}><Check size={52} strokeWidth={2.7} /></span><i /><i /><i /></div>
            <p className={styles.completionLesson}>{title}</p>
            <h1 ref={heading} tabIndex={-1}>{checkpoint ? "Checkpoint complete" : "Lesson complete"}</h1>
            <dl className={styles.completionStats}><div><dt>Exercises finished</dt><dd>{stats.total}<span> / {stats.total}</span></dd></div><div><dt>First try, no hints</dt><dd>{stats.firstTryCorrect}<span> / {stats.total}</span></dd></div><div><dt>{stats.hintsUsed === 1 ? "Hint used" : "Hints used"}</dt><dd>{stats.hintsUsed}</dd></div></dl>
            {stats.assisted > 0 && <p className={styles.assistedNote}>{stats.assisted} {stats.assisted === 1 ? "exercise reviewed" : "exercises reviewed"} with help</p>}
            <ul className={styles.takeaways}>{journey.summary.map(text => <li key={text}><Check size={18} /><span><MathText>{text}</MathText></span></li>)}</ul>
            {next && <Link href={next.href} className={styles.nextLesson} onClick={persist}><span>{next.checkpoint ? "Put it together" : "Up next"}<strong>{next.title}</strong></span><ArrowRight size={22} /></Link>}
            <button type="button" className={styles.textButton} onClick={restart}><RotateCcw size={16} />Practise this lesson again</button>
          </div> : <>
            <div className={styles.teaching}>{slide.body.map(paragraph => <p key={paragraph}><MathText>{paragraph}</MathText></p>)}</div>
            {showExplorer ? <FunctionExplorer /> : slide.visual && <TeachingVisual visual={slide.visual} />}
            {slide.entries && <div className={styles.entries}>{slide.entries.map(entry => <Entry key={entry.latex} {...entry} />)}</div>}
            {showCalculator && <div className={styles.calculator} data-testid="lesson-calculator"><CalculatorVerificationProvider><DesmosCalculator expressions={setup.expressions} bounds={setup.bounds} revision={revision} stateKey={calculatorKey} initialExpressionsOpen showStepTrace={false} /></CalculatorVerificationProvider></div>}
            {slide.note && <p className={styles.note}><Lightbulb size={16} /><MathText>{slide.note}</MathText></p>}
            {check?.kind === "choice" && <fieldset className={styles.answers} disabled={resolved} data-count={check.choices.length}>
              <legend className={styles.srOnly}>{slide.title}</legend>
              {choices.map((choice, index) => <label key={choice.id} data-selected={attempt.input === choice.id} data-correct={attempt.submitted && attempt.correct && attempt.input === choice.id} data-wrong={attempt.submitted && !attempt.correct && attempt.input === choice.id}><input type="radio" name={`${sessionId}-${slide.id}`} value={choice.id} checked={attempt.input === choice.id} onChange={() => choose(choice.id)} aria-describedby={attempt.submitted || attempt.invalid ? feedbackId : undefined} /><span className={styles.answerKey}>{attempt.submitted && attempt.correct && attempt.input === choice.id ? <Check size={16} /> : index + 1}</span><span><MathText>{choice.text}</MathText></span></label>)}
            </fieldset>}
            {check?.kind === "number" && <form className={styles.numberAnswer} onSubmit={event => { event.preventDefault(); advance(); }}>
              <label htmlFor={answerId}>Your answer{check.unit ? <span>{check.unit}</span> : null}</label>
              <div className={styles.inputWrap} data-correct={attempt.correct} data-invalid={attempt.invalid || (attempt.submitted && !attempt.correct)}><input ref={input} id={answerId} inputMode="text" autoComplete="off" spellCheck={false} maxLength={80} placeholder="Type your answer" value={attempt.input} disabled={resolved} onChange={event => choose(event.target.value)} aria-invalid={attempt.invalid || (attempt.submitted && !attempt.correct)} aria-describedby={`${answerId}-format${attempt.submitted || attempt.invalid ? ` ${feedbackId}` : ""}`} />{attempt.correct && <Check size={20} className={styles.inputCheck} />}</div>
              <span id={`${answerId}-format`} className={styles.inputFormat}>A number or fraction, like 3/2</span>
            </form>}
          </>}
        </section>
      </div>
      <footer className={styles.footer}>
        <div className={styles.feedback} id={feedbackId} role="status" aria-live="polite">
          {!complete && (attempt.submitted || attempt.invalid || attempt.assisted) && <div className={styles.feedbackHeading}><span>{resolved ? <Check size={19} /> : <X size={19} />}</span><strong>{attempt.assisted ? "Reviewed with help" : attempt.correct ? "That’s right!" : attempt.invalid ? "Check the format" : "Give it another try"}</strong></div>}
          {!complete && attempt.invalid && <p className={styles.formatFeedback}>{attempt.feedback}</p>}
        </div>
        <div className={styles.actions}>
          {check && (resolved || attempt.tries >= 2) && <button type="button" className={styles.secondary} aria-haspopup="dialog" onClick={() => {
            if (resolved) setHelp(attempt.assisted ? "solution" : "explanation");
            else { update({ assisted: true, submitted: false, invalid: false, firstTryCorrect: false, feedback: check.explanation, hint: false }); setHelp("solution"); }
          }}><span>{resolved ? attempt.assisted ? "Explanation" : "Why?" : "Show me how"}<CircleHelp size={16} /></span></button>}
          {check && !resolved && attempt.tries < 2 && <button type="button" className={styles.hintButton} aria-haspopup="dialog" onClick={() => { update({ hint: false, usedHint: true }); setHelp("hint"); }}><Lightbulb size={18} /><span>Get a hint</span></button>}
          {complete ? <Link href={backHref} className={styles.primary} onClick={persist}><span>Back to lessons<ArrowRight size={18} /></span></Link> : <button type="button" className={styles.primary} disabled={!hydrated || Boolean(check && !resolved && !attempt.submitted && !attempt.input.trim())} onClick={advance}><span>{primaryLabel}{primaryLabel === "Continue" && <ArrowRight size={18} />}</span></button>}
        </div>
      </footer>
    </main>
    {help && check && <LessonHelpModal title={help === "hint" ? "Hint" : help === "solution" ? "Worked solution" : "Explanation"} hint={help === "hint"} onClose={() => setHelp(null)}>
      {help === "hint" ? <>
        {attempt.submitted && !attempt.correct && attempt.feedback !== check.hint && <p><MathText>{attempt.feedback}</MathText></p>}
        <p><MathText>{check.hint}</MathText></p>
      </> : <>
        <p><MathText>{check.explanation}</MathText></p>
        {help === "solution" && check.kind === "number" && <ol>{check.solution.map(text => <li key={text}><MathText>{text}</MathText></li>)}</ol>}
        {help === "solution" && <small>This exercise is marked as reviewed with help</small>}
      </>}
    </LessonHelpModal>}
  </LearnTheme></WorkspaceAppearance>;
}

function Entry({ latex, label }: { latex: string; label: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => { if (status === "idle") return; const timer = setTimeout(() => setStatus("idle"), 2000); return () => clearTimeout(timer); }, [status]);
  return <div className={styles.entry}><span>{label}</span><MathExpression latex={latex} /><button type="button" aria-label={status === "copied" ? "Copied" : `Copy ${label.toLowerCase()}`} onClick={async () => { try { await navigator.clipboard.writeText(latex); setStatus("copied"); } catch { setStatus("failed"); } }}>{status === "copied" ? <Check size={17} /> : <Copy size={17} />}</button>{status === "failed" && <small role="status">Select the expression to copy it.</small>}</div>;
}

function TeachingVisual({ visual }: { visual: LessonVisual }) {
  if (visual.kind === "table") return <figure className={styles.tableVisual}><div><table><thead><tr>{visual.columns.map(column => <th key={column} scope="col"><MathText>{column}</MathText></th>)}</tr></thead><tbody>{visual.rows.map((row, index) => <tr key={index}>{row.map((cell, i) => <td key={i}><MathText>{cell}</MathText></td>)}</tr>)}</tbody></table></div>{visual.caption && <figcaption><MathText>{visual.caption}</MathText></figcaption>}</figure>;
  return <div className={styles.visual} data-kind={visual.kind}>{visual.items.map((item, index) => <div key={item.label} style={{ "--item-index": index } as CSSProperties}><span className={styles.visualLabel}>{item.label}</span>{item.math && <MathExpression latex={item.math} />}{item.text && <p><MathText>{item.text}</MathText></p>}{visual.kind === "flow" && index < visual.items.length - 1 && <ArrowRight size={18} />}</div>)}</div>;
}
