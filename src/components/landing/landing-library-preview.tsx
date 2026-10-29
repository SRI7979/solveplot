"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Bookmark, Calculator, ChartNoAxesCombined, Check, ChevronDown, Copy, History, Plus, Search, ScanLine, Trash2, UserRound } from "lucide-react";
import MathExpression from "@/components/math-expression";
import MathText from "@/components/math-text";
import library from "@/components/library-ui.module.css";
import { ProductScene, ProductSurface } from "./product-scene";
import { LANDING_SOLUTION } from "./landing-solver-demo";
import styles from "./landing-library-preview.module.css";

const EXAMPLES = [
  {
    id: "roots",
    title: "Bracket regression",
    question: "One root of 3x² − 16x + 2 = 0 is (a + √b) / 6, where a and b are integers. Find a + b.",
    description: "Graph the quadratic, then fit both root forms to the two x-intercepts.",
    expressions: LANDING_SOLUTION.expressions.map(expression => expression.latex),
    answer: "248",
    solutionHref: "#interactive-solution",
  },
  {
    id: "table",
    title: "Three-point regression",
    question: "A quadratic has f(1) = 8, f(2) = 15, and f(4) = 35. Find f(10).",
    description: "Fit a quadratic to the three given points, then evaluate the fitted function.",
    expressions: ["x_1=[1,2,4]", "y_1=[8,15,35]", "y_1\\sim ax_1^2+bx_1+c", "f(x)=ax^2+bx+c", "f(10)"],
    answer: "143",
    solutionHref: null,
  },
] as const;

