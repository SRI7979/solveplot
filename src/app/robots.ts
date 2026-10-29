import type { MetadataRoute } from "next";
import { isIndexableDeployment, SITE_ORIGIN } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  if (!isIndexableDeployment()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The public solver entrance is indexable. Other workspace shells remain
        // crawlable so search engines can read their noindex directives.
        // Private records and service endpoints remain excluded; auth still enforces access.
        disallow: ["/api/", "/auth/", "/history", "/tricks", "/solve/"],
      },
      {
        // Preserve the training crawler's previous effective permissions exactly.
        // OAI-SearchBot uses the search rules above independently of GPTBot.
        userAgent: "GPTBot",
        allow: "/",
        disallow: ["/api/", "/auth/", "/login", "/solve", "/learn", "/history", "/tricks", "/settings", "/profile"],
      },
    ],
    sitemap: new URL("/sitemap.xml", SITE_ORIGIN).href,
  };
}
