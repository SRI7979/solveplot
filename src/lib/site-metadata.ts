import type { Metadata } from "next";
import { BRAND } from "./brand";
import { getSiteOrigin } from "./supabase/config";

const configuredOrigin = getSiteOrigin();
export const SITE_ORIGIN = configuredOrigin && !["localhost", "127.0.0.1", "[::1]"].includes(new URL(configuredOrigin).hostname)
  ? configuredOrigin
  : `https://${BRAND.domain}`;
const title = `${BRAND.name} | SAT Math solver`;
const description = "Upload or type an SAT Math question. SolvePlot fills the calculator and explains each step.";
const image = {
  url: "/images/solveplot-share-v1.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "SolvePlot’s SAT Math solver, showing a worked solution and the Desmos graphing calculator.",
};

/** Canonicals and share cards follow the configured live domain during a move. */
export const SITE_METADATA = {
  metadataBase: new URL(SITE_ORIGIN),
  applicationName: BRAND.name,
  description,
  openGraph: {
    title,
    description,
    siteName: BRAND.name,
    type: "website",
    locale: "en_US",
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: image.url, alt: image.alt }],
  },
} satisfies Metadata;
