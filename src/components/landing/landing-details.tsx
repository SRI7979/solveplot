/* eslint-disable @next/next/no-img-element -- the source logo is cropped with CSS. */
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { LANDING_QUESTIONS } from "./questions";
import { QuestionList } from "./question-list";

export function LandingDetails() {
  return <>
    <section className="landing-faq refined-faq" id="questions" aria-labelledby="faq-title">
      <div className="faq-intro">
        <h2 id="faq-title">Frequently asked questions</h2>
        <Link href="/faq" className="faq-page-link">View all questions <ArrowRight size={16} /></Link>
      </div>
      <QuestionList questions={LANDING_QUESTIONS} />
    </section>
    <section className="quiet-cta">
      <div><h2>Try {BRAND.name}</h2></div>
      <Link href="/solve" className="landing-cta">Open solver <ArrowRight size={17} /></Link>
    </section>
    <LandingFooter />
  </>;
}

export function LandingFooter() {
  return <footer className="site-footer">
    <div className="footer-top">
      <div className="footer-brand">
        <Link href="/" className="landing-logo" aria-label={`${BRAND.name} home`}><span className="provided-mark" aria-hidden="true"><img src="/images/solveplot-logo-source.png" alt="" /></span>{BRAND.wordmark}</Link>
        <p>SAT Math solver</p>
        <span className="prototype-label">Independent of Desmos</span>
      </div>
      <div><h3>Product</h3><Link href="/solve">Solver</Link><Link href="/history">History</Link><Link href="/tricks">Saved tricks</Link><Link href="/#preview">How it works</Link></div>
      <div><h3>Resources</h3><Link href="/faq">FAQ</Link><a href="https://www.desmos.com/calculator" target="_blank" rel="noreferrer">Desmos calculator</a><a href={BRAND.contact.href}>Contact support</a></div>
      <div><h3>Project</h3><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Use</Link><a href="#project-notices">Attribution &amp; licenses</a><a href="#how-solveplot-works">How {BRAND.name} works</a></div>
    </div>
    <div className="footer-notices" id="project-notices">
      <details><summary>Attribution &amp; third-party licenses <Plus size={14} aria-hidden="true" /></summary><p>{BRAND.name} is independent of Desmos. Desmos retains ownership of its calculator and trademarks. Open-source software used here includes <a href="https://github.com/facebook/react/blob/main/LICENSE">React (MIT)</a>, <a href="https://github.com/vercel/next.js/blob/canary/license.md">Next.js (MIT)</a>, <a href="https://github.com/KaTeX/KaTeX/blob/main/LICENSE">KaTeX (MIT)</a>, and <a href="https://lucide.dev/license">Lucide (ISC)</a>. Their respective licenses apply.</p></details>
      <details id="how-solveplot-works"><summary>How {BRAND.name} works <Plus size={14} aria-hidden="true" /></summary><p>{BRAND.name} sends your question to an AI model to read it and find a method. Calculator entries are checked before being shown, and your questions and solutions are saved in History. Desmos provides the embedded calculator.</p></details>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} {BRAND.name}</span><a href="#top">Back to top ↑</a></div>
  </footer>;
}
