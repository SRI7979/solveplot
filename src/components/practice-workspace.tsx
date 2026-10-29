"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Lightbulb, LoaderCircle, Repeat2, RotateCcw, ScanLine } from "lucide-react";
import type { PracticeChallenge, PracticeError, PracticeGrade, PracticeHint, PracticeRequest, PracticeReveal, PracticeSource } from "@/lib/practice-types";
import type { Solution } from "@/lib/solver-schema";
import { CalculatorVerificationProvider } from "./calculator-verification";
import DesmosCalculator from "./desmos-calculator";
import MathText from "./math-text";
import SolutionExplanation from "./solution-explanation";
import { useGuestAuth } from "./guest-auth-provider";
import styles from "./practice-workspace.module.css";

const EMPTY_EXPRESSIONS: Solution["expressions"] = [];

class PracticeRequestError extends Error {
  constructor(message: string, readonly kind?: PracticeError["kind"], readonly retryAfter?: number, readonly status?: number) {
    super(message);
  }
}

async function requestPractice<T>(body: PracticeRequest, signal: AbortSignal): Promise<T> {
  const response = await fetch("/api/practice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PracticeRequestError(
      payload?.error || "Practice could not load. Please try again.",
      payload?.kind,
      payload?.retryAfter,
      response.status,
    );
  }
  return payload as T;
}

function failure(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export default function PracticeWorkspace({ source, onClose }: { source: PracticeSource; onClose: () => void }) {
  const { requireSignIn, requestSignIn } = useGuestAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const [state, setState] = useState<
    { status: "loading" } |
    { status: "error"; message: string; kind?: PracticeError["kind"] } |
    { status: "ready"; challenge: PracticeChallenge }
  >({ status: "loading" });
  const request = useRef<AbortController | null>(null);
  const previousToken = useRef<string | undefined>(undefined);
  const originalSource = useRef(source);

  const generate = useCallback(async () => {
    if (requireSignIn("practice")) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const challenge = await requestPractice<PracticeChallenge>({ action: "generate", source: originalSource.current, previousToken: previousToken.current }, controller.signal);
      if (controller.signal.aborted) return;
      previousToken.current = challenge.token;
      setState({ status: "ready", challenge });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof PracticeRequestError && error.status === 401) requestSignIn("practice");
      if (error instanceof PracticeRequestError && error.kind === "expired") previousToken.current = undefined;
      setState({ status: "error", message: failure(error), kind: error instanceof PracticeRequestError ? error.kind : undefined });
    }
  }, [requireSignIn, requestSignIn]);

  function generateAnother() {
    setState({ status: "loading" });
    void generate();
  }

  useEffect(() => {
    dialog.current?.showModal();
    heading.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void generate();
    return () => {
      request.current?.abort();
      document.body.style.overflow = previousOverflow;
    };
  }, [generate]);

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={headingId} onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className={styles.toolbar}>
        <button type="button" className="outlinedControl" onClick={onClose}><ArrowLeft size={17} />{source.kind === "lesson" ? "Back to lesson" : "Original problem"}</button>
        <h2 ref={heading} id={headingId} tabIndex={-1}>Practice this trick</h2>
        <span className={styles.toolbarLabel}>Practice</span>
      </header>
      {state.status === "loading" ? <div className={styles.loading} role="status"><LoaderCircle size={25} className={styles.spinner} /><h3>Preparing your question</h3><p>Keeping the same technique with different values.</p></div>
        : state.status === "error" ? <div className={styles.loading} role="alert"><h3>{state.kind === "unsupported" ? "Practice isn’t available for this method yet" : "Your question couldn’t load"}</h3><p>{state.message}</p><div className={styles.buttonRow}>{state.kind !== "unsupported" && <button type="button" className="secondaryButton" onClick={generateAnother}><RotateCcw size={16} /> Try again</button>}<button type="button" className="outlinedControl" onClick={onClose}>{source.kind === "lesson" ? "Back to lesson" : "Back to your solution"}</button></div></div>
        : <Exercise key={state.challenge.exercise.id} challenge={state.challenge} onAnother={generateAnother} />}
    </dialog>
  );
}

