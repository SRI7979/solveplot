"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AuthForm } from "@/app/login/auth-form";
import type { AuthMode } from "@/app/auth/actions";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { WorkspaceAppearance } from "./appearance-provider";
import styles from "./guest-auth-provider.module.css";
import authStyles from "@/app/login/page.module.css";

export type SignInReason = "solve" | "save" | "practice" | "lesson" | "tutor" | "account";
type BeforeSignIn = () => void | Promise<void>;
type SignInRequest = { reason: SignInReason; next: string; beforeRedirect?: BeforeSignIn };
type OpenSignIn = (reason: SignInReason, next?: string, beforeRedirect?: BeforeSignIn) => void;

const ModalContext = createContext<{ requestSignIn: OpenSignIn; close: () => void; registerBeforeSignIn: (callback: BeforeSignIn) => () => void } | null>(null);
const GuestContext = createContext(true);
const descriptions: Record<SignInReason, string> = {
  solve: "Sign in to solve your question and keep the solution in History.",
  save: "Sign in to keep this technique in Saved tricks.",
  practice: "Sign in to practice this technique with a new question.",
  lesson: "Sign in to start lessons and checkpoints.",
  tutor: "Sign in to ask the AI Tutor about this step.",
  account: "Sign in to see your saved questions and account.",
};

/** The dialog is shared across workspace pages; authorization stays on the server. */
export default function GuestAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [request, setRequest] = useState<SignInRequest | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const pendingDraft = useRef<BeforeSignIn | undefined>(undefined);
  const registerBeforeSignIn = useCallback((callback: BeforeSignIn) => {
    pendingDraft.current = callback;
    return () => { if (pendingDraft.current === callback) pendingDraft.current = undefined; };
  }, []);
  const close = useCallback(() => {
    setRequest(null);
    requestAnimationFrame(() => {
      if (opener.current?.isConnected) opener.current.focus();
    });
  }, []);
  const requestSignIn = useCallback<OpenSignIn>((reason, next, beforeRedirect) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRequest({ reason, next: safeAuthRedirect(next ?? pathname), beforeRedirect: beforeRedirect ?? pendingDraft.current });
  }, [pathname]);
  const value = useMemo(() => ({ requestSignIn, close, registerBeforeSignIn }), [requestSignIn, close, registerBeforeSignIn]);
  return (
    <ModalContext.Provider value={value}>
      {children}
      {request && <WorkspaceAppearance className={authStyles.entry}>
        <SignInDialog request={request} onClose={close} />
      </WorkspaceAppearance>}
    </ModalContext.Provider>
  );
}

/** Pass the verified server result directly, without a guest/authenticated hydration flash. */
export function GuestAuthScope({ authenticated, children }: { authenticated: boolean; children: ReactNode }) {
  return <GuestContext.Provider value={!authenticated}>{children}</GuestContext.Provider>;
}

export function useGuestAuth() {
  const modal = useContext(ModalContext);
  const isGuest = useContext(GuestContext);
  const requestSignIn = useCallback<OpenSignIn>((reason, next, beforeRedirect) => {
    if (!modal) throw new Error("GuestAuthProvider is required for sign-in.");
    modal.requestSignIn(reason, next, beforeRedirect);
  }, [modal]);
  const requireSignIn = useCallback((reason: SignInReason, next?: string, beforeRedirect?: BeforeSignIn) => {
    if (!isGuest) return false;
    requestSignIn(reason, next, beforeRedirect);
    return true;
  }, [isGuest, requestSignIn]);
  const registerBeforeSignIn = useCallback((callback: BeforeSignIn) => {
    return modal?.registerBeforeSignIn(callback) ?? (() => {});
  }, [modal]);
  return { isGuest, requireSignIn, requestSignIn, registerBeforeSignIn };
}

export function GuestSignInButton({ children = "Sign in", className = "secondaryButton", next, reason = "account" }: {
  children?: ReactNode;
  className?: string;
  next?: string;
  reason?: SignInReason;
}) {
  const { requestSignIn } = useGuestAuth();
  return <button type="button" className={className} onClick={() => requestSignIn(reason, next)}>{children}</button>;
}

function SignInDialog({ request, onClose }: { request: SignInRequest; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const [mode, setMode] = useState<AuthMode>("signin");
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    dialog.current?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  return (
    <dialog ref={dialog} className={`${authStyles.card} ${styles.dialog}`} aria-labelledby={headingId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={styles.body}>
        <button type="button" className={`${styles.close} iconControl`} aria-label="Close sign-in" onClick={onClose}><X size={20} /></button>
        <AuthForm key={mode} mode={mode} next={request.next} headingId={headingId}
          description={descriptions[request.reason]} onModeChange={setMode}
          beforeRedirect={request.beforeRedirect}
          onAuthenticated={() => { onClose(); if (request.next !== pathname) router.push(request.next); else router.refresh(); }} />
        <button type="button" className={`${styles.browse} textControl`} onClick={onClose}>Keep browsing</button>
      </div>
    </dialog>
  );
}
