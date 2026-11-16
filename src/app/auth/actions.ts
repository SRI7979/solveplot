"use server";

import { captureSignup } from "@/lib/posthog-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { googleAuthorizationUrl } from "@/lib/google-oauth";
import { getSiteOrigin, getSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthMode = "signin" | "signup" | "forgot" | "reset" | "resend";
export type AuthState = {
  error?: string;
  message?: string;
  authenticated?: boolean;
  verificationEmail?: string;
  resendAvailable?: boolean;
  retryAt?: number;
};

const verificationMessage = "If this address needs verification, check your inbox and spam folder for a link. Already have a verified account? Sign in instead. This response does not confirm email delivery.";
const emailCooldownMs = 60_000;

// A per-browser courtesy cooldown, not an anti-abuse boundary. Supabase still
// enforces its own email/IP limits. No email addresses or credentials in this cookie.
async function reserveVerificationRequest(origin: string) {
  const jar = await cookies();
  const now = Date.now();
  const deadline = Number(jar.get("solveplot-verification-retry")?.value);
  if (Number.isFinite(deadline) && deadline > now && deadline <= now + emailCooldownMs) {
    return { allowed: false, retryAt: deadline };
  }
  const retryAt = now + emailCooldownMs;
  jar.set("solveplot-verification-retry", String(retryAt), {
    httpOnly: true, secure: origin.startsWith("https:"), sameSite: "lax", path: "/", maxAge: 60,
  });
  return { allowed: true, retryAt };
}

const emailSchema = z.email().max(254);
const passwordSchema = z.string().min(8).max(128);

export async function authenticate(_previous: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseConfig()) return { error: "Sign-in is not configured yet." };
  const mode = form.get("mode");
  const next = safeAuthRedirect(form.get("next"));
  const email = emailSchema.safeParse(String(form.get("email") ?? "").trim());
  const password = form.get("password");

  if (!["signin", "signup", "forgot", "reset", "resend"].includes(String(mode))) {
    return { error: "Choose a sign-in option and try again." };
  }
  if (mode !== "reset" && !email.success) return { error: "Enter a valid email address." };
  if (mode === "signin" && (typeof password !== "string" || !password || password.length > 128)) {
    return { error: "Enter your password." };
  }
  if ((mode === "signup" || mode === "reset") && !passwordSchema.safeParse(password).success) {
    return { error: "Use a password between 8 and 128 characters." };
  }
  if (mode === "reset" && password !== form.get("confirmPassword")) {
    return { error: "Your passwords do not match." };
  }

  const origin = getSiteOrigin();
  if ((mode === "signup" || mode === "forgot" || mode === "resend") && !origin) {
    return { error: "Email sign-up is not configured yet. Set the app's site URL first." };
  }

  let verificationAttempt: AuthState = {};
  try {
    const client = await createClient();
    if (mode === "forgot" && email.success && origin) {
      const callback = new URL("/auth/callback", origin);
      callback.searchParams.set("recovery", "1");
      const { error } = await client.auth.resetPasswordForEmail(email.data, { redirectTo: callback.toString() });
      if (error?.status === 429) return { error: "Too many requests. Wait a minute and try again." };
      if (error) return { error: "We could not send a reset email. Please try again shortly." };
      return { message: "If an account exists for that email, a password reset link is on its way." };
    }
    if ((mode === "signup" || mode === "resend") && email.success && origin) {
      const cooldown = await reserveVerificationRequest(origin);
      const verification = { verificationEmail: email.data, retryAt: cooldown.retryAt, resendAvailable: mode === "resend" };
      verificationAttempt = verification;
      if (!cooldown.allowed) return { ...verification, error: "Please wait a minute between verification email requests." };
      const callback = new URL("/auth/callback", origin);
      callback.searchParams.set("next", next);
      const options = { emailRedirectTo: callback.toString() };
      // Resend does not need a password or a session. Supabase decides whether
      // the address is eligible; never expose account existence in our response.
      const result = mode === "resend"
        ? await client.auth.resend({ type: "signup", email: email.data, options })
        : await client.auth.signUp({ email: email.data, password: password as string, options });
      const { error } = result;
      if (error?.status === 429 || error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
        return { ...verification, error: "Too many email requests. Wait at least a minute before trying again. If this continues, try again later." };
      }
      // Some provider configurations return explicit account-existence errors.
      // Give these the same response as the usual obfuscated HTTP 200 result.
      if (error && ["user_already_exists", "email_exists", "email_address_not_found", "user_not_found"].includes(error.code ?? "")) {
        return { ...verification, resendAvailable: true, message: verificationMessage };
      }
      if (error) {
        // Safe operational diagnostics: no email, provider message, or tokens.
        console.warn("[auth] verification request failed", { operation: mode, status: error.status, code: error.code });
        return { ...verification, error: error.code === "weak_password"
          ? "Choose a stronger password and try again."
          : "We couldn’t request a verification email right now. Please try again shortly. If this continues, contact support." };
      }
      if (mode === "resend") return { ...verification, resendAvailable: true, message: verificationMessage };
      const data = result.data;
      if (data && "user" in data && data.user?.id && (data.user.identities?.length ?? 0) > 0) captureSignup(data.user.id, "email");
      // A signup response without a session is not an authenticated account,
      // nor proof that an email was sent (confirmed accounts are obfuscated).
      if (!data || !("session" in data) || !data.session) return { ...verification, resendAvailable: true, message: verificationMessage };
    } else if (mode === "signin" && email.success) {
      const { error } = await client.auth.signInWithPassword({ email: email.data, password: password as string });
      if (error?.status === 429) return { error: "Too many sign-in attempts. Wait a minute and try again." };
      if (error) return { error: "Check your email and password, and confirm your email if you just signed up." };
    } else if (mode === "reset") {
      const { data: user, error: userError } = await client.auth.getUser();
      if (userError || !user.user) return { error: "Your reset link has expired. Request a new one." };
      const { error } = await client.auth.updateUser({ password: password as string });
      if (error) return { error: "We could not update your password. Use a different password or request a new reset link." };
    }
  } catch {
    return { ...verificationAttempt, error: "Sign-in is temporarily unavailable. Please try again." };
  }

  revalidatePath("/", "layout");
  if (form.get("presentation") === "modal") return { authenticated: true };
  redirect(next);
}

export async function signInWithGoogle(_previous: AuthState, form: FormData): Promise<AuthState> {
  const config = getSupabaseConfig();
  const origin = getSiteOrigin();
  if (!config || !origin) return { error: "Google sign-in is not configured yet." };

  let url: string | null;
  try {
    const client = await createClient();
    url = await googleAuthorizationUrl(client.auth, origin, config.url, form.get("next"));
  } catch {
    return { error: "Google sign-in is temporarily unavailable. Please try again." };
  }
  if (!url) return { error: "Google sign-in could not start. Please try again." };
  redirect(url);
}

export async function signOut() {
  if (getSupabaseConfig()) {
    const client = await createClient();
    const { error } = await client.auth.signOut({ scope: "local" });
    if (error) redirect("/login?notice=signout-error");
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
