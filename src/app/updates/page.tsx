import { publicPageMetadata } from "@/lib/site-metadata";
import Link from "next/link";
import { CalendarDays, FileText, List } from "lucide-react";
import { PRODUCT_UPDATES } from "@/content/product-updates";
import { UpdateArticle } from "./update-article";
import styles from "./updates.module.css";

export const metadata = publicPageMetadata({
  title: "Updates | SolvePlot",
  description: "What changed in SolvePlot: lessons, calculator workflows, and the workspace, with screenshots and release notes.",
  path: "/updates",
});

export default function UpdatesPage() {
  const dates = [...new Set(PRODUCT_UPDATES.map(update => update.date))];
  return <main className={styles.main} id="top">
    <header className={styles.heading}>
      <div className={styles.documentIcon} aria-hidden="true"><FileText size={48} strokeWidth={1.4} /></div>
      <h1>Updates</h1><p>What’s new in SolvePlot</p>
      <dl className={styles.pageProperties}><div><dt><List size={14} />Type</dt><dd><span className={styles.propertyTag}>Release notes</span></dd></div><div><dt><CalendarDays size={14} />Latest</dt><dd><time dateTime={PRODUCT_UPDATES[0].date}>{dateLabel(PRODUCT_UPDATES[0].date)}</time></dd></div></dl>
    </header>
    <section className={styles.directory} aria-label="Browse release notes">
      <div className={styles.databaseTab}><List size={15} />All updates<span>{PRODUCT_UPDATES.length}</span></div>
      <div className={styles.directoryScroll} role="region" aria-label="Release notes table" tabIndex={0}>
        <table><caption className={styles.srOnly}>SolvePlot updates by name, type, and release date</caption><thead><tr><th scope="col"><FileText size={14} />Name</th><th scope="col">Type</th><th scope="col">Released</th></tr></thead><tbody>{PRODUCT_UPDATES.map(update => <tr key={update.id}><th scope="row"><a href={`#${update.id}`}><FileText size={15} /><span>{update.title}</span></a></th><td><span className={styles.directoryTag} data-category={update.category}>{update.category}</span></td><td><time dateTime={update.date}>{shortDate(update.date)}</time></td></tr>)}</tbody></table>
      </div>
    </section>
    <div className={styles.releases}>{dates.map(date => <section key={date} className={styles.release} aria-labelledby={`release-${date}`}><h2 className={styles.releaseDate} id={`release-${date}`}><time dateTime={date}>{dateLabel(date)}</time><span>{PRODUCT_UPDATES.filter(update => update.date === date).length} updates</span></h2><div className={styles.entries}>{PRODUCT_UPDATES.filter(update => update.date === date).map(update => <UpdateArticle key={update.id} update={update} />)}</div></section>)}</div>
    <footer className={styles.footer}><Link href="/">SolvePlot home</Link><a href="#top">Back to top ↑</a></footer>
  </main>;
}

function dateLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
function shortDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
