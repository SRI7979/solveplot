import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/faq", "/privacy", "/terms"].map((path) => ({
    url: new URL(path, SITE_ORIGIN).href,
  }));
}
