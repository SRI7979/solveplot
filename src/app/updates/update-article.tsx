import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, ChevronDown, Cpu, Layers3, Tag } from "lucide-react";
import { LUNA_COMPARISON, type ProductUpdate } from "@/content/product-updates";
import { UpdateVisual } from "./update-visual";
import styles from "./updates.module.css";

export function UpdateArticle({ update, standalone = false }: { update: ProductUpdate; standalone?: boolean }) {
  const Icon = update.category === "Learn" ? BookOpen : update.category === "Solver" ? Cpu : Layers3;
  return <article id={update.id} className={styles.entry} data-category={update.category} aria-labelledby={`update-${update.id}`}>
    {standalone ? <>
      <div className={styles.documentIcon} aria-hidden="true"><Icon size={48} strokeWidth={1.4} /></div>
      <h1 id={`update-${update.id}`} className={styles.articleTitle}>{update.title}</h1>
      <dl className={`${styles.pageProperties} ${styles.articleProperties}`}><div><dt><Tag size={14} />Type</dt><dd><span className={styles.directoryTag} data-category={update.category}>{update.category}</span></dd></div><div><dt><CalendarDays size={14} />Released</dt><dd><time dateTime={update.date}>{new Date(`${update.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></dd></div></dl>
    </> : <>
      <div className={styles.category}><Icon size={15} />{update.category}<span className={styles.published}><time dateTime={update.date}>{new Date(`${update.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}</time></span></div>
      <h3 id={`update-${update.id}`}><Link href={`/updates/${update.id}`}>{update.title}</Link></h3>
    </>}
    <p className={styles.summary}>{update.summary}</p>
    <UpdateVisual kind={update.visual} />
    {update.metrics && <dl className={styles.metrics}>{update.metrics.map(metric => <div key={metric.label}><dt>{metric.label}</dt><dd>{metric.value}</dd></div>)}</dl>}
    <ul className={styles.changes}>{update.changes.map(change => <li key={change}><Check size={15} /><span>{change}</span></li>)}</ul>
    {update.link && <Link href={update.link.href} className={styles.entryLink}>{update.link.label}<ArrowRight size={16} /></Link>}
    {update.comparison && <ModelComparison />}
    {!standalone && <Link className={styles.permalink} href={`/updates/${update.id}`}>Read update <ArrowUpRight size={14} /></Link>}
  </article>;
}

function ModelComparison() {
  const comparison = LUNA_COMPARISON;
  return <section className={styles.comparison} aria-labelledby="comparison-title">
    <div className={styles.comparisonHeading}><span>Recorded October 26, 2026</span><h4 id="comparison-title">One problem, four configurations</h4><p>One request per configuration on the same compact, text-only similarity problem. These are API request times, <strong>not full SolvePlot solve times</strong>.</p></div>
    <p className={styles.tableHint}>Scroll the table to compare all columns <ArrowRight size={13} /></p>
    <div className={styles.tableScroll} role="region" aria-label="Single-problem model comparison" tabIndex={0}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>Single-request results on Bedrock Prep public Similarity 77m; expected answer 16</caption>
        <thead><tr><th scope="col">Model</th><th scope="col">Reasoning</th><th scope="col">Time</th><th scope="col">Reasoning<br />tokens</th><th scope="col">API cost</th><th scope="col">Answer</th></tr></thead>
        <tbody>{comparison.rows.map(row => <tr key={`${row.model}-${row.reasoning}`} data-current={row.current}><th scope="row"><span>{row.model}</span>{row.current && <small>Current default</small>}</th><td>{row.reasoning}</td><td className={styles.numeric}>{row.seconds.toFixed(3)} s</td><td className={styles.numeric}>{row.reasoningTokens.toLocaleString("en-US")}</td><td className={styles.numeric}>${row.costUSD.toFixed(6)}</td><td><span className={styles.answer} data-correct={row.correct}>{row.answer}<span>{row.correct ? "Correct" : "Incorrect"}</span></span></td></tr>)}</tbody>
      </table>
    </div>
    <div className={styles.methodNotes}><h5>Did the calculator method work?</h5><p>Sol Low and both Luna configurations produced working proportion regressions for the answer 16. Sol included a readout row. For each one-row Luna fit, an extra parameter readout was added <strong>only for the audit</strong> to confirm 16; that row was not model-generated.</p><p>GPT-5-mini answered 100 and produced an incomplete coordinate construction. Twelve of its fourteen original rows errored in Desmos, so no working method is credited.</p></div>
    <details className={styles.details}><summary>Token counts and request settings<ChevronDown size={16} /></summary><div className={styles.detailsBody}><p>All four requests used {comparison.inputTokens} input tokens, {comparison.cachedInputTokens} cached tokens, a {comparison.outputCap.toLocaleString("en-US")}-token output cap, Low verbosity, JSON mode, and requested Priority processing. There were no retries or separate explanation calls.</p><div className={styles.tableScroll} role="region" aria-label="Detailed model token counts" tabIndex={0}><table className={`${styles.table} ${styles.tokenTable}`}><thead><tr><th scope="col">Configuration</th><th scope="col">Visible output</th><th scope="col">Total output</th><th scope="col">Original rows</th></tr></thead><tbody>{comparison.rows.map(row => <tr key={`${row.model}-${row.reasoning}`}><th scope="row">{row.model} {row.reasoning}</th><td>{row.visibleOutputTokens.toLocaleString("en-US")}</td><td>{row.outputTokens.toLocaleString("en-US")}</td><td>{row.originalRows}{row.errorRows ? ` · ${row.errorRows} errors` : " · no errors"}</td></tr>)}</tbody></table></div><p>Total output includes reasoning tokens. Sol and Luna returned the service-tier label Fast; Mini returned priority. Costs use the returned usage and applied tier.</p></div></details>
    <div className={styles.limits}><h5>What this comparison can tell us</h5><p>Luna Low found the same useful proportion at a lower request cost in this test. A single attempt does not establish typical speed, accuracy, or reliability. The compact test excluded the full strategy library, production candidate selection, image input, and separate explanation generation.</p><p>Mini ran after the other three requests. Timing was not controlled for provider load, and no p50 or p95 is inferred. The listed costs are usage-derived <strong>API request costs, not customer prices</strong> or invoice totals.</p></div>
    <div className={styles.sources}><span>Test source</span><a href={comparison.source.href} target="_blank" rel="noreferrer">{comparison.source.label}<ArrowUpRight size={13} /></a><a href={comparison.source.diagram} target="_blank" rel="noreferrer">Public diagram<ArrowUpRight size={13} /></a></div>
  </section>;
}
