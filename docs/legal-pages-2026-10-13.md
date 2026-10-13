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

The user chose to supply a support email; the exact address is still pending.
`BRAND.contact` in `src/lib/brand.ts` currently retains the existing developer
contact link. Updating that value updates policy/Terms contacts and the footer.

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

The Google branding guide now points to `https://desmomath.com/privacy` and
`https://desmomath.com/terms`. Those production URLs become usable after this
local update is deployed. No deployment or Google-console change was made.
