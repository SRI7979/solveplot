# PostHog integration — November 14, 2026

## Source and release scope

The Wizard modified the older `/Users/srichalla/Documents/Desmo` checkout. The active production source is `/Users/srichalla/Developer/SolvePlot-landing`, branch `feature/landing-from-mock`, deployed using the linked SolvePlot Vercel project and production CLI workflow. Its existing, previously deployed changes remain in the working tree. Only this integration's additions are staged; older unrelated edits are preserved and not included in the analytics commit.

Wizard integration surfaces reviewed: `package.json`, `package-lock.json`, `.env.example`, `instrumentation-client.ts`, `instrumentation.ts`, `src/app/global-error.tsx`, `src/app/layout.tsx`, `src/app/auth/actions.ts`, `src/components/workspace-account-provider.tsx`, `src/lib/product-analytics.ts`, `src/lib/posthog-server.ts`, `src/lib/posthog-openai.ts`, `src/lib/posthog-logs.ts`, solve/tutor API routes, and the solve/tutor handlers and pipeline. Existing unrelated edits in those files were not copied.

The browser SDK is integrated as one lazy singleton in the existing root analytics component, without an additional provider or competing instrumentation file. The Wizard's OpenAI wrapper, OpenTelemetry exporters, automatic exceptions, account names/emails, and process-wide AI session identifiers are deliberately excluded. They are unnecessary for the requested product events and could capture sensitive content. Signup uses a small after-response HTTP capture instead of another SDK.

## Events and meaning

- `$pageview`: one per completed pathname transition; query/hash changes do not add views. Private record IDs are aggregated to route names. Random browser IDs measure returning/unique browsers, not a guaranteed count of individual people.
- `solver_opened`: navigation to `/solve`.
- `question_submitted`: an explicit solver submission, once per attempt; image/text input and coarse acquisition source.
- `solution_generated`: the existing final explanation/calculator readiness gate succeeds; duration from submission, input type, success and selected method category. A correct answer is not misrepresented as proof of all calculator/source conditions.
- `solution_failed`: request/timeout, validation, explanation or usage-limit failure; duration, input type and method where available. No raw error messages. A completed attempt has only one terminal outcome; cancellation is not counted as a failure.
- `desmos_method_viewed` / `algebra_method_viewed`: displayed selected method, including a switch; explanation hydration does not count as another view.
- `calculator_opened`: visible calculator component activation on Solver, Question bank or Learn; not the hidden preflight engine or landing demo.
- `signup_completed`: an email account is created (email confirmation may still be pending), or a new Google account completes its first login. Stable event UUID deduplicates callback retries. Existing-account email responses are excluded.

Identity is the server-verified internal account UUID only. Account changes and logout reset the old identity. Failed identity lookups do not affect authentication. Auth callbacks and reset pages are not tracked as pages.

## Privacy and performance

Final outbound property allowlist removes automatic profile properties, document titles, questions, answers, images, prompts, arbitrary errors and URL parameters. Referral URLs contain origin only. No campaign query parameters are retained. IP enrichment is disabled; the ingestion provider still receives transport metadata. Browser Do Not Track and Global Privacy Control disable browser PostHog calls.

Replay is disabled globally, with restrictive input/text/media masking configured defensively. It is not claimed as an enabled feature. Enabling useful replay later requires a separately verified privacy design for rendered question text, calculator canvases, upload URLs, and authenticated pages. No recording, autocapture, console logging, surveys, performance capture, dead-click scripts, or AI traces are enabled. Vercel's existing sanitized page analytics is retained as a separate provider, not forwarded twice to PostHog.

The SDK is dynamically imported after hydration. Capture calls never await network delivery; failures are isolated. Signup delivery runs through Next.js `after` with a two-second timeout and no retries. No solver model, prompt, database schema or API behavior changed. Production token and regional host were copied from the Wizard configuration into Vercel; environment files are not committed. Only the public project token ships to browsers, never a personal PostHog API key.

## Verification

- TypeScript, ESLint, production build, release-note check, search audit and client-secret audit.
- 912 offline unit/regression tests passed, including payload redaction, bounded properties, submission/outcome deduplication, timings and SDK failure isolation. Existing auth, solver and database tests remain included.
- Real solver components with recorded API responses and real Desmos: one submission, method view and successful timed outcome; request failure separately verified. No paid AI calls or real account creation.
- Browser identity check: guest → user → different user → logout; mobile overflow check; DNT sends zero PostHog requests.
- Browser transport verifies ingestion acceptance, not dashboard/report availability. Headless automation's bot filter is retained in production; the test context uses a normal browser agent and disables its automation flag to exercise real capture.
- Dependency audit reports pre-existing vulnerabilities in the application's existing dependencies; none is attributed to the added PostHog dependency. No unrelated dependency upgrades were bundled.

## Integration files

`.env.example`, `package.json`, `package-lock.json`; `src/lib/posthog-client.ts`, `posthog-privacy.ts`, `posthog-server.ts`, `product-analytics.ts`, `analytics-privacy.ts`; `src/components/posthog-analytics.tsx`, `privacy-analytics.tsx`, `solver-outcome-analytics.tsx`, `desmos-calculator.tsx`; `src/app/api/analytics/identity/route.ts`, `src/app/auth/actions.ts`, `src/app/auth/callback/route.ts`, `src/app/login/auth-form.tsx`, `src/app/solve/solver-workspace.tsx`, `src/app/privacy/page.tsx`; `src/content/product-updates.ts`; `tests/posthog-analytics.test.ts`; this report.
