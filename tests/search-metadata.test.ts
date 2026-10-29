import assert from "node:assert/strict";
import test from "node:test";
import { solverPageMetadata } from "../src/lib/solver-page-metadata";
import nextConfig from "../next.config";
import robots from "../src/app/robots";
import sitemap from "../src/app/sitemap";
import { isIndexableDeployment, jsonLd, PRODUCT_STRUCTURED_DATA, publicPageMetadata, SITE_ORIGIN } from "../src/lib/site-metadata";

function withEnvironment<T>(value: string | undefined, run: () => T): T {
  const original = process.env.VERCEL_ENV;
  if (value === undefined) delete process.env.VERCEL_ENV;
  else process.env.VERCEL_ENV = value;
  try { return run(); } finally {
    if (original === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = original;
  }
}

test("public metadata keeps canonical and social descriptions aligned without preview hosts", () => {
  const metadata = publicPageMetadata({ title: "Regression on the SAT | SolvePlot", description: "A worked regression example", path: "/guides/regression" });
  assert.equal(SITE_ORIGIN, "https://solveplot.com");
  assert.equal(metadata.alternates?.canonical, "/guides/regression");
  assert.equal(metadata.openGraph?.title, metadata.title);
  assert.equal(metadata.openGraph?.description, metadata.description);
  assert.equal(metadata.twitter?.title, metadata.title);
  assert.ok(metadata.openGraph?.images);
  assert.ok(metadata.twitter?.images);
});

test("non-production policies exclude previews without changing search versus training bot permissions", () => {
  assert.equal(isIndexableDeployment("production"), true);
  assert.equal(isIndexableDeployment("preview"), false);
  assert.equal(isIndexableDeployment("development"), false);
  withEnvironment("preview", () => {
    const rules = robots().rules;
    assert.ok(!Array.isArray(rules));
    assert.equal(rules.disallow, "/");
  });
  withEnvironment("production", () => {
    const result = robots();
    assert.ok(Array.isArray(result.rules));
    const rules = result.rules.find(rule => rule.userAgent === "*")!;
    assert.equal(rules.allow, "/");
    assert.equal(result.sitemap, "https://solveplot.com/sitemap.xml");
    assert.ok(Array.isArray(rules.disallow));
    assert.ok(rules.disallow.includes("/api/"));
    assert.ok(!rules.disallow.includes("/solve"), "public solver entrance must remain crawlable");
    const training = result.rules.find(rule => rule.userAgent === "GPTBot")!;
    assert.deepEqual(training.disallow, ["/api/", "/auth/", "/login", "/solve", "/learn", "/history", "/tricks", "/settings", "/profile"]);
  });
});

test("private and hosted preview URL responses have a noindex header independent of page rendering", async () => {
  const headers = await nextConfig.headers!();
  const sources = headers.map(entry => entry.source);
  for (const path of ["api", "auth", "login", "learn", "history", "tricks", "settings", "profile"]) {
    assert.ok(sources.includes(`/${path}/:path*`));
  }
  assert.ok(sources.includes("/solve/:path+"));
  assert.ok(!headers.some(entry => entry.source === "/solve/:path*"), "do not noindex the anonymous solver entrance");
  const personalSolver = headers.find(entry => entry.source === "/solve")!;
  const cookie = personalSolver.has!.find(condition => condition.type === "header" && condition.key === "cookie")!;
  const cookiePattern = new RegExp(`^(?:${cookie.value})$`);
  assert.ok(cookiePattern.test("sb-example-auth-token=token"));
  assert.ok(cookiePattern.test("theme=dark; sb-example-auth-token.0=part; sb-example-auth-token.1=part"));
  assert.ok(!cookiePattern.test("theme=dark"));
  const preview = headers.find(entry => entry.has?.some(condition => condition.type === "host"));
  assert.ok(preview?.has);
  const condition = preview.has.find(item => item.type === "host")!;
  assert.ok(new RegExp(`^(?:${condition.value})$`).test("solveplot-example.vercel.app"));
  assert.ok(!new RegExp(`^(?:${condition.value})$`).test("solveplot.com"));
  for (const rule of headers) assert.ok(rule.headers.some(header => header.key === "X-Robots-Tag" && header.value.includes("noindex")));
});

test("public product schema has real free-access facts and no manufactured ratings", () => {
  const nodes = PRODUCT_STRUCTURED_DATA["@graph"];
  assert.deepEqual(nodes.map(node => node["@type"]), ["Organization", "WebSite", "SoftwareApplication"]);
  assert.ok(!JSON.stringify(nodes).match(/aggregateRating|reviewCount|ratingValue|award|employee/));
  assert.equal(nodes[2].isAccessibleForFree, true);
  assert.equal(nodes[2].offers?.price, "0");
  assert.ok(!jsonLd({ value: "</script><script>bad()</script>" }).includes("<"));
  assert.equal(JSON.parse(jsonLd({ value: "a < b" })).value, "a < b");
});


test("sitemap contains the public solver and guides but no private or query URLs", () => {
  withEnvironment("production", () => {
    const urls = sitemap().map(entry => new URL(entry.url));
    assert.equal(new Set(urls.map(url => url.href)).size, urls.length);
    assert.ok(urls.some(url => url.pathname === "/guides/regression"));
    assert.ok(urls.some(url => url.pathname === "/solve"));
    for (const url of urls) {
      assert.equal(url.origin, SITE_ORIGIN);
      assert.equal(url.search, "");
      assert.equal(url.hash, "");
      assert.ok(!/^\/(api|auth|login|learn|history|tricks|settings|profile)(?:\/|$)/.test(url.pathname));
    }
  });
  withEnvironment("preview", () => assert.deepEqual(sitemap(), []));
});

test("anonymous solver metadata is indexable while authenticated workspaces remain noindex", () => {
  const guest = solverPageMetadata(false);
  const account = solverPageMetadata(true);
  assert.equal(guest.alternates?.canonical, "/solve");
  assert.equal(guest.openGraph?.title, guest.title);
  assert.equal(guest.openGraph?.description, guest.description);
  assert.deepEqual(account.alternates, guest.alternates);
  assert.deepEqual(account.robots, { index: false, follow: false, noarchive: true });
  assert.ok(guest.robots && typeof guest.robots === "object");
  assert.equal(guest.robots.index, true);
});
