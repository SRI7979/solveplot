import type { Metadata } from "next";
import { Landing } from "@/components/landing/landing";
import { BRAND } from "@/lib/brand";
import { SITE_METADATA } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: `${BRAND.name} | SAT Math solver`,
  description: SITE_METADATA.description,
  alternates: { canonical: "/" },
  openGraph: { ...SITE_METADATA.openGraph, url: "/" },
};

export default function Page() {
  return <Landing />;
}
