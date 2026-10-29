import Image from "next/image";
import { LUNA_COMPARISON, type ProductUpdate } from "@/content/product-updates";
import styles from "./updates.module.css";

const screenshots = {
  guides: { file: "public-guides", width: 1440, height: 1000, alt: "SolvePlot public guide directory with worked topics for Desmos, systems, regression, and quadratics", caption: "The public guide directory. Each topic opens a complete worked example without requiring sign-in." },
  loading: { file: "loading-layouts", width: 790, height: 288, alt: "Solver and Learn loading layouts, with an upload area for Solver and course cards for Learn", caption: "Actual loading components captured as static previews. Each follows the page it is about to display." },
  solver: { file: "solver-workspace", width: 1145, height: 1099, alt: "SolvePlot's public sample with a bracket regression and a checked readout in Desmos", caption: "Current public demo: calculator entries beside the explanation. This illustrates the workspace, not a new benchmark result." },
  lesson: { file: "lesson-player", width: 1369, height: 965, alt: "Introduction to Desmos in the lesson player", caption: "The current Introduction lesson. Teaching, examples, and exercises share the same lesson player." },
  free: { file: "free-access", width: 901, height: 325, alt: "Homepage invitation to open SolvePlot, with Completely free beneath it", caption: "Free access is stated beside the homepage's main action." },
  tabs: { file: "learning-tabs", width: 325, height: 52, alt: "Desmos skills and SAT math course tabs with Desmos skills selected", caption: "The two courses share a sliding selection indicator. Still screenshot of the selected state." },
  progress: { file: "learn-progress", width: 1069, height: 374, alt: "Learn overview showing lessons finished, first-try accuracy, and checkpoints", caption: "Current course overview with an empty progress state. Historical wording has changed in later releases." },
  catalog: { file: "lesson-catalog", width: 1069, height: 813, alt: "Beginner course cards for functions, graphing equations, tables, and intersections", caption: "Current beginner section of the Desmos skills course." },
} as const;

export function UpdateVisual({ kind }: { kind: ProductUpdate["visual"] }) {
  if (kind === "brand") return <figure className={styles.visual}>
    <div className={styles.chart}>
      <div className={styles.chartHeading}><strong>SolvePlot</strong><span>The existing official icon</span></div>
      <Image src="/icons/solveplot-192.png" alt="SolvePlot's blue graph mark on its existing rounded square background" width={96} height={96} />
    </div>
    <figcaption>The same SolvePlot artwork, now provided in square PNG sizes and a multi-size browser favicon.</figcaption>
  </figure>;
  if (kind === "benchmark") return <figure className={styles.visual}>
    <div className={styles.chart} role="img" aria-label="Single-request completion times: Sol Low 6.006 seconds, Luna Low 6.819 seconds, Luna Medium 9.764 seconds, Mini Low 17.322 seconds. Mini's answer was incorrect.">
      <div className={styles.chartHeading}><strong>Same problem. Four requests.</strong><span>Request completion time · seconds</span></div>
      {LUNA_COMPARISON.rows.map(row => <div className={styles.barRow} key={`${row.model}-${row.reasoning}`} data-current={row.current}><div><span>{row.model} {row.reasoning}</span><strong>{row.seconds.toFixed(2)} s</strong></div><div className={styles.barTrack}><i style={{ width: `${row.seconds / 18 * 100}%` }} /></div>{!row.correct && <small>Incorrect answer</small>}</div>)}
    </div>
    <figcaption>Recorded October 26. One compact text-only request per configuration, not full production solves. The complete results and limitations are below.</figcaption>
  </figure>;
  const shot = screenshots[kind];
  return <figure className={styles.visual} data-visual={kind}>
    <a className={styles.screenshot} href={`/images/updates/${shot.file}.webp`} target="_blank" rel="noreferrer" aria-label={`Enlarge screenshot: ${shot.alt}`}>
      <Image src={`/images/updates/${shot.file}.webp`} alt={shot.alt} width={shot.width} height={shot.height} sizes="(max-width: 760px) 100vw, 780px" />
      <span className={styles.enlarge}>View full size ↗</span>
    </a>
    <figcaption>{shot.caption}</figcaption>
  </figure>;
}
