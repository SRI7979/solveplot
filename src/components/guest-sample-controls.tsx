"use client";

import Link from "next/link";
import { ArrowRight, Bookmark, BookOpen, Repeat2 } from "lucide-react";
import { useGuestAuth } from "./guest-auth-provider";
import type { Tutor } from "./tutor-panel";
import explanation from "./solution-explanation.module.css";
import practice from "./practice-workspace.module.css";

/** A public example has no owned solve ID. Its account actions ask for sign-in. */
export function useGuestSampleTutor(): Tutor {
  const { requestSignIn } = useGuestAuth();
  const ask = () => requestSignIn("tutor", "/solve");
  return {
    enabled: true,
    view: { status: "idle" },
    openAt: null,
    open: ask,
    submit: ask,
    retry: ask,
    edit: ask,
    requestPractice: () => requestSignIn("practice", "/solve"),
    close: () => {},
  };
}

export function GuestSampleSaveButton() {
  const { requestSignIn } = useGuestAuth();
  return <button type="button" className={`${explanation.copyButton} secondaryButton`} onClick={() => requestSignIn("save", "/solve")}>
    <Bookmark size={15} /> Save this trick
  </button>;
}

export function GuestSamplePracticeActions() {
  const { requestSignIn } = useGuestAuth();
  return <div className={practice.actions} data-tutor-ignore>
    <button type="button" className="secondaryButton" onClick={() => requestSignIn("practice", "/solve")} aria-haspopup="dialog">
      <Repeat2 size={17} /> Practice this trick <ArrowRight size={16} />
    </button>
    <Link href="/learn/bracket-regression" className={practice.lessonLink}>
      <BookOpen size={16} /><span>Learn Bracket regression<small>Example and interactive lesson</small></span>
    </Link>
  </div>;
}
