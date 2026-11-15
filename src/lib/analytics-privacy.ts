import type { BeforeSendEvent } from "@vercel/analytics";

const PUBLIC_PAGES = new Set(["/", "/faq", "/privacy", "/terms", "/updates", "/guides"]);
// Keep this tiny route list separate from guide content so public analytics does not bundle the articles.
const GUIDE_PAGES = new Set(["/guides/desmos-sat", "/guides/systems-of-equations", "/guides/regression", "/guides/quadratics"]);
const WORKSPACE_PAGES = new Set(["/solve", "/learn", "/history", "/tricks", "/settings", "/profile", "/question-bank"]);

/** Remove URL data that can contain a problem, account identifier, or auth token.
 * Only page locations are exposed by Vercel's beforeSend API; no claim is made
 * that this filters network headers or the provider's own request metadata.
 */
export function analyticsPath(pathname: string): string | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (PUBLIC_PAGES.has(path) || WORKSPACE_PAGES.has(path)) return path;
  if (/^\/history\/[^/]+$/.test(path)) return "/history";
  if (/^\/learn\/(?:checkpoint\/)?[a-z0-9-]{1,90}$/.test(path)) return "/learn";
  if (GUIDE_PAGES.has(path)) return path;
  // Even a 404 slug can contain a name or pasted text. Preserve only known guide
  // paths; aggregate all other guide/update locations without their raw segments.
  if (path.startsWith("/guides/")) return "/guides";
  if (path.startsWith("/updates/")) return "/updates";
  return null;
}

export function sanitizeAnalyticsEvent(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url, "https://solveplot.com");
    if (!/^https?:$/.test(url.protocol)) return null;
    const path = analyticsPath(url.pathname);
    if (!path) return null;
    url.pathname = path;
    url.search = "";
    url.hash = "";
    url.username = "";
    url.password = "";
    return { ...event, url: url.href };
  } catch {
    return null;
  }
}
