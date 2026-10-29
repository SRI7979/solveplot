# Search setup for SolvePlot

Updated October 29, 2026 after the authorized production branding release. The SEO and icon changes are live at `https://solveplot.com` (branding commit `fe2cc14`, following the guide release `079fea7`). No Search Console or Bing account has been registered or verified by this work. No sitemap or indexing request has been submitted by this work. All steps below are free; do not buy a search package or analytics upgrade for this setup.

## 1. Review the live update

Review [the public guides](https://solveplot.com/guides) and [the release note](https://solveplot.com/updates/public-desmos-guides). The hub and all four worked guides now return HTTP 200 in production, and the live sitemap includes all five guide URLs plus the anonymous solver entrance. Private pages retain their indexing and access restrictions. These release checks do not establish search-engine indexing.

## 2. Verify Google ownership

Open [Google Search Console](https://search.google.com/search-console/welcome) with the Google account you want to own the site.

1. Add a **Domain** property named `solveplot.com` (no `https://` or path).
2. Copy the exact TXT record Google supplies. In the domain provider's DNS settings, add it at the root (`@` or blank, according to the provider). Add a record; do not replace existing mail, verification, or Vercel DNS records.
3. Return to Google and choose Verify. DNS can take time to propagate. Keep the TXT record after verification.
4. If a property already exists, use it; do not duplicate setup or remove another owner's verification.

[Google's ownership instructions](https://support.google.com/webmasters/answer/9008080) explain the available methods. DNS also covers subdomain/protocol variants. No Google verification token is invented or placed in source; the owner must obtain it from their account.

## 3. Submit the live sitemap

Visit `https://solveplot.com/robots.txt` and `https://solveplot.com/sitemap.xml` in a signed-out browser. The robots file should name that sitemap. The XML should include the homepage, FAQ, policies, release notes, and the public guides. It should include the anonymous `/solve` entrance and exclude `/learn`, personal History, Saved tricks, Settings, profile, auth, nested solver URLs, and API URLs. Signed-in solver responses remain noindex and privately cached. Private lessons stay private; public guides are a separate resource.

In the verified Google property, choose **Sitemaps**, submit `https://solveplot.com/sitemap.xml`, and later check its status/last read/errors. A successful submission tells Google about URLs; it does not prove they were indexed.

## 4. Inspect a few important URLs

Use Search Console's [URL Inspection tool](https://support.google.com/webmasters/answer/9012289) for the homepage and each new guide:

- `https://solveplot.com/`
- `https://solveplot.com/solve`
- `https://solveplot.com/guides`
- `https://solveplot.com/guides/desmos-sat`
- `https://solveplot.com/guides/regression`
- `https://solveplot.com/guides/systems-of-equations`
- `https://solveplot.com/guides/quadratics`

Compare the indexed result with **Test live URL**. Check HTTP 200, crawl allowed, no unexpected noindex, and the intended canonical. Request indexing for the key new/changed URLs where offered. Repeatedly requesting the same URL does not guarantee or force indexing.

If excluded: read the reason first. `Discovered/Crawled - currently not indexed`, duplicates, an alternative canonical, a server error, and robots blocking are different issues. Do not remove private-route protections to improve an indexing count. Use live HTML and robots/header evidence to investigate. Check Enhancements/Rich Results only for supported features; our structured data is descriptive and does not guarantee a special search appearance.

## 5. Verify Bing

Open [Bing Webmaster Tools](https://www.bing.com/webmasters/). If Google verification is complete, Bing offers import from Search Console; review the access request before accepting it. Otherwise add `https://solveplot.com` manually and use the exact DNS/verification method Bing provides.

Submit `https://solveplot.com/sitemap.xml` under Sitemaps and check read/errors. Inspect the homepage and guides with Bing's URL Inspection and Site Explorer. [Bing's setup help](https://www.bing.com/webmasters/help/add-and-verify-site-12184f8b) covers the account steps. If an AI Performance report is available in the account, it measures citations on supported Microsoft surfaces, not all ChatGPT usage or customer conversions.

### Brand and favicon follow-up, October 29

The branding release is verified live. Use Google URL Inspection on `https://solveplot.com/`: run Test live URL, check the intended canonical, and request indexing once. The homepage references the official favicon, square PNGs, and Apple touch icon. `/favicon.ico` includes 16, 32, 48, and 64px frames; `/icons/solveplot-96.png` is a larger square search icon. These URLs are stable. Favicons do not need separate sitemap entries. The [branding release note](https://solveplot.com/updates/solveplot-search-branding) describes the published change.

Google must recrawl and process the homepage and icon before a search-result icon can change. A compliant icon is not guaranteed to appear, and processing can take days to weeks. [Google's favicon guidance](https://developers.google.com/search/docs/appearance/favicon-in-search) explains the distinction. Do not keep changing the icon URL or repeatedly requesting indexing while waiting.

In Bing, use the existing verified property if available, or import the verified Google property / complete Bing's DNS verification. Submit the live sitemap, inspect the homepage, and request indexing where offered. Read the reported crawl/indexing reason if it remains absent. Public HTTP and crawler-user-agent checks cannot reveal Bing's chosen canonical, last real crawl, indexing decision, or search positions; those need the owner dashboard. A domain-only search result also does not establish consistent ranking for the brand name.

Only owner-confirmed official social profile URLs should be linked in `sameAs` or social-account metadata. The repository currently has no confirmed brand profiles; personal, third-party license, and similarly named accounts must not be substituted.

IndexNow remains disabled for this release. Its [protocol](https://www.indexnow.org/documentation) requires a publicly retrievable verification-token file. No IndexNow token was generated, no credential was exposed, and no automated notification was submitted under the request to keep verification secrets private. Manual Bing Webmaster Tools submission remains available. A later opt-in could use a dedicated IndexNow-only proof, never an existing Google/Bing verification value, Supabase credential, or deployment token. Acceptance would still not prove indexing.

## 6. Review results without daily maintenance

Before November 1: verify both properties, submit the sitemap, inspect the seven URLs, and confirm the app's existing Vercel Web Analytics dashboard is enabled. The production analytics script responds successfully; dashboard ownership and reporting still need your review. During November, set aside roughly 15 minutes each week:

- Google Performance: impressions (search appearances), clicks, queries, and landing pages. Filter branded queries such as SolvePlot separately from topics such as regression.
- Google Page indexing: new errors/exclusions, with private URLs expected to stay excluded. Core Web Vitals needs actual user data; small sites may have too little.
- Bing: search performance, URL/indexing errors, and sitemap status. Check AI reporting if available, without interpreting citations as visits.
- Vercel Analytics: entry pages and referring websites, including identifiable `chatgpt.com`, Bing/Copilot, and Google referrals. Referrers can be missing; Google AI clicks may not be separately identifiable.
- Activation: the app now prepares content-free solver lifecycle signals. Their local debug events are not a dashboard. Vercel custom events require a supported paid plan, so remote export remains off by default for this $0 task. Do not enable `NEXT_PUBLIC_VERCEL_CUSTOM_EVENTS` unless the existing plan already supports it and you approve its use. See `docs/seo-analytics-audit-2026-10-28.md`.

No persistent cross-day user identifier was added. Reliable returning-user cohorts and search-source-to-activation conversion rates remain unmeasured. Vercel's short-lived visitor counts are not an account-level or long-term returning-user report. Avoid treating raw event counts divided by views as a verified conversion rate.

## Search and AI limits

Public guides expose useful text without sign-in or JavaScript and link together. Googlebot, Bingbot, and OAI-SearchBot are allowed for eligible public pages. GPTBot is a separate training crawler; its previous effective restrictions are preserved. Firewall rules and real crawler IP access still need production-owner inspection if crawl errors arise.

[OpenAI's crawler documentation](https://developers.openai.com/api/docs/bots) and [Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) support ordinary crawlable, helpful content; neither promises recommendations. No llms.txt, fake citations, reviews, special ranking schema, or paid indexing service is needed for this implementation. Indexing means a search engine has admitted a URL to its search index; ranking is where it appears for a particular query. Neither is guaranteed by valid code or a sitemap.
