/* eslint-disable @next/next/no-img-element -- the source logo is cropped with CSS. */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LandingFooter } from "@/components/landing/landing-details";
import { QuestionList } from "@/components/landing/question-list";
import { FAQ_GROUPS } from "@/components/landing/questions";
import "@/components/landing/landing-reset.css";
import "@/components/landing/landing.css";
import "@/components/landing/landing-refinements.css";
import "@/components/landing/landing-editorial.css";

export const metadata: Metadata = {
  title: `Frequently asked questions | ${BRAND.name}`,
  description: `How to use ${BRAND.name}, compare solving methods, save tricks, and customize your workspace.`,
};

export default function FAQPage() {
  return <div className="solveplot-landing faq-page" id="top">
    <header className="faq-nav">
      <Link href="/" className="landing-logo" aria-label={`${BRAND.name} home`}><span className="provided-mark" aria-hidden="true"><img src="/images/solveplot-logo-source.png" alt="" /></span>{BRAND.wordmark}</Link>
      <Link className="nav-cta" href="/solve">Open solver <ArrowRight size={15} /></Link>
    </header>
    <main className="faq-content">
      <div className="faq-page-heading"><Link href="/">← Back to home</Link><h1>Frequently asked questions</h1><p>Using {BRAND.name}, from your first question to your saved methods</p></div>
      <div className="faq-directory">
        <nav aria-label="FAQ topics">{FAQ_GROUPS.map((group, index) => <a key={group.title} href={`#faq-group-${index}`}>{group.title}</a>)}</nav>
        <div>{FAQ_GROUPS.map((group, index) => <section key={group.title} id={`faq-group-${index}`} aria-labelledby={`faq-heading-${index}`}><h2 id={`faq-heading-${index}`}>{group.title}</h2><QuestionList questions={group.questions} /></section>)}</div>
      </div>
    </main>
    <div className="landing-content"><LandingFooter /></div>
  </div>;
}
