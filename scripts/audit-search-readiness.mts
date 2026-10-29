/** Free, read-only HTTP audit. No cookies, model calls, account lookup or submission.
 * npx tsx scripts/audit-search-readiness.mts --base=http://localhost:3000 --output=.solveplot-debug/seo-20261028/local.json --verify
 * Add --production when auditing a production build/live site to require private,no-store on /solve.
 * A crawler user-agent string tests that request only, not access from the crawler's real IPs.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { PRODUCT_UPDATES } from "../src/content/product-updates";
import { EDUCATIONAL_GUIDES, guideHref } from "../src/content/educational-guides";

const args = process.argv.slice(2);
const base = args.find(value => value.startsWith("--base="))?.slice(7) ?? "http://localhost:3000";
const output = args.find(value => value.startsWith("--output="))?.slice(9) ?? ".solveplot-debug/seo-20261028/local.json";
const verify = args.includes("--verify");
const production = args.includes("--production");
const publicPaths = ["/", "/solve", "/faq", "/privacy", "/terms", "/updates", ...PRODUCT_UPDATES.map(update => `/updates/${update.id}`), "/guides", ...EDUCATIONAL_GUIDES.map(guideHref)];
const privatePaths = ["/solve/audit-nonexistent", "/learn", "/learn/regression", "/learn/checkpoint/desmos-beginner", "/history", "/history/audit-nonexistent", "/tricks", "/settings", "/profile", "/login", "/auth/reset-password"];
const entities = (s: string) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function attr(tag: string, name: string) { return entities(new RegExp(`\\b${name}=["']([^"']*)["']`, "i").exec(tag)?.[1] ?? ""); }
const strip = (s: string) => entities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
async function inspect(route: string, userAgent?: string) {
  const url = new URL(route, base);
  const started = performance.now();
  const response = await fetch(url, { redirect: "manual", headers: { "user-agent": userAgent ?? "SolvePlot-ReadOnly-Audit/1.0" }, signal: AbortSignal.timeout(30000) });
  const html = await response.text();
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  const meta = Array.from(html.matchAll(/<meta\b[^>]*>/gi)).map(match => ({ name: attr(match[0], "name") || attr(match[0], "property"), value: attr(match[0], "content") }));
  const ld = Array.from(html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)).map(match => { try { return JSON.parse(match[1]) as unknown; } catch { return { invalidJSON: true }; } });
  return { path: route, status: response.status, location: response.headers.get("location"), contentType: response.headers.get("content-type"), xRobotsTag: response.headers.get("x-robots-tag"), cacheControl: response.headers.get("cache-control"), bytes: Buffer.byteLength(html), elapsedMs: Math.round(performance.now() - started), title: entities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ""), descriptions: meta.filter(item => item.name === "description").map(item => item.value), canonical: Array.from(html.matchAll(/<link\b[^>]*>/gi)).map(match => match[0]).filter(tag => attr(tag,"rel") === "canonical").map(tag => attr(tag,"href")), robots: meta.filter(item => /robots|googlebot/i.test(item.name)), social: meta.filter(item => /^(og:|twitter:)/.test(item.name)), h1: Array.from(visible.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)).map(match => strip(match[1])), headings: Array.from(visible.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)).map(match => ({level:Number(match[1]),text:strip(match[2])})), links: [...new Set(Array.from(visible.matchAll(/<a\b[^>]*>/gi)).map(match => attr(match[0],"href")).filter(href => href.startsWith("/")))], images: Array.from(visible.matchAll(/<img\b[^>]*>/gi)).map(match => ({ src:attr(match[0],"src"), alt:attr(match[0],"alt"), hasAlt: /\balt=/.test(match[0]), width:attr(match[0],"width"), height:attr(match[0],"height") })), structuredData:ld, textWords:strip(visible).split(/\s+/).length };
}
const pages = [];
for (const route of [...publicPaths,...privatePaths,"/solve?new=1","/not-a-solveplot-page","/guides/not-a-guide","/updates/not-an-update"]) pages.push(await inspect(route));
const resources = [];
for (const route of ["/robots.txt","/sitemap.xml"]) {const r=await fetch(new URL(route,base)); resources.push({path:route,status:r.status,text:await r.text()});}
const crawlers = [];
for(const ua of ["Googlebot","bingbot","OAI-SearchBot"]) {
  for(const route of ["/", "/solve", "/guides", ...EDUCATIONAL_GUIDES.map(guideHref)]) {
    const result=await inspect(route,ua);
    crawlers.push({path:route,userAgent:ua,status:result.status,title:result.title,xRobotsTag:result.xRobotsTag,robots:result.robots,canonical:result.canonical});
  }
}
const evidence={base,productionCacheCheck:production,checkedAt:new Date().toISOString(),scope:"Raw unauthenticated HTTP, no JS. Timing is a single HTTP observation, not Core Web Vitals. User-agent probes do not verify crawler IP access or indexing.",pages,resources,crawlers};
mkdirSync(path.dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(evidence,null,2));
if(verify) {
  const failures: string[]=[];
  for(const entry of pages.filter(item=>publicPaths.includes(item.path))) {
    if(entry.status!==200) failures.push(`${entry.path}: status ${entry.status}`);
    if(!entry.title||entry.descriptions.length!==1) failures.push(`${entry.path}: title/description missing or duplicate`);
    if(entry.canonical.length!==1||new URL(entry.canonical[0]).href!==new URL(entry.path,"https://solveplot.com").href) failures.push(`${entry.path}: canonical mismatch`);
    if(entry.h1.length!==1) failures.push(`${entry.path}: ${entry.h1.length} H1s`);
    if(entry.robots.some(item=>/noindex/.test(item.value))||/noindex/.test(entry.xRobotsTag??"")) failures.push(`${entry.path}: unexpected noindex`);
    if(entry.structuredData.some(item=>Boolean((item as {invalidJSON?:boolean}).invalidJSON))) failures.push(`${entry.path}: malformed JSON-LD`);
    if(entry.images.some(image=>!image.hasAlt)) failures.push(`${entry.path}: image without alt attribute`);
  }
  for(const entry of pages.filter(item=>privatePaths.includes(item.path))) if(!entry.robots.some(item=>/noindex/.test(item.value))&&!/noindex/.test(entry.xRobotsTag??"")&&![301,302,303,307,308,401,403,404].includes(entry.status)) failures.push(`${entry.path}: no noindex or access redirect`);
  for(const result of crawlers) if(result.status!==200||/noindex/.test(result.xRobotsTag??"")||result.robots.some(item=>/noindex/.test(item.value))) failures.push(`${result.userAgent} ${result.path}: public crawler request blocked or noindexed`);
  for(const route of ["/not-a-solveplot-page","/guides/not-a-guide","/updates/not-an-update"]) if(pages.find(item=>item.path===route)?.status!==404) failures.push(`${route}: expected 404`);
  const solverAlias=pages.find(item=>item.path==="/solve?new=1")!;
  if(solverAlias.status!==200||solverAlias.canonical.length!==1||solverAlias.canonical[0]!=="https://solveplot.com/solve") failures.push("/solve?new=1: public variant must canonicalize to /solve");
  const solver=pages.find(item=>item.path==="/solve")!;
  if(production&&(!/private/.test(solver.cacheControl??"")||!/no-store/.test(solver.cacheControl??""))) failures.push("/solve: authentication-sensitive response must not use shared caching");
  const sitemap=resources.find(item=>item.path==="/sitemap.xml")!;
  for(const route of publicPaths) if(!sitemap.text.includes(`<loc>${new URL(route,"https://solveplot.com").href}</loc>`)) failures.push(`${route}: absent sitemap`);
  for(const route of privatePaths) if(sitemap.text.includes(`<loc>${new URL(route,"https://solveplot.com").href}</loc>`)) failures.push(`${route}: private route in sitemap`);
  assert.equal(failures.length,0,failures.join("\n"));
}
console.log(`${pages.length} routes, ${resources.length} resources and ${crawlers.length} crawler user-agent probes recorded in ${output}${verify?"; verification passed":""}`);
