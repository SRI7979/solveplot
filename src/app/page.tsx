import { Landing } from "@/components/landing/landing";
import { PRODUCT_STRUCTURED_DATA, SITE_DESCRIPTION, SITE_TITLE, jsonLd, publicPageMetadata } from "@/lib/site-metadata";

export const metadata = publicPageMetadata({
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
});

export default function Page() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(PRODUCT_STRUCTURED_DATA) }} /><Landing /></>;
}
