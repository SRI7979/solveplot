import type { MetadataRoute } from "next";
import { isIndexableDeployment, SITE_ORIGIN } from "@/lib/site-metadata";
import { PRODUCT_UPDATES } from "@/content/product-updates";
import { EDUCATIONAL_GUIDES, guideHref } from "@/content/educational-guides";

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isIndexableDeployment()) return [];
  const pages: MetadataRoute.Sitemap = ["/", "/solve", "/guides", "/faq", "/privacy", "/terms", "/updates"].map(path => ({ url: new URL(path, SITE_ORIGIN).href }));
  // Dates describe authored publication/update dates, never a fresh timestamp per request.
  for (const update of PRODUCT_UPDATES) pages.push({ url: new URL(`/updates/${update.id}`, SITE_ORIGIN).href, lastModified: update.date });
  for (const guide of EDUCATIONAL_GUIDES) pages.push({ url: new URL(guideHref(guide), SITE_ORIGIN).href });
  return pages;
}
