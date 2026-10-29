# Public education content audit, October 28, 2026

Baseline recorded before guide changes. This audit inspects repository code, not search-engine index status.

- Next.js App Router 16.3.5 serves a public landing page, FAQ, updates archive/detail pages, privacy and terms pages.
- The app already has 24 lesson catalog entries and substantial authored Desmos lesson content. Those lessons belong to the learning workspace. `/learn/[slug]` is force-dynamic, requires a signed-in user outside the local review mode, and explicitly returns `noindex, nofollow` metadata.
- The public FAQ explains the product, but there are no public `/guides` routes or equivalent crawlable worked topic pages. Workspace lessons should stay private and should not be repurposed into indexable user progress pages.
- Current homepage/FAQ navigation links to the solver and product resources. A public guide hub can connect educational search intents to the existing product without duplicating the solver route or opening private lessons.
- Existing free real-Desmos preflight tooling supports authored example plans without model inference. New guides will use original small numerical examples, with separate authored provenance and arithmetic checks, rather than republishing source question banks.

Implementation boundary: add a small shared guide catalog and server-rendered hub/detail pages. Preserve the existing workspace, sign-in gates, lesson progress, solver ranking, and app themes. No paid requests were used. The user has now explicitly authorized the final production release; live publication remains pending at this audit revision.

## Implemented and checked locally

- Added the public `/guides` hub and four server-rendered pages: `/guides/desmos-sat`, `/guides/systems-of-equations`, `/guides/regression`, and `/guides/quadratics`. There are no new solver-landing-page aliases or copied lesson-progress pages.
- Each guide has a direct answer, original worked example, descriptive SVG illustration, exact typed Desmos rows, algebraic comparison, method-selection advice, common mistakes, practice answer/steps, related guides, and a solver link. No additional client JavaScript or live calculator is needed to read the lesson.
- Page metadata uses the shared public metadata helper. Articles identify SolvePlot as the organizational author without invented credentials, include reference links, and expose truthful Article/Breadcrumb JSON-LD. The hub uses CollectionPage/ItemList.
- Official references checked October 28, 2026: College Board SAT Suite calculator policy; Desmos graphing calculator user guide; Desmos tables/custom-regression documentation. No question-bank source was copied.
- Five targeted tests pass: public catalog links, all KaTeX formulas, exact equation/system answers, quadratic-fit coefficients/predictions, and vertex/root/domain consistency. Targeted ESLint passes.
- Free actual-Desmos audit: eight original guide rowsets are engine-clean. The two regression plans explicitly display 27 and 17. A separately labeled appended `f(4)` readout returns -4 for the quadratic example. Graph syntax acceptance alone is not a proof of an intersection or minimum; the independent arithmetic/completing-square checks establish those claims. See `seo-guide-verification-2026-10-28.json`.
- Local HTTP checks: hub/all four guides return 200; unknown slug returns 404; each successful page has one H1 and its exact canonical. The rendered HTML already contains worked steps/practice answers before interaction. Root agent handles full build, integration checks, and mobile screenshot review.
- Fresh release checks rerun the eight current authored rowsets in real Desmos, with no errors. A separate audit-only `f(4)` rowset confirms -4; it is not an additional published example. At 390px and 1440px, the homepage and all five guide URLs have no horizontal overflow, KaTeX errors, or broken in-page anchors. Current raw HTML retains the guide teaching/practice text, correct canonicals, descriptions, and parseable structured data. Evidence: `.solveplot-debug/release-seo-content/`.
- The final search policy includes the anonymous `/solve` entrance and all five guide URLs in the sitemap. Signed-in/auth-cookie/nested solver variants, personal records, and lessons remain noindex/private; this does not publish workspace progress or private solutions. The current application suite passes 693 tests; the release owner records final build and live-domain results.

At this predeployment revision nothing has been published by this release or submitted to an indexing service. Production deployment is authorized, but publication will be claimed only after live verification. Search ranking, indexing, rich-result eligibility, and AI citations are not verified by these local checks.
