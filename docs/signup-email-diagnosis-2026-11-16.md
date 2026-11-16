# Signup verification email investigation — November 16, 2026

## Finding and limits

The supplied Supabase Auth log, `User repeated signup: request completed`, is emitted by the already-confirmed-user path in Supabase Auth. That path deliberately returns an obfuscated signup response without requesting a confirmation email. An existing Google identity can also explain why that email address is already confirmed. This explains **the supplied attempt**, not every possible missing email. The app incorrectly treated any sessionless signup response as evidence that a confirmation email had been sent.

This is supported by [Supabase's signup implementation](https://github.com/supabase/auth/blob/master/internal/api/signup.go) (`IsConfirmed`, `UserExistsError`, `UserRepeatedSignUpAction`, and `sanitizeUser`) and its [identity-linking documentation](https://supabase.com/docs/guides/auth/auth-identity-linking). Source was reviewed on November 16, 2026; the exact deployed Auth version and target account were not inspected.

Read-only checks against the project configured in the active checkout (`jwfrozzoknimldsmexgq.supabase.co`) returned:

- Email and Google providers enabled.
- Signup enabled.
- `mailer_autoconfirm: false`: email confirmation is required.

No authenticated Supabase/Resend dashboard or Management API connection was available. The Vercel environment export returned redacted sensitive values, so matching production's project URL/key to the local project remains unverified. Saved custom SMTP settings, the actual template, redirect allowlist, email hooks, rate limits, and provider delivery logs **have not been verified**. Empty Resend activity does not establish an SMTP defect: this particular existing-account request never reaches SMTP.

No live signup, resend, password-reset email, remote configuration mutation, migration, or deployment was performed.

## Local changes

- Signup responses now use conditional verification wording and explicitly distinguish request acceptance from delivery.
- A passwordless `Resend verification email` action uses `auth.resend({type: 'signup', ...})` with the same safe callback destination as signup.
- The sign-in page and guest modal provide a `Need a verification email?` route to resend, including for unconfirmed accounts that left the original signup form.
- Signup/resend share a 60-second per-browser courtesy cooldown, stored in an HTTP-only cookie without an email address. Supabase's server rate limits remain the actual anti-abuse protection. Provider rate limits get useful messages and a retry countdown; the UI does not promise that the provider's quota resets after 60 seconds.
- Explicit account-existence errors receive the same neutral confirmation message. No admin account lookup or auto-confirm mechanism is added.
- Email/password input values remain in the mounted form only. Resend submits only the email, mode, and safe destination, never the password.
- Provider failures are not presented as success. Developer diagnostics log only operation, provider status, and error code, never the email, provider message, password, or tokens.
- Existing Google OAuth, password recovery, PKCE callback, and token-hash confirmation routes remain intact.

## Dashboard checks (do not disable confirmation)

1. In Vercel's **SolvePlot** project, compare the production Supabase URL and publishable/anon key with the intended Supabase project. Do this privately; do not paste keys into logs or chats. Check the public site URL is `https://solveplot.com`. Localhost is appropriate only for local development.
2. In that Supabase project's **Authentication → Sign In / Providers → Email**, keep email signup and **Confirm email** enabled.
3. In **Authentication → Email (Notifications) → SMTP Settings**, verify custom SMTP is enabled and saved:
   - Sender email: `no-reply@solveplot.com`
   - Sender name: `SolvePlot`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: the valid Resend API key, entered privately in the dashboard. Confirm its sending permission/domain scope matches the verified `solveplot.com` domain and the Resend team whose logs you are inspecting.
4. Check **Authentication → Hooks** for a Send Email hook. An enabled hook can replace built-in SMTP delivery; verify it is intentional before changing it.
5. In **Authentication → URL Configuration**, set **Site URL** to `https://solveplot.com`. Allow the app's `/auth/callback` destinations, including their `next` or `recovery` query parameters. For example, the actual signup destination from the default solver flow is `https://solveplot.com/auth/callback?next=%2Fsolve`, and recovery uses `https://solveplot.com/auth/callback?recovery=1`. Prefer explicit production URLs; if using a callback-scoped pattern, validate it against all allowed app destinations using Supabase's documented glob rules. Do not use localhost as the production redirect or allow arbitrary external origins.
6. Confirm the **Confirm signup** template's link `href` is `{{ .ConfirmationURL }}`. With this app's current PKCE setup, open the latest verification email in the same browser/device that requested it so the verifier cookie is available. The separate `/auth/confirm` route supports token-hash templates, but switching template formats is not a fix for an email that was never sent. Do not silently mix the two link formats.
7. Review **Authentication → Rate Limits**, Supabase Auth logs, and the correct Resend team's email activity. For a genuinely eligible request, distinguish an Auth/SMTP handoff error from a provider accepted/delivered/bounced event. An HTTP 200 by itself is neither.

Provider instructions: [Resend SMTP with Supabase](https://resend.com/docs/send-with-supabase-smtp), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## One controlled end-to-end delivery test

After checking configuration, use one mailbox you own that is not already registered in this Supabase project. Use a unique test password; do not share it. Create the account once. Record the timestamp privately and correlate the request in Supabase Auth and Resend; do not copy confirmation tokens or full confirmation URLs into reports.

Confirm the account is unconfirmed before clicking and cannot sign in with its password yet. Check Resend for the actual delivery status and the inbox/spam folder. Open the latest link in the requesting browser; confirm that the callback establishes a session and returns to the expected SolvePlot page. Then sign out and verify normal password sign-in.

If the email does not arrive, inspect the logs before sending anything else. For an existing unconfirmed account, use **Need a verification email?** or the resend action after its cooldown, not another Create Account submission. Do not delete existing users or manually confirm accounts to make this test pass.

Google OAuth and password recovery have offline regression coverage; real Google login, email delivery, and real password-reset delivery still require a separately controlled end-to-end check. No real delivery is claimed by these tests.

## Validation

The new offline suite executes the actual server actions and callback handlers with mocked Supabase/framework boundaries, plus the installed Supabase SDK with a mocked resend endpoint to verify PKCE creation. It covers new/unconfirmed/obfuscated existing accounts, explicit existence errors, validation, 429/SMTP failures, cooldowns, safe redirect handling, expired links, Google OAuth, and password recovery. Browser checks use the actual React form with mock actions, never live email services.
