"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { MailCheck } from "lucide-react";
import {
  authenticate,
  signInWithGoogle,
  type AuthMode,
  type AuthState,
} from "@/app/auth/actions";
import styles from "./page.module.css";

const titles: Record<AuthMode, string> = {
  signin: "Welcome back",
  signup: "Create your account",
  forgot: "Reset your password",
  reset: "Choose a new password",
  resend: "Verify your email",
};

const labels: Record<AuthMode, string> = {
  signin: "Sign in",
  signup: "Create account",
  forgot: "Send reset link",
  reset: "Save password",
  resend: "Resend verification email",
};

export function AuthForm({
  mode,
  next,
  notice,
  headingId,
  description,
  onModeChange,
  beforeRedirect,
  onAuthenticated,
}: {
  mode: AuthMode;
  next: string;
  notice?: string;
  headingId?: string;
  description?: string;
  onModeChange?: (mode: AuthMode) => void;
  beforeRedirect?: () => void | Promise<void>;
  onAuthenticated?: () => void;
}) {
  // React actions reset uncontrolled fields on completion, including responses
  // with validation errors or an email-confirmation message. Keep these values
  // only in this mounted form; never return passwords in server action state.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    beforeRedirect ? async (previous, form) => {
      try { await beforeRedirect(); }
      catch { return { error: "Your question couldn’t be kept while signing in. Please try again." }; }
      return authenticate(previous, form);
    } : authenticate,
    {},
  );
  const [googleState, googleAction, googlePending] = useActionState<
    AuthState,
    FormData
  >(beforeRedirect ? async (previous, form) => {
    try { await beforeRedirect(); }
    catch { return { error: "Your question couldn’t be kept while signing in. Please try again." }; }
    return signInWithGoogle(previous, form);
  } : signInWithGoogle, {});
  useEffect(() => { if (state.authenticated) { window.dispatchEvent(new Event("solveplot:auth-changed")); onAuthenticated?.(); } }, [state.authenticated, onAuthenticated]);
  const modeLink = (target: string) =>
    `/login?mode=${target}&next=${encodeURIComponent(next)}`;
  const showGoogle = mode === "signin" || mode === "signup";
  const verificationVisible = (mode === "signup" || mode === "resend") && state.verificationEmail === email.trim();
  const verificationAccepted = verificationVisible && Boolean(state.resendAvailable);
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (!state.retryAt) return;
    const deadline = state.retryAt;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (!remaining) window.clearInterval(interval);
    };
    const first = window.setTimeout(update, 0);
    const interval = window.setInterval(update, 1000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, [state.retryAt]);
  const emailCoolingDown = (mode === "signup" || mode === "resend") && secondsLeft > 0;

  return (
    <>
      <h1 id={headingId}>{titles[mode]}</h1>
      <p className={styles.subtitle}>
        {mode === "resend"
          ? "Request a new link using the email you signed up with."
          : mode === "forgot"
          ? "We’ll email you a link to choose a new password."
          : mode === "reset"
            ? "Use at least 8 characters."
            : description ?? "Sign in to solve a question or open your history."}
      </p>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      {showGoogle && (
        <>
          <form action={googleAction} className={styles.oauthForm}>
            <input type="hidden" name="next" value={next} />
            <button
              type="submit"
              className={`${styles.googleButton} secondaryButton`}
              disabled={googlePending || pending}
            >
              <svg
                className={styles.googleIcon}
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="#4285F4"
                  d="M21.35 12.24c0-.7-.06-1.4-.18-2.08H12v3.94h5.24a4.49 4.49 0 0 1-1.94 2.94v2.44h3.14c1.84-1.7 2.91-4.2 2.91-7.24Z"
                />
                <path
                  fill="#34A853"
                  d="M12 21.5c2.62 0 4.82-.87 6.43-2.36l-3.14-2.44c-.87.59-1.99.94-3.29.94-2.53 0-4.68-1.71-5.45-4.01H3.31v2.51A9.72 9.72 0 0 0 12 21.5Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.55 13.63a5.86 5.86 0 0 1 0-3.76V7.36H3.31a9.5 9.5 0 0 0 0 8.78l3.24-2.51Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.86c1.39 0 2.64.48 3.62 1.43l2.72-2.72A9.25 9.25 0 0 0 12 2.5a9.72 9.72 0 0 0-8.69 4.86l3.24 2.51c.77-2.3 2.92-4.01 5.45-4.01Z"
                />
              </svg>
              {googlePending ? "Connecting to Google…" : "Continue with Google"}
            </button>
            {googleState.error && (
              <p role="alert" className={styles.error}>
                {googleState.error}
              </p>
            )}
          </form>
          <p className={styles.divider}>
            <span>or continue with email</span>
          </p>
        </>
      )}
      <form action={action} className={styles.form}>
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next} />
        {onAuthenticated && <input type="hidden" name="presentation" value="modal" />}
        {mode !== "reset" && (
          <label className={styles.field}>
            Email
            <input
              className="appField"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              maxLength={254}
              disabled={pending || googlePending}
            />
          </label>
        )}
        {mode !== "forgot" && mode !== "resend" && (
          <label className={styles.field}>
            {mode === "reset" ? "New password" : "Password"}
            <input
              className="appField"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "signin" ? 1 : 8}
              maxLength={128}
              disabled={pending || googlePending}
            />
          </label>
        )}
        {mode === "reset" && (
          <label className={styles.field}>
            Confirm password
            <input
              className="appField"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={128}
              disabled={pending || googlePending}
            />
          </label>
        )}
        {mode === "signin" && (
          onModeChange ? <button type="button" className={`${styles.forgot} ${styles.modeButton}`} onClick={() => onModeChange("forgot")} disabled={pending || googlePending}>Forgot password?</button>
            : <Link className={styles.forgot} href={modeLink("forgot")}>Forgot password?</Link>
        )}
        {state.error && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        {state.message && (!(mode === "signup" || mode === "resend") || verificationVisible) && (
          <div role="status" aria-live="polite" className={styles.emailNotice}>
            <span className={styles.emailNoticeIcon} aria-hidden="true"><MailCheck size={22} strokeWidth={1.7} /></span>
            <div>
              <h2>{verificationAccepted ? "Check your inbox for a verification link." : "Check your inbox"}</h2>
              <p>{state.message}</p>
              <p className={styles.emailNoticeHint}>{verificationAccepted ? "Open the latest link in this browser to finish signing up." : "Can’t find it? Check your spam folder."}</p>
            </div>
          </div>
        )}
        {!(mode === "signup" && verificationAccepted) && <button
          type="submit"
          className={`${styles.button} primaryButton`}
          disabled={pending || googlePending || emailCoolingDown}
        >
          {pending ? "Please wait…" : labels[mode]}
        </button>}
      </form>
      {mode === "signup" && verificationAccepted && (
        <form action={action} className={styles.resendForm}>
          <input type="hidden" name="mode" value="resend" />
          <input type="hidden" name="email" value={email.trim()} />
          <input type="hidden" name="next" value={next} />
          <button type="submit" className={`${styles.button} secondaryButton`} disabled={pending || googlePending || emailCoolingDown}>
            {pending ? "Requesting link…" : "Resend verification email"}
          </button>
        </form>
      )}
      {emailCoolingDown && <p className={styles.cooldown}>You can request another link in {secondsLeft}s.</p>}
      {mode === "signin" && <p className={styles.switchMode}>
        {onModeChange
          ? <button type="button" className={styles.modeButton} onClick={() => onModeChange("resend")} disabled={pending || googlePending}>Need a verification email?</button>
          : <Link href={modeLink("resend")}>Need a verification email?</Link>}
      </p>}
      <p className={styles.switchMode}>
        {mode === "signin" ? (
          <>
            New here? {onModeChange ? <button type="button" className={styles.modeButton} onClick={() => onModeChange("signup")} disabled={pending || googlePending}>Create an account</button> : <Link href={modeLink("signup")}>Create an account</Link>}
          </>
        ) : (
          onModeChange ? <button type="button" className={styles.modeButton} onClick={() => onModeChange("signin")} disabled={pending || googlePending}>Back to sign in</button> : <Link href={modeLink("signin")}>Back to sign in</Link>
        )}
      </p>
    </>
  );
}
