import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site-metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/auth/", "/login", "/solve", "/history", "/tricks", "/settings", "/profile"],
    },
    sitemap: new URL("/sitemap.xml", SITE_ORIGIN).href,
  };
}
