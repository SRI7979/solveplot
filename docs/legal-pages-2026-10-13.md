# Privacy and Terms pages

Added public, statically rendered `/privacy` and `/terms` routes and linked both
under Project in the shared landing/FAQ footer. They use the existing marketing
typography and a reading-width column, with no authentication requirement.

The Privacy Policy is based on the current implementation: Google basic
profile/email, Supabase Auth and private image/history storage, saved tricks,
internal question/solution caches, OpenAI question/tutor processing with
`store: false`, usage diagnostics, Vercel hosting and Web Analytics, Desmos's
embedded calculator, and local/session preference storage. It does not claim
zero provider retention, anonymous internal logs, or an account-deletion button.

The Terms describe educational use, checking AI-generated results, account
security, permitted uploads, limited processing permission, usage limits,
prohibited misuse, third-party services, and mandatory rights under applicable
law. No invented company address, chosen jurisdiction, arbitration requirement,
paid subscription, or fixed retention/deletion deadline is included.

These are product-specific policy drafts. Before publication, the maintainer
should confirm the operator/contact information, under-13 restriction, retention
practices, and statements about data use/sharing against actual business and
provider settings. The website code cannot independently establish those facts
outside the app. A legal/privacy review can determine additional requirements
for the jurisdictions in which the service operates. This is not a claim that
these pages by themselves establish legal compliance or Google approval.

The user supplied `desmomathsupport@gmail.com` as the public support email.
`BRAND.contact` in `src/lib/brand.ts` provides the address and mailto link for
both policy pages and the footer's Contact support link.

Reference material consulted:

- [Google's verification requirements](https://support.google.com/cloud/answer/13464321)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [Vercel Web Analytics privacy](https://vercel.com/docs/analytics/privacy-policy)
- [OpenAI API data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Supabase's privacy policy](https://supabase.com/privacy)
- [Desmos's privacy policy](https://www.desmos.com/privacy)

Verified at 1242×892 and 390×844: both footer links navigate to the right page;
headings, sections, and update dates render; no horizontal overflow or browser
errors. Both pages also return HTTP 200 and complete policy text with JavaScript
disabled and no signed-in session. Lint, TypeScript, and the production build
passed. No AI requests were made.

Local screenshots: `/tmp/desmo-privacy-{1242,390}.png` and
`/tmp/desmo-terms-{1242,390}.png`.

Deployed at the user's request on October 13, 2026:

- Website: `https://desmomath.com`
- Source commit: `33ff5a2125d445b76122f5a0404aaaabfbe26535`
- Deployment: `dpl_5HDnDEyLPCkL4Uapa5sq5ctUEdf4`, production, Ready
- Inspector: `https://vercel.com/sri7979/desmo/5HDnDEyLPCkL4Uapa5sq5ctUEdf4`

Both `https://desmomath.com/privacy` and `https://desmomath.com/terms` are now
publicly readable without a session or JavaScript, with the approved support
email and working footer links. Production checks at both viewports above
passed with no horizontal overflow or browser errors. All 395 tests, lint,
the production build, and the client-secret audit passed. No Google-console
change or paid AI request was made during deployment verification.
