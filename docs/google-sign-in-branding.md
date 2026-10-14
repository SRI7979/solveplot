# Google sign-in branding

Google owns the account chooser and consent screen. The app cannot replace its
“continue to jwfrozzoknimldsmexgq.supabase.co” label with frontend CSS or an OAuth
query parameter. The current screenshot shows the domain fallback. The Google
Cloud project's verification/published branding status has not been inspected.

Google says that the app name/logo appear after brand verification and
publication. See [Google's branding settings](https://support.google.com/cloud/answer/15549049)
and [Supabase's Google branding guide](https://supabase.com/docs/guides/auth/social-login/auth-google#setup-consent-screen-branding).

## Order of changes

1. In [Google Auth Platform](https://console.cloud.google.com/auth/branding),
   select the project whose OAuth Web client ID is configured under Supabase
   Authentication → Sign In / Providers → Google. Use the existing client;
   don't create or swap clients just to rename the app.
2. Under **Branding**, set **App name** to **Desmo** (or the final chosen name),
   select a monitored support email, and provide developer contact details.
   The website's public support address is `desmomathsupport@gmail.com`.
   Google's support-email dropdown only lists eligible addresses for the
   signed-in project account; add the support account to the project and sign
   in with it if the address is not available there.
   A logo is optional; upload the actual product mark if desired.
3. Set the homepage to `https://desmomath.com`, Privacy Policy to
   `https://desmomath.com/privacy`, and Terms to `https://desmomath.com/terms`.
   These pages are deployed and publicly readable on `desmomath.com`, with
   links in the footer and `desmomathsupport@gmail.com` as the contact address.
   Confirm the policy text before submission and use those exact public URLs.
   The Desmos provider's privacy policy is a separate document.
4. Add `desmomath.com` under **Authorized domains**. Verify ownership in
   [Google Search Console](https://search.google.com/search-console) using a
   Google account with ownership/editor access to that Cloud project. Follow
   Google's current domain-verification prompts; DNS verification uses the
   exact TXT value Google supplies.
5. Use Google's **Verify Branding** / verification workflow. When approved,
   click **Publish branding**; merely saving a draft app name does not change
   what visitors see. Google controls the review time and final screen.
6. Retest in a fresh browser context with Continue with Google. Check that
   Google's account chooser/consent screen identifies the published app and
   the callback still returns to `https://desmomath.com/auth/callback`.

Keep the Google OAuth redirect URI
`https://jwfrozzoknimldsmexgq.supabase.co/auth/v1/callback`. The application callback
at `desmomath.com/auth/callback` is a different hop. Supabase's Site URL and
redirect allowlist already use the public website and should remain configured.
Branding alone does not require migrating Auth to a new domain. An optional
Supabase custom Auth domain is a separate infrastructure/billing choice.

Request only the existing sign-in scopes (`openid`, email, profile). Brand
verification and sensitive/restricted scope verification are separate processes.
See [Google's domain requirements](https://support.google.com/cloud/answer/13804266)
and [scope/verification guidance](https://support.google.com/cloud/answer/13463073).

## A future rename

`src/lib/brand.ts` is the shared name/wordmark source for the landing page, FAQ,
shared logo, and root title. A later complete rename should also audit legacy
route titles and solver copy that still literally say Desmo. Keep Desmos (the
calculator provider) unchanged. Product copy changes do not update Google's
published branding: edit, reverify, and publish the Google draft separately.
Renaming alone does not require new OAuth client credentials or callbacks.