/** The actual library card markup and styles, with local sample actions. */
export function LibraryPreview() {
  const [view, setView] = useState<"saved" | "history">("saved");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>(["roots", "table"]);
  const [expanded, setExpanded] = useState<string[]>(["roots"]);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (copyTimeout.current) clearTimeout(copyTimeout.current); }, []);
  const items = view === "history" ? [EXAMPLES[0]] : EXAMPLES.filter(example => saved.includes(example.id));
  const examples = items.filter(example => `${example.title} ${example.description} ${example.question} ${example.answer}`.toLowerCase().includes(query.toLowerCase().trim()));
  function changeView(next: "saved" | "history") { setView(next); setQuery(""); }
  async function copy(id: string, index: number, latex: string) {
    try { await navigator.clipboard.writeText(latex); setCopied(`${id}:${index}`); setCopyError(null); }
    catch { setCopied(null); setCopyError(id); }
    finally {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
      copyTimeout.current = setTimeout(() => { setCopied(null); setCopyError(null); }, 2500);
    }
  }
  return <ProductScene className={styles.stage} aria-label="Example of Saved tricks and History">
    <ProductSurface className={styles.workspace}>
      <aside className={styles.sidebar} aria-label="Sample workspace navigation">
        <div className={styles.brand}><svg viewBox="0 0 30 30" aria-hidden="true"><rect x="1" y="1" width="28" height="28" rx="10" /><path d="M7 19c4 0 4-9 8-9s4 9 8 9M7 15h16" /></svg><span>SolvePlot</span></div>
        <a href="/solve" className={styles.newProblem}><Plus size={16} /> New problem</a>
        <a href="#interactive-solution" className={styles.solver}><ScanLine size={16} /> Solver</a>
        <button type="button" onClick={() => changeView("history")} aria-pressed={view === "history"}><History size={16} /> History</button>
        <button type="button" onClick={() => changeView("saved")} aria-pressed={view === "saved"}><Bookmark size={16} /> Saved tricks</button>
        <div className={styles.sample}><span className={styles.avatar}><UserRound size={18} /></span><span>Your workspace<small>Example account</small></span></div>
      </aside>
      <div className={styles.library}>
        <header className={`${library.heading} ${styles.libraryHeading}`}><div className={library.title}><span className={library.pageIcon}>{view === "saved" ? <Bookmark size={24} /> : <History size={24} />}</span><h3>{view === "saved" ? "Saved tricks" : "History"}</h3></div></header>
        <div className={library.toolbar}>
          <p className={library.count} role="status">{view === "saved" ? `${saved.length} ${saved.length === 1 ? "trick" : "tricks"} saved` : `${query.trim() ? `${examples.length} of ` : ""}${items.length} ${items.length === 1 ? "problem" : "problems"}`}</p>
          <label className={library.search}><Search size={17} /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={view === "saved" ? "Search your tricks" : "Search this page"} aria-label={`Search sample ${view === "saved" ? "saved tricks" : "history"}`} /></label>
        </div>
        {view === "saved" ? <ul className={library.list}>
          {examples.map(example => <li key={example.id} className={library.trick}>
            <div className={library.row}><span className={library.rowIcon}><Bookmark size={20} /></span><div className={library.rowContent}>
              <div className={library.rowHeading}><h2>{example.title}</h2><button type="button" className={`${library.remove} iconControl dangerControl`} onClick={() => setSaved(current => current.filter(id => id !== example.id))} aria-label={`Remove saved trick ${example.title} from this example`}><Trash2 size={16} /></button></div>
              <p className={library.excerpt}><MathText>{example.description}</MathText></p>
            </div></div>
            <details className={library.details} open={expanded.includes(example.id)} onToggle={event => { const open = event.currentTarget.open; setExpanded(current => current.includes(example.id) === open ? current : open ? [...current, example.id] : current.filter(id => id !== example.id)); }}>
              <summary className="disclosureControl"><Calculator size={15} /><span className={library.detailsLabel}>Review trick · {example.expressions.length} lines</span><ChevronDown size={15} /></summary>
              <p><MathText>{example.question}</MathText></p>
              <ol className={`${library.entries} ${styles.expressionList}`}>{example.expressions.map((latex, index) => <li key={index}><div><MathExpression latex={latex} /></div><button type="button" className="copyButton" data-motion="copy" data-copied={copied === `${example.id}:${index}`} aria-label={`Copy saved line ${index + 1} from ${example.title}`} onClick={() => void copy(example.id, index, latex)}>{copied === `${example.id}:${index}` ? <Check size={14} /> : <Copy size={14} />}{copied === `${example.id}:${index}` ? "Copied" : "Copy"}</button></li>)}</ol>
              {copyError === example.id && <p role="status">Select the expression to copy it.</p>}
            </details>
            <div className={library.rowFooter}><span className={library.answer}>Answer <strong><MathText>{example.answer}</MathText></strong></span>{example.solutionHref && <a href={example.solutionHref} className="outlinedControl">View solution <ArrowUpRight size={14} /></a>}</div>
          </li>)}
        </ul> : <ul className={library.list}>
          {examples.map(example => <li key={example.id}><a href={example.solutionHref ?? "#interactive-solution"} className={library.problem}>
            <div className={library.row}><span className={library.rowIcon}><ChartNoAxesCombined size={20} /></span><div className={library.rowContent}><div className={library.rowHeading}><h2>{example.title}</h2><time dateTime="2026-10-19T16:28:00Z">Oct 19, 2026</time></div><p className={library.excerpt}><MathText>{example.question}</MathText></p></div></div>
            <div className={library.rowFooter}><span className={library.answer}><Check size={13} /> Answer <strong><MathText>{example.answer}</MathText></strong></span><span className={library.open}>View solution <ArrowRight size={15} /></span></div>
          </a></li>)}
        </ul>}
        {examples.length === 0 && <div className={library.empty} role="status">{view === "saved" && saved.length === 0 ? <><h2>No saved tricks yet</h2><p>Use Save this trick on a solution to keep its technique here</p><Bookmark size={30} /></> : <><Search size={28} /><h2>No matching {view === "saved" ? "tricks" : "problems"}</h2><p>Try another search.</p><button type="button" className="secondaryButton" onClick={() => setQuery("")}>Clear search</button></>}</div>}
      </div>
    </ProductSurface>
  </ProductScene>;
}
