"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CircleHelp } from "lucide-react";
import type { LearnPathId } from "@/lib/learn-catalog";
import styles from "./learn-help.module.css";

export default function LearnHelp({ path }: { path: LearnPathId }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const title = path === "sat" ? "SAT math topics" : "Desmos skills";
  const description = path === "sat"
    ? "Build the math behind SAT questions, from algebra and advanced math to data, geometry, and trigonometry. Guided examples and short checks help you practise each idea and see why an answer works. You’ll also use Desmos where it can make the work clearer or faster. Start with a topic you need, then use its checkpoint to see what needs another look."
    : "Learn to use Desmos for SAT Math, starting with expressions, graphs, and tables, then moving into sliders, lists, and regression. You’ll try the calculator as you go and practise spotting which approach fits a question. Short checks and section checkpoints help you check your understanding before moving on to a new problem.";
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);
  return <div ref={root} className={styles.help}
    onPointerEnter={event => { if (event.pointerType !== "touch") setOpen(true); }}
    onPointerLeave={() => { if (!root.current?.contains(document.activeElement)) setOpen(false); }}
    onFocus={() => setOpen(true)}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}>
    <button type="button" aria-label={`About ${title}`} aria-describedby={open ? id : undefined} onClick={() => setOpen(true)}><CircleHelp size={19} /></button>
    {open && <div id={id} className={styles.tooltip} role="tooltip"><strong>{title}</strong><p>{description}</p></div>}
  </div>;
}
