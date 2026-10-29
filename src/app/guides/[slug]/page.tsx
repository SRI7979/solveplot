import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, FileText, Check } from "lucide-react";
import { EDUCATIONAL_GUIDES, getGuide, guideHref } from "@/content/educational-guides";
import { SITE_ORIGIN, jsonLd, publicPageMetadata } from "@/lib/site-metadata";
import MathText from "@/components/math-text";
import { GuideFigure } from "../guide-figure";
import styles from "../guides.module.css";

export function generateStaticParams() { return EDUCATIONAL_GUIDES.map(guide => ({ slug: guide.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  return guide ? publicPageMetadata({ title: `${guide.title} | SolvePlot`, description: guide.description, path: guideHref(guide) }) : {};
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();
  const url = `${SITE_ORIGIN}${guideHref(guide)}`;
  const data = { "@context": "https://schema.org", "@graph": [
    { "@type": "Article", "@id": `${url}#article`, headline: guide.title, description: guide.description, mainEntityOfPage: url, url, inLanguage: "en-US", isAccessibleForFree: true, author: { "@type": "Organization", "@id": `${SITE_ORIGIN}/#organization`, name: "SolvePlot", url: SITE_ORIGIN }, publisher: { "@type": "Organization", "@id": `${SITE_ORIGIN}/#organization`, name: "SolvePlot", url: SITE_ORIGIN }, articleSection: "SAT Math and Desmos guides", about: [{ "@type": "Thing", name: "SAT Math" }, { "@type": "Thing", name: "Desmos graphing calculator" }], educationalLevel: "Secondary school", citation: guide.sources.map(source => source.url) },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_ORIGIN }, { "@type": "ListItem", position: 2, name: "Guides", item: `${SITE_ORIGIN}/guides` }, { "@type": "ListItem", position: 3, name: guide.shortTitle, item: url }] },
  ] };
  return <main className={styles.articleMain}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
    <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/guides"><ArrowLeft size={14} />Guides</Link><span>/</span><span>{guide.shortTitle}</span></nav>
    <article>
      <header className={styles.articleHeading}><div className={styles.pageIcon} aria-hidden="true"><FileText size={40} strokeWidth={1.5} /></div><h1>{guide.title}</h1><dl className={styles.properties}><div><dt>Topic</dt><dd><span className={styles.propertyTag}>{guide.shortTitle}</span></dd></div><div><dt>By</dt><dd>SolvePlot</dd></div></dl><p className={styles.answer}>{guide.answer}</p><p className={styles.byline}>Original worked examples</p></header>
      <nav className={styles.contents} aria-label="On this page"><span>In this guide</span><a href="#worked-example">Worked example</a><a href="#desmos-steps">Desmos steps</a><a href="#algebra">Algebra</a><a href="#practice">Practice</a></nav>
      <div className={styles.prose}>{guide.introduction.map(p => <p key={p}><MathText>{p}</MathText></p>)}
        <section className={styles.section}><h2>{guide.concept.heading}</h2>{guide.concept.paragraphs.map(p => <p key={p}><MathText>{p}</MathText></p>)}</section>
        <section className={styles.section} id="worked-example"><p className={styles.eyebrow}>Original example</p><h2>Work through the question</h2><div className={styles.problem}><p><MathText>{guide.example.question}</MathText></p><span>Answer <strong><MathText>{guide.example.answer}</MathText></strong></span></div><GuideFigure kind={guide.example.chart} />
          <h3 id="desmos-steps">What to enter in Desmos</h3><p>Use one expression row for each entry. Underscores create subscripts; the tilde <code>~</code> fits parameters.</p><ol className={styles.steps}>{guide.example.rows.map(row => <li key={row.entry}><pre><code>{row.entry}</code></pre><p>{row.purpose}</p></li>)}</ol>
          <h3>Read the result</h3><p>{guide.example.readout}</p><div className={styles.check}><strong><Check size={17} aria-hidden="true" />Check it</strong><p><MathText>{guide.example.check}</MathText></p></div><p className={styles.calcLink}><a href="https://www.desmos.com/calculator" target="_blank" rel="noreferrer">Try the entries in Desmos <ArrowUpRight size={14} /></a></p>
        </section>
        <section className={styles.section} id="algebra"><h2>The algebraic solution</h2><ol className={styles.algebra}>{guide.algebra.map(p => <li key={p}><MathText>{p}</MathText></li>)}</ol></section>
        <section className={styles.section}><h2>When is each method useful?</h2><div className={styles.methodPair}><div><h3>Use Desmos when</h3><p>{guide.calculatorWhen}</p></div><div><h3>Use algebra when</h3><p>{guide.algebraWhen}</p></div></div></section>
        <section className={styles.section}><h2>Common mistakes to avoid</h2><ul className={styles.pitfalls}>{guide.pitfalls.map(p => <li key={p}>{p}</li>)}</ul></section>
        <section className={styles.section} id="practice"><h2>Try one yourself</h2><p><MathText>{guide.practice.question}</MathText></p><details className={styles.practice}><summary>See the answer and steps</summary><div><strong><MathText>{guide.practice.answer}</MathText></strong><p><MathText>{guide.practice.explanation}</MathText></p><p>Desmos entries:</p><pre><code>{guide.practice.rows.join("\n")}</code></pre></div></details></section>
        <section className={styles.sources}><h2>Calculator references</h2><p>The examples above are original. These official resources explain the calculator features and test-day rules.</p><ul>{guide.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title} <ArrowUpRight size={12} /></a></li>)}</ul></section>
      </div>
    </article>
    <section className={styles.related}><h2>Related guides</h2><div>{guide.related.map(slug => { const related = getGuide(slug)!; return <Link href={guideHref(related)} key={slug}>{related.shortTitle}<ArrowRight size={16} /></Link>; })}</div></section>
    <section className={styles.articleCta}><h2>See the steps for your own question</h2><p>Upload or type an SAT math problem in SolvePlot to work through a calculator method and its explanation.</p><Link href="/solve" className={styles.primary}>Open SolvePlot <ArrowRight size={17} /></Link></section>
    <footer className={styles.documentFooter}><Link href="/guides">All guides</Link><Link href="/updates">Product updates</Link><Link href="/privacy">Privacy</Link></footer>
  </main>;
}
