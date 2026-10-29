import Link from "next/link";
import { ArrowRight, BookOpen, FileText, List } from "lucide-react";
import { EDUCATIONAL_GUIDES, guideHref } from "@/content/educational-guides";
import { SITE_ORIGIN, jsonLd, publicPageMetadata } from "@/lib/site-metadata";
import styles from "./guides.module.css";

export const metadata = publicPageMetadata({ title: "SAT Math and Desmos Guides | SolvePlot", description: "Free SAT math guides with original worked examples, Desmos calculator entries, algebra alternatives, and practice answers.", path: "/guides" });

export default function GuidesPage() {
  const data = { "@context": "https://schema.org", "@type": "CollectionPage", name: "SAT Math and Desmos guides", url: `${SITE_ORIGIN}/guides`, description: "Original worked examples comparing practical calculator methods with algebra.", mainEntity: { "@type": "ItemList", itemListElement: EDUCATIONAL_GUIDES.map((guide, index) => ({ "@type": "ListItem", position: index + 1, url: `${SITE_ORIGIN}${guideHref(guide)}`, name: guide.title })) } };
  return <main className={styles.hub}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
    <div className={styles.hubHeading}><div className={styles.pageIcon} aria-hidden="true"><BookOpen size={40} strokeWidth={1.5} /></div><h1>SAT math with Desmos</h1><p>Worked examples, calculator entries, and the algebra behind them</p><dl className={styles.properties}><div><dt>Collection</dt><dd>Study guides</dd></div><div><dt>Access</dt><dd><span className={styles.propertyTag}>Free · No sign-in</span></dd></div></dl></div>
    <p className={styles.intro}>Start with a method you can explain. These free guides show what to enter, which result to read, and how to check it. Each includes an original SAT-style practice question with its solution.</p>
    <section className={styles.guideDatabase} aria-label="Available guides"><div className={styles.databaseToolbar}><span><List size={16} />All guides</span><span>{EDUCATIONAL_GUIDES.length} pages</span></div><div className={styles.databaseHeader} aria-hidden="true"><span>Name</span><span>Topic</span></div><div className={styles.guideGrid}>{EDUCATIONAL_GUIDES.map(guide => <Link key={guide.slug} href={guideHref(guide)} className={styles.guideCard}><FileText size={19} strokeWidth={1.6} aria-hidden="true" /><div><h2>{guide.title}</h2><p>{guide.description}</p></div><span className={styles.topicTag}>{guide.shortTitle}</span><ArrowRight size={15} aria-hidden="true" /></Link>)}</div></section>
    <section className={styles.hubCallout}><div><h2>Have a question to work through?</h2><p>SolvePlot turns an uploaded or typed question into calculator steps and explanations. You can browse the workspace before signing in.</p></div><Link href="/solve" className={styles.primary}>Open the SAT math solver <ArrowRight size={17} /></Link></section>
    <section className={styles.hubNote}><h2>What should you practise first?</h2><p>If you are new to Desmos, start with the SAT overview, then learn intersections and quadratic features. Try regression when a question supplies a model with unknown parameters. The interactive <Link href="/learn">Desmos skills lessons</Link> provide guided checks and editable calculators after sign-in.</p><p>These examples teach the methods; they are original SolvePlot exercises, not official SAT questions. For the test-day calculator, practise in Bluebook and follow <a href="https://satsuite.collegeboard.org/in-school-assessments/calculator-policy" target="_blank" rel="noreferrer">College Board’s current calculator policy</a>.</p></section>
    <footer className={styles.documentFooter}><Link href="/updates">Product updates</Link><Link href="/faq">FAQ</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></footer>
  </main>;
}