function Exercise({ challenge, onAnother }: { challenge: PracticeChallenge; onAnother: () => void }) {
  const { requireSignIn, requestSignIn } = useGuestAuth();
  const { exercise, token } = challenge;
  const answerId = useId();
  const feedbackId = useId();
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<PracticeGrade | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [pending, setPending] = useState<"grade" | "hint" | "reveal" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(true);
  const [calculatorRevision, setCalculatorRevision] = useState(0);
  const calculator = useRef<HTMLElement>(null);
  const solutionHeading = useRef<HTMLHeadingElement>(null);
  const request = useRef<AbortController | null>(null);
  const busy = useRef(false);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (solution) solutionHeading.current?.focus(); }, [solution]);

  async function perform(action: "grade" | "hint" | "reveal") {
    if (busy.current || expired) return;
    if (requireSignIn("practice")) return;
    busy.current = true;
    const controller = new AbortController();
    request.current = controller;
    setPending(action);
    setError(null);
    try {
      if (action === "grade") {
        const result = await requestPractice<PracticeGrade>({ action, token, answer: answer.trim() }, controller.signal);
        if (!controller.signal.aborted) setGrade(result);
      } else if (action === "hint") {
        const result = await requestPractice<PracticeHint>({ action, token }, controller.signal);
        if (!controller.signal.aborted) setHint(result.hint);
      } else {
        const result = await requestPractice<PracticeReveal>({ action, token }, controller.signal);
        if (!controller.signal.aborted) setSolution(result.solution);
      }
    } catch (reason) {
      if (!controller.signal.aborted) {
        if (reason instanceof PracticeRequestError && reason.status === 401) requestSignIn("practice");
        setError(failure(reason));
        setExpired(reason instanceof PracticeRequestError && reason.kind === "expired");
      }
    } finally {
      if (!controller.signal.aborted) setPending(null);
      busy.current = false;
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (answer.trim()) void perform("grade");
  }

  function showCalculator() {
    setCalculatorOpen(true);
    requestAnimationFrame(() => calculator.current?.scrollIntoView({ behavior: "instant", block: "nearest" }));
  }

  return (
    <CalculatorVerificationProvider>
      <div className={styles.exercise} data-calculator-open={calculatorOpen && exercise.calculatorUseful}>
        <div className={styles.work}>
          <div className={styles.technique}><Repeat2 size={17} />{exercise.techniqueName}</div>
          <section className={styles.question} aria-label="Practice question"><MathText>{exercise.question}</MathText></section>
          <form onSubmit={submit} className={styles.answerForm}>
            {exercise.answerFormat === "choice" && exercise.choices ? <fieldset disabled={Boolean(pending) || Boolean(solution) || expired}><legend>Your answer</legend><div className={styles.choices}>{exercise.choices.map((choice) => <label key={choice.label} className={styles.choice} data-selected={answer === choice.label}><input type="radio" name={answerId} value={choice.label} checked={answer === choice.label} onChange={() => { setAnswer(choice.label); setGrade(null); }} /><span className={styles.choiceLetter}>{choice.label}</span><MathText>{choice.text}</MathText></label>)}</div></fieldset>
              : <><label htmlFor={answerId}>Your answer</label><div className={styles.answerInput}><input id={answerId} autoComplete="off" spellCheck={false} value={answer} maxLength={80} placeholder="Enter a number or fraction" aria-describedby={grade ? feedbackId : undefined} disabled={Boolean(pending) || Boolean(solution) || expired} onChange={(event) => { setAnswer(event.target.value); setGrade(null); }} /></div></>}
            {!solution && <div className={styles.buttonRow}><button type="submit" className="primaryButton" disabled={!answer.trim() || Boolean(pending) || expired}>{pending === "grade" ? <LoaderCircle size={17} className={styles.spinner} /> : <Check size={17} />} Check answer</button><button type="button" className="outlinedControl" disabled={Boolean(pending) || Boolean(hint) || expired} onClick={() => void perform("hint")}><Lightbulb size={16} />{pending === "hint" ? "Getting hint…" : "Give me a hint"}</button></div>}
          </form>
          {grade && <div id={feedbackId} className={styles.feedback} data-correct={grade.correct} role="status"><strong>{grade.correct ? "Correct" : "Not quite"}</strong><p>{grade.feedback}</p></div>}
          {hint && <aside className={styles.hint}><Lightbulb size={18} /><div><h3>Hint</h3><p><MathText>{hint}</MathText></p></div></aside>}
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.nextActions}>
            {!solution && <button type="button" className="secondaryButton" disabled={Boolean(pending) || expired} onClick={() => void perform("reveal")}>{pending === "reveal" ? "Loading solution…" : "Show solution"}<ChevronDown size={16} /></button>}
            <button type="button" className={solution || grade?.correct ? "primaryButton" : "outlinedControl"} disabled={Boolean(pending)} onClick={onAnother}>Try another<ArrowRight size={16} /></button>
          </div>
          {solution && <section className={styles.solution}><h3 tabIndex={-1} ref={solutionHeading}>Solution</h3><SolutionExplanation solution={solution} onShowCalculator={showCalculator} /></section>}
        </div>
        {exercise.calculatorUseful && <section ref={calculator} className={styles.calculator} aria-label="Practice calculator"><button type="button" className={`${styles.calculatorToggle} outlinedControl`} aria-expanded={calculatorOpen} onClick={() => setCalculatorOpen((value) => !value)}><ScanLine size={17} />{calculatorOpen ? "Hide calculator" : "Open calculator"}<ChevronDown size={16} /></button><div className={styles.calculatorBody} hidden={!calculatorOpen}><DesmosCalculator expressions={solution?.expressions ?? EMPTY_EXPRESSIONS} bounds={solution?.graphBounds ?? null} answerState={solution?.answerState ?? null} revision={calculatorRevision + (solution ? 1 : 0)} stateKey={`practice:${exercise.id}`} initialExpressionsOpen /><div className={styles.calculatorNote}><span>{solution ? "Solution entries are loaded." : "Use Desmos to work through the question."}</span>{!solution && <button type="button" className="textControl" onClick={() => setCalculatorRevision((value) => value + 1)}>Clear calculator</button>}</div></div></section>}
      </div>
    </CalculatorVerificationProvider>
  );
}
