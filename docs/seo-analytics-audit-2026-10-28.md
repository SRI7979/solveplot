# Analytics baseline, 2026-10-28

Recorded before instrumentation changes. This is a local source audit; production analytics dashboard access and event ingestion have not been verified.

- `@vercel/analytics` 2.x is installed. `src/app/layout.tsx` mounts the Next.js `Analytics` component globally.
- No explicit product/conversion `track()` calls were found under `src/`.
- Existing page-view collection can describe pages, referrers, and device categories when enabled in the Vercel project. It does not by itself distinguish clicking Solve, successfully receiving a solution, or an actual checked calculator readout.
- Solver latency instrumentation exists separately in `src/lib/client-timing.ts`; it is not a search acquisition or conversion dashboard.
- The current Analytics component has no `beforeSend` filter. Private history URLs and arbitrary query strings can therefore reach the analytics script unless its own defaults discard them. This audit does not claim those values were actually stored.
- Privacy text already discloses Vercel Web Analytics and differentiates analytics from authentication cookies. No Search Console or Bing verification configuration was found in this audit. Their account status is not verified.
- Returning visitors and acquisition-to-activation cohorts cannot be established from code inspection. Cross-day tracking should not be added solely for this task.

## Implemented locally

- `PrivacyAnalytics` retains the existing integration with an explicit `beforeSend` URL filter. Query strings and fragments are stripped; saved-problem IDs become `/history`; individual lesson/checkpoint routes become `/learn`. Auth and API URLs are dropped. Only the four known guide URLs retain their paths; other guide paths collapse to `/guides`, and update details collapse to `/updates`. Other unknown routes are dropped. This API filters page locations, not arbitrary network headers or the provider's own request metadata.
- Each explicitly submitted solve gets a memory-only, deduplicated tracker. Events distinguish `solver_started`, `solver_method_ready` (a method promoted after preflight), `solver_solution_ready` (the explanation and rendered method have arrived), and `solver_readout_checked` (an actual matching numeric/list readout). The last event does not prove every problem condition. A demonstrated contradicting live readout is not counted as a ready solution.
- Demo viewing, restored drafts, History opening, lazy alternatives, retries within one submitted solve, and re-renders do not create additional submitted solves. A user's explicit new Solve submission starts a new tracker.
- Allowed properties are only input type (`image`/`text`) and a coarse source category (Google, Bing, ChatGPT, Perplexity, other search, other referral, or direct/unknown). No raw referrer, search query, user ID, cache key, filename, question, answer, email, or cross-visit identifier is accepted. Source classification is document-local and can be lost across full navigations/authentication; it is not reliable cross-session attribution.
- Local event dispatch is ephemeral, on `window` as `solveplot:measurement`. It does not save a history or transmit anything by itself. QA can observe events with a temporary listener; no event list is persisted.

## Why remote conversion export is off

[Vercel's official custom-events guide](https://vercel.com/docs/analytics/custom-events) and [pricing table](https://vercel.com/docs/analytics/limits-and-pricing), checked October 28, state that custom events are available on Pro/Enterprise, not Hobby. Pro events can incur usage charges. The existing account plan and limits were not verified or changed. To respect the $0 budget, `NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS` is unset by default and **no new remote custom events are sent**.

If the owner later confirms an already-approved supported plan and budget, explicitly setting `NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS=true` and rebuilding enables the prepared `track()` export through the existing package. There is no added vendor, paid signup, or automatic upgrade. Do not enable it merely because code is present. The two properties per event fit the current basic Pro custom-property limit.

Until a supported aggregation destination is approved, aggregate conversion funnels and acquisition-to-activation reports remain incomplete. Existing page-view/referrer reports can still describe visits when Web Analytics is enabled, within its limits. Google impressions/clicks belong in Search Console; Bing impressions/clicks belong in Bing Webmaster Tools. Neither dashboard has been verified or submitted to here.

[Vercel's privacy documentation](https://vercel.com/docs/analytics/privacy-policy) says its visitor-session hash is discarded after 24 hours. Thus this integration does not establish long-term returning-user retention, cross-device identity, or a stable acquisition-to-activation cohort. No new identifier was added to fill that gap.

## Validation

Six targeted unit tests cover private URL redaction, auth/API exclusion, referrer lookalikes, duplicate suppression, payload allowlisting, and a failing analytics sink. They pass without network calls. The current full application suite passes 693 tests. The user has explicitly authorized the final release; deployment/live verification are pending at this revision. Production ingestion and dashboard visibility still require live and account checks and are not established by a successful build.

Review correction: exact allowlisting preserves the four authored guide paths. Unknown guide slugs (including 404 URLs) collapse to `/guides`; all update detail paths collapse to `/updates`. No arbitrary public-looking slug is sent verbatim. Tests include nested paths and names in unknown URLs.

Final search-policy clarification: anonymous `/solve` is now indexable and appears in the public sitemap alongside the guide hub and four articles. This does not change analytics redaction, authentication, or personal-data boundaries. Signed-in/auth-cookie/nested solver variants remain noindex with private/no-store responses; private records and services remain excluded. Remote custom-event export remains off, and no Search Console/Bing ownership or indexing submission has been performed.
