# SolvePlot search branding, October 29, 2026

Scope: a narrow release from the current production source. Existing unpublished dark-default/button edits and unrelated research remain intact in the main checkout and outside this release. No paid model inference, search-account registration, DNS changes, or search-result guarantees are part of this work. Deployment and final live checks are pending at this revision.

## Reproduced before-state

- `/favicon.ico` and `/manifest.webmanifest` return 404. The homepage references only the existing SVG and 180px Apple icon. The SVG and Apple icon themselves return 200; the existing implementation was not a generic Next.js placeholder.
- Homepage title already begins with SolvePlot; the visible wordmark, description, CTA, `applicationName`, Open Graph site name, Organization, and WebSite already agree on the brand. Canonicals use `https://solveplot.com`. The existing 1200×630 Open Graph image visibly contains SolvePlot and solveplot.com; it is preserved.
- Public home, solver entrance, guides, robots, sitemap, SVG, and Apple icon respond successfully to unauthenticated crawler-user-agent probes. Existing wildcard robots rules allow these paths; GPTBot training restrictions are independent and unchanged. HTTP, www, and old-brand host normalization are checked separately. These are requests from our connection, not Google/Bing crawler-IP verification.
- No confirmed official brand social profiles are present in source. An owner question was sent for exact URLs; no profile is inferred from a similarly named account or a third-party license link.
- Exploratory search did not establish consistent brand ranking or Bing inclusion. Public Bing SERP access was unavailable through the search tool. Search Console and Bing owner dashboards are needed to identify actual indexing/crawl decisions; no definite cause for the reported absence is inferred from a `site:` query or generic web search.

## Changes

- Reuse the existing `src/app/icon.svg` without modifying its artwork. `scripts/generate-brand-icons.mts` produces a four-frame ICO (16/32/48/64) and 32/48/96/192/512 square PNGs. `--check` verifies deterministic reproduction; pixel tests compare every raster frame to the original SVG.
- Add Next.js's file-based `/favicon.ico` and a browser-mode web manifest. The manifest points only to public branded icons; it does not add an offline service worker, change solver routing, or imply offline solving.
- Explicit head icon metadata includes stable PNG and SVG URLs plus the existing Apple touch icon. Keep the current sharing image and all existing image redirects.
- Keep the brand-first homepage title and visible copy. Add `solveplot.com` as the WebSite alternative name and a dimensioned 512px official Organization logo. No reviews, ratings, backlink lists, authorship credentials, or unconfirmed social profiles are introduced.
- Add the dated public release note and a preview of the existing icon. The site layout, themes, calculator, authentication, and solver configuration are unchanged in the release source.

## IndexNow decision

IndexNow is technically compatible with a server-side post-release script and a root verification route, but the protocol requires the verification token to be retrievable publicly. To honor the request not to expose verification secrets, this release does not add a token/file/route or automatic submission. No existing credential is reused. Bing Webmaster Tools remains the manual route. This is a deliberate scope decision, not a claim that IndexNow is unsafe in general or that notification guarantees indexing.

## Verification and sources

Targeted checks cover valid ICO frame bounds, exact official-artwork pixels, PNG dimensions, preserved Apple/share assets, manifest names/paths, consistent structured-data identity, and private search restrictions. Full isolated-source checks, real head tags and public icon routes, deployment verification, and final results are recorded below when complete. Evidence stays under `.solveplot-debug/brand-release-20261029/`, outside the release.

Primary references: [Next.js icon conventions](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons), the installed Next.js 16.3.5 metadata/manifest guides, [Google favicons](https://developers.google.com/search/docs/appearance/favicon-in-search), [Google site names](https://developers.google.com/search/docs/appearance/site-names), and [IndexNow protocol](https://www.indexnow.org/documentation). Google specifies homepage and Googlebot-Image access and a square representative icon; a compliant icon and WebSite name remain preferences for its automated systems, not enforced search appearance.

### Passed predeployment checks

The isolated release passes **696 application tests**, full ESLint, TypeScript, production build, the dated release-note check, and the client-secret audit. The full HTTP search audit passes 37 routes, two resources, and 21 crawler-user-agent probes. The branding audit finds seven correctly referenced head icons, ten working icon/manifest/share assets, and 33 successful Googlebot/Googlebot-Image/bingbot requests. ICO frames and PNG dimensions/pixels are verified, not merely filename extensions. All 37 server trace manifests exclude environment files, local debug/research, and private evaluation captures.

A fresh signed-out browser runs the existing bundled sample, loads working Desmos entries, shows the checked 248 readout, and opens sign-in when saving. No paid model request occurs. This is a rendering/auth regression check, not a new authenticated model solve or accuracy benchmark. Deployment/live results remain pending until recorded below.
