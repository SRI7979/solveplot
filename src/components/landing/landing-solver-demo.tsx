"use client";

import { useEffect, useRef, useState } from "react";
import { Bookmark, Check, Copy } from "lucide-react";
import type { Solution } from "@/lib/solver-schema";
import type { TutorAnswer } from "@/lib/tutor";
import type { Tutor } from "@/components/tutor-panel";
import explanation from "@/components/solution-explanation.module.css";

/** One fixed question; the normal calculator checks and renders its real rows. */
export const LANDING_SOLUTION: Solution = {
  status: "solved",
  question: "3x^2 − 16x + 2 = 0. One solution can be written as (a + sqrt(b))/6, where a and b are integers. What is a + b?",
  choices: [{ label: "A", text: "66" }, { label: "B", text: "132" }, { label: "C", text: "248" }, { label: "D", text: "296" }],
  structure: "A root is given in terms of two unknown integers.",
  trick: "Bracket regression",
  answer: "C) 248",
  method: "desmos",
  why: "Use the graph’s two x-intercepts to fit a and b in the given root form.",
  handMath: null,
  steps: [],
  readAnswer: "Desmos fits a ≈ 16 and b ≈ 232. The question says both are integers, so round the fitted values. Line 3 gives 248, choice C.",
  expressions: [
    { latex: "y=3x^2-16x+2", purpose: "Graph the equation. Click both x-intercepts: (0.128073, 0) and (5.20526, 0)." },
    { latex: "[(a+\\sqrt{b})/6,(a-\\sqrt{b})/6]\\sim[5.20526,0.128073]", purpose: "Match the plus form to the larger root and the minus form to the smaller root. The ~ sign asks Desmos to fit a and b to those two values." },
    { latex: "\\operatorname{round}(a)+\\operatorname{round}(b)", purpose: "Add the two fitted integers. Rounding removes the small error from clicking the intercepts to a limited number of decimal places." },
  ],
  result: { type: "numeric", row: 3, value: 248, listIndex: null, answerFrom: "value", choiceLabel: "C", detail: "Read the sum in line 3.", relatedRows: [2] },
  answerState: null,
  parameters: [],
  conditionType: null,
  distinguishes: null,
  graphBounds: { left: -1, right: 6.4, bottom: -23, top: 10 },
  clarification: null,
};

const REPLIES: Record<number, TutorAnswer> = {
  1: {
    title: "Reading the x-intercepts",
    meaning: "An x-intercept is a point where the graph crosses the x-axis. At that point y is zero, so its x-coordinate solves the original equation.",
    whyHere: "Line 1 gives the two roots needed in line 2. Click each crossing and copy its x-coordinate.",
    example: null,
    practice: null,
  },
  2: {
    title: "Fitting both unknowns",
    meaning: "The ~ sign tells Desmos to find values of a and b that make the two lists match. There are two unknowns, so both roots are needed.",
    whyHere: "Line 2 matches the plus form to 5.20526 and the minus form to 0.128073. Desmos fits a ≈ 16 and b ≈ 232 together.",
    example: { description: "The fitted values shown by Desmos are:", rows: ["a\\approx16,\\quad b\\approx232"] },
    practice: null,
  },
  3: {
    title: "Rounding the fitted values",
    meaning: "The clicked intercepts have a limited number of decimal places, so the fitted values can be slightly off. The question says a and b are integers.",
    whyHere: "Line 3 rounds each fitted value before adding them. That gives 16 + 232 = 248.",
    example: null,
    practice: null,
  },
};

const DEFAULT_ASK = { selection: { kind: "row" as const, row: 2 }, label: "calculator line 2", question: "Why do I need both roots?" };

/** Local responses keep the public demonstration separate from account requests. */
export function useDemoTutor(initiallyOpen = false): Tutor {
  const [view, setView] = useState<Tutor["view"]>(initiallyOpen
    ? { status: "ready", ask: DEFAULT_ASK, answer: REPLIES[2], practice: { status: "idle" } }
    : { status: "idle" });
  function submit(question: string) {
    if (view.status === "idle") return;
    const row = /round/i.test(question) ? 3 : view.ask.selection.kind === "row" ? view.ask.selection.row : 2;
    setView({ status: "ready", ask: { ...view.ask, question: question.trim() || null }, answer: REPLIES[row] ?? REPLIES[2], practice: { status: "idle" } });
  }
  return {
    enabled: true,
    view,
    openAt: view.status === "idle" ? null : "top",
    open: (selection, label) => setView({ status: "draft", ask: { selection, label, question: selection.kind === "row" && selection.row === 2 ? DEFAULT_ASK.question : null } }),
    submit,
    retry: () => submit(view.status === "idle" ? "" : view.ask.question ?? ""),
    edit: () => { if (view.status !== "idle") setView({ status: "draft", ask: view.ask }); },
    requestPractice: () => {
      if (view.status !== "ready") return;
      setView({ ...view, practice: { status: "ready", problem: "One solution of 2x^2 − 9x + 1 = 0 is (a + sqrt(b))/4, where a and b are integers. Find a + b.", answer: "82", hint: "Graph the quadratic and match both root forms to its two x-intercepts with ~." } });
    },
    close: () => setView({ status: "idle" }),
  };
}

export function DemoSaveButton() {
  const [saved, setSaved] = useState(false);
  return <button type="button" className="secondaryButton" aria-pressed={saved} onClick={() => setSaved(value => !value)}><Bookmark size={15} fill={saved ? "currentColor" : "none"} />{saved ? "Saved" : "Save this trick"}</button>;
}

export function DemoCopyButton({ row }: { row: number }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  async function copy() {
    try {
      await navigator.clipboard.writeText(LANDING_SOLUTION.expressions[row - 1].latex);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch { setCopied(false); }
  }
  return <button type="button" className={`${explanation.copyButton} copyButton`} data-motion="copy" data-copied={copied || undefined} aria-label={`Copy line ${row}`} onClick={() => void copy()}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy"}</button>;
}
