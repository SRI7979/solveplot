import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { SITE_DESCRIPTION } from "@/lib/site-metadata";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND.name,
    short_name: BRAND.name,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "browser",
    icons: [
      { src: "/icons/solveplot-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/solveplot-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
