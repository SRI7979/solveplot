import type { Metadata } from "next";
import { BRAND } from "./brand";

/** Search and share URLs use the public brand domain, never a preview host or auth callback origin. */
export const SITE_ORIGIN = `https://${BRAND.domain}`;
export const SITE_TITLE = "SolvePlot | Free SAT Math Solver with Desmos Steps";
export const SITE_DESCRIPTION = "Solve SAT math with Desmos-first methods and step-by-step explanations. Upload a question, compare calculator and algebra approaches, and practise for free.";
const image = {
  url: "/images/solveplot-share-v2.png",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "SolvePlot’s SAT Math solver, showing a worked solution and the Desmos graphing calculator.",
};

/** Local checks can inspect the production policy; Vercel previews/development must never be indexed. */
export function isIndexableDeployment(environment = process.env.VERCEL_ENV): boolean {
  return !environment || environment === "production";
}

export const SITE_METADATA = {
  metadataBase: new URL(SITE_ORIGIN),
  applicationName: BRAND.name,
  icons: {
    icon: [
      { url: "/icons/solveplot-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/solveplot-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/solveplot-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  description: SITE_DESCRIPTION,
  robots: { index: isIndexableDeployment(), follow: isIndexableDeployment() },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: BRAND.name,
    type: "website",
    locale: "en_US",
    images: [image],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: image.url, alt: image.alt }],
  },
} satisfies Metadata;

/** Specify all nested social fields because Next metadata merges nested objects shallowly. */
export function publicPageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: SITE_METADATA.robots,
    openGraph: { ...SITE_METADATA.openGraph, title, description, url: path },
    twitter: { ...SITE_METADATA.twitter, title, description },
  };
}

export const PRIVATE_ROBOTS = { index: false, follow: false, noarchive: true } as const;

/** Only public product facts, with no inferred credentials, ratings or traffic claims. */
export const PRODUCT_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_ORIGIN}/#organization`,
      name: BRAND.name,
      url: SITE_ORIGIN,
      logo: {
        "@type": "ImageObject",
        "@id": `${SITE_ORIGIN}/#logo`,
        url: `${SITE_ORIGIN}/icons/solveplot-512.png`,
        contentUrl: `${SITE_ORIGIN}/icons/solveplot-512.png`,
        width: 512,
        height: 512,
        caption: BRAND.name,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_ORIGIN}/#website`,
      url: SITE_ORIGIN,
      name: BRAND.name,
      alternateName: BRAND.domain,
      description: SITE_DESCRIPTION,
      inLanguage: "en-US",
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/#application`,
      name: BRAND.name,
      url: SITE_ORIGIN,
      description: SITE_DESCRIPTION,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web browser",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    },
  ],
};

/** Escape '<' so embedded JSON cannot terminate its script element. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
