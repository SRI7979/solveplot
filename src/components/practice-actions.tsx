"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, BookOpen, Repeat2 } from "lucide-react";
import { getLessonForTechnique, getLessonHref } from "@/lib/learn-catalog";
import { TECHNIQUES } from "@/lib/technique-vocabulary";
import type { PracticeSource } from "@/lib/practice-types";
import { useGuestAuth } from "./guest-auth-provider";
import styles from "./practice-workspace.module.css";

const PracticeWorkspace = dynamic(() => import("./practice-workspace"));

/** Shared by the current solution and a solution reopened from history. */
export default function PracticeActions({ source, techniqueName }: {
  source: PracticeSource;
  techniqueName: string | null;
}) {
  const { requireSignIn } = useGuestAuth();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const technique = TECHNIQUES.find((item) => item.name === techniqueName);
  const lesson = source.kind === "lesson" ? null : getLessonForTechnique(technique?.id);
  const sourceKey = source.kind === "solve" ? `${source.cacheKey}:${source.methodId}` : source.kind === "history" ? source.problemId : `lesson:${source.slug}`;

  function close() {
    setOpen(false);
    requestAnimationFrame(() => trigger.current?.focus());
  }

  return (
    <div className={styles.actions} data-tutor-ignore>
      <button ref={trigger} type="button" className="secondaryButton" onClick={() => {
        if (!requireSignIn("practice")) setOpen(true);
      }} aria-haspopup="dialog">
        <Repeat2 size={17} /> Practice this trick <ArrowRight size={16} />
      </button>
      {lesson && <Link href={getLessonHref(lesson)} className={styles.lessonLink}>
        <BookOpen size={16} />
        <span>Learn {lesson.title}<small>Example and interactive lesson</small></span>
      </Link>}
      {open && <PracticeWorkspace key={sourceKey} source={source} onClose={close} />}
    </div>
  );
}
