/* eslint-disable @next/next/no-img-element -- the source logo is cropped with CSS. */
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LandingFooter } from "./landing-details";
import "./landing-reset.css";
import "./landing.css";
import "./landing-refinements.css";
import "./landing-editorial.css";
import "./legal-page.css";

export const LEGAL_UPDATED = "October 13, 2026";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: ReactNode }) {
  return <div className="desmo-landing legal-page" id="top">
    <header className="faq-nav">
      <Link href="/" className="landing-logo" aria-label={`${BRAND.name} home`}><span className="provided-mark" aria-hidden="true"><img src="/images/desmo-logo-source.png" alt="" /></span>{BRAND.wordmark}</Link>
      <Link href="/solve" className="nav-cta">Open solver <ArrowRight size={15} /></Link>
    </header>
    <main className="legal-content">
      <div className="legal-heading"><Link href="/">← Back to home</Link><h1>{title}</h1><p>{intro}</p><span>Last updated {LEGAL_UPDATED}</span></div>
      <article className="legal-body" aria-label={title}>{children}</article>
    </main>
    <div className="landing-content"><LandingFooter /></div>
  </div>;
}

/** Replace the public contact in brand.ts when an approved support email exists. */
export function LegalContact() {
  return <a href={BRAND.contact.href}>{BRAND.contact.label}</a>;
}
