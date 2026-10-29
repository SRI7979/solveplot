# Technical search audit, October 28, 2026

The baseline section records the source before the technical changes below. The user has explicitly authorized the final production release; deployment and live verification are pending at this audit revision. No external account registration, indexing submission, or DNS change has been performed. Production URL checks and crawl evidence are recorded separately by the main audit.

## Verified source baseline

- Next.js 16.3.5 App Router; root layout uses native Metadata. Main public homepage, FAQ, legal and update routes render server components. Solver, Learn, History, Settings and profile are dynamic account/workspace routes.
- Existing homepage canonical is `/`, with a generic `SolvePlot | solveplot.com` title and a short functional description. Share card has a real local 1200×630 image. Metadata origin comes from configured auth/site origin, so an arbitrary non-local preview origin can become a canonical base.
- FAQ, Privacy and Terms have unique titles/descriptions but no canonical. Updates index/detail define canonicals; their page-specific social titles/descriptions are not consistently inherited because nested metadata objects are merged shallowly.
- Root has no default robots directive or preview-specific index policy. Most workspace pages explicitly noindex/nofollow. Login and reset-password lack explicit noindex. API responses have no repository-wide X-Robots-Tag guard.
- Native `robots.ts` and `sitemap.ts` already exist. The sitemap contains public home, FAQ, legal and updates routes only; no private solution URLs. Robots permits wildcard crawlers on public content, including Googlebot, Bingbot and OAI-SearchBot, but disallows workspace pages. Disallow can prevent a crawler from reading a page's noindex instruction.
- No Organization, WebSite, SoftwareApplication, or other JSON-LD is present. No fabricated reviews or ratings were found.
- Existing redirects preserve renamed public image assets. Next defaults normalize trailing slash paths. Production www/HTTP domain behavior and Vercel bot/firewall configuration require external checks; repository code alone does not establish them.
- The auth proxy applies private/no-store to matched workspace and auth paths; each protected page/API performs its own auth check. No search change should weaken this.
- Vercel Analytics already exists in root layout. Its production dashboard configuration and search-console ownership cannot be inferred from source.

## Implementation scope

Use consistent public metadata/social/canonical helpers, truthful product JSON-LD, explicit private/auth/API indexing headers, a non-production policy, and a sitemap fed by the original public-guide catalog. Keep private solution/auth behavior and solver logic intact. Do not change GPTBot's permission as a side effect of allowing search crawlers.

## Implementation and verification

The checked implementation is recorded below. Local eligibility does not establish Google/Bing indexing, ranking, AI citation, or production behavior until the released version is checked on the live domain.

### Completed local implementation

- Public pages now share canonical, page-specific Open Graph/Twitter, and metadata descriptions through `publicPageMetadata`. The homepage title describes a free SAT math solver with Desmos steps. Canonicals always use `https://solveplot.com`, avoiding an auth or preview origin becoming a search canonical.
- Homepage JSON-LD describes the real SolvePlot Organization, WebSite, and EducationalApplication with free access. There are no ratings, fabricated authorship credentials, user counts, or rich-result guarantees. JSON serialization escapes `<` to keep the script boundary safe.
- Login/reset now declare noindex. Response headers independently noindex private workspace, auth, and API paths even when the page redirects or returns data. The anonymous `/solve` entrance has its own public title, description, canonical, and index/follow metadata. Signed-in solver metadata, requests carrying a Supabase auth cookie, and nested `/solve/…` paths receive noindex; solver responses retain `private, no-store`. Existing authentication remains authoritative; search directives do not grant access.
- Preview/development Vercel builds receive noindex response headers and metadata, block crawling, and emit an empty sitemap. `*.vercel.app` hosts also receive noindex even for a deployment built as production. Production canonicals remain the custom domain.
- Search crawlers can access the anonymous `/solve` entrance and read noindex on other publicly accessible workspace shells. Robots still excludes nested solver paths, private History/tricks, API, and auth endpoints. An explicit GPTBot group preserves its previous effective allow/disallow list exactly, including its `/solve` exclusion; search accessibility does not expand training-crawler access.
- Sitemap includes `/solve`, the four original public guides plus their hub (five guide URLs), other public product pages, and stable release-note detail URLs. It omits private workspace, personal solution, and search URLs. Existing release-note dates are retained rather than assigning today's date to everything; guide timestamps are omitted.
- The root layout uses the analytics agent's privacy-preserving wrapper for the existing Vercel integration.
- Function tracing excludes local debug/recovery folders, private evaluation inputs/results/reports, prototype files, environment files, and local Vercel configuration. Required solver runtime libraries, the curated trick library, and reviewed training assets remain included; the exclusions do not remove those runtime dependencies.

### Verification so far

The original local audit verified shared metadata, canonical base, preview/crawler separation, private headers, safe product schema, JSON serialization, and sitemap public/private boundaries. Its earlier Solver noindex observation describes the superseded policy. The final policy makes anonymous `/solve` indexable while retaining noindex for signed-in/auth-cookie/nested variants and private routes. The current application suite passes 693 tests; the release owner records the final integration/build and live-domain checks.

Fresh release content checks cover the homepage and all five guide URLs at 390px and 1440px: HTTP 200, one H1, canonical/description, parsed JSON-LD, no horizontal overflow, no KaTeX errors, and no broken in-page anchors. Eight current authored calculator rowsets run cleanly in the real Desmos engine; exact arithmetic tests independently establish the graph answers. Evidence is under `.solveplot-debug/release-seo-content/`.

The metadata and JSON-LD are source-checked and locally rendered; the companion readiness audit records the earlier Schema.org vocabulary check. Nothing has been submitted to search consoles. No account ownership, actual search-engine indexing, firewall acceptance of real crawler IPs, ranking, rich result, or AI citation is established by these tests. Deployment is authorized but not claimed complete in this predeployment revision.
