"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { CircleHelp, Lightbulb, X } from "lucide-react";
import styles from "./lesson-help-modal.module.css";

/** A native dialog keeps focus and calculator interaction inside the active help. */
export default function LessonHelpModal({ title, hint = false, children, onClose }: {
  title: string; hint?: boolean; children: ReactNode; onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const opener = useRef<HTMLElement | null>(null);
  const backdropPointer = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
    };
  }, []);

  function isOutside(clientX: number, clientY: number) {
    const bounds = dialog.current?.getBoundingClientRect();
    return Boolean(bounds && (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom));
  }

  function keepFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (!first || !last) return;
    if (controls.length === 1 || (!event.shiftKey && document.activeElement === last) || (event.shiftKey && document.activeElement === first)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId}
    onKeyDown={keepFocus}
    onCancel={event => { event.preventDefault(); onClose(); }}
    onPointerDown={event => { backdropPointer.current = event.target === event.currentTarget && isOutside(event.clientX, event.clientY); }}
    onClick={event => { if (backdropPointer.current && event.target === event.currentTarget && isOutside(event.clientX, event.clientY)) onClose(); backdropPointer.current = false; }}>
    <header className={styles.header}>
      <span className={styles.icon} aria-hidden="true">{hint ? <Lightbulb size={21} /> : <CircleHelp size={21} />}</span>
      <h2 id={titleId}>{title}</h2>
      <button type="button" className={styles.close} aria-label={`Close ${title.toLowerCase()}`} autoFocus onClick={onClose}><X size={21} /></button>
    </header>
    <div className={styles.body}>{children}</div>
  </dialog>;
}
