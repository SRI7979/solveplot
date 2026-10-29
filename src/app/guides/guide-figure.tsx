import type { EducationalGuide } from "@/content/educational-guides";
import styles from "./guides.module.css";

/** An explanatory SVG, not a screenshot or a substitute for the calculator walkthrough. */
export function GuideFigure({ kind }: { kind: EducationalGuide["example"]["chart"] }) {
  const ranges = kind === "quadratic" ? { left: 0, right: 8, bottom: -6, top: 14 } : kind === "systems" ? { left: 0, right: 10, bottom: -4, top: 16 } : kind === "regression" ? { left: -1, right: 5, bottom: 0, top: 32 } : { left: 0, right: 10, bottom: -5, top: 5 };
  const x = (value: number) => 42 + (value - ranges.left) / (ranges.right - ranges.left) * 436;
  const y = (value: number) => 24 + (ranges.top - value) / (ranges.top - ranges.bottom) * 226;
  const curve = (fn: (value: number) => number) => Array.from({ length: 161 }, (_, i) => { const input = ranges.left + (ranges.right - ranges.left) * i / 160; return `${i === 0 ? "M" : "L"}${x(input).toFixed(2)},${y(fn(input)).toFixed(2)}`; }).join(" ");
  const title = kind === "linear" ? "The equation 3x + 4 = 19 graphs as a vertical line at x = 5" : kind === "systems" ? "The lines x + y = 12 and 2x − y = 3 intersect at (5, 7)" : kind === "quadratic" ? "The parabola x² − 8x + 12 has vertex (4, −4) and roots 2 and 6" : "The fitted curve x² + 2x + 3 passes through (0, 3), (1, 6), and (2, 11), and reaches (4, 27)";
  const target = kind === "quadratic" ? [4, -4] : kind === "systems" ? [5, 7] : kind === "regression" ? [4, 27] : [5, 0];
  const label = `(${target[0]}, ${target[1]})`;
  return <figure className={styles.graphFigure}>
    <svg viewBox="0 0 520 285" role="img" aria-label={title}>
      <defs><clipPath id={`guide-plot-${kind}`}><rect x="42" y="24" width="436" height="226" /></clipPath></defs>
      <rect x="0" y="0" width="520" height="285" fill="var(--doc-bg, #fff)" />
      {Array.from({ length: 9 }, (_, index) => <line key={`v${index}`} x1={42 + index * 54.5} x2={42 + index * 54.5} y1="24" y2="250" stroke="var(--doc-border, #e9e9e7)" />)}
      {Array.from({ length: 7 }, (_, index) => <line key={`h${index}`} x1="42" x2="478" y1={24 + index * 226 / 6} y2={24 + index * 226 / 6} stroke="var(--doc-border, #e9e9e7)" />)}
      <line x1="42" x2="478" y1={y(0)} y2={y(0)} stroke="var(--doc-muted, #9b9a97)" /><line x1={x(0)} x2={x(0)} y1="24" y2="250" stroke="var(--doc-muted, #9b9a97)" />
      <g clipPath={`url(#guide-plot-${kind})`} fill="none" strokeWidth="3">
        {kind === "linear" ? <line x1={x(5)} x2={x(5)} y1="24" y2="250" stroke="var(--doc-plot, #4485ae)" /> : kind === "systems" ? <><path d={curve(value => 12 - value)} stroke="var(--doc-plot, #4485ae)" /><path d={curve(value => 2 * value - 3)} stroke="var(--doc-plot-alt, #9a6bb0)" /></> : <path d={curve(value => kind === "quadratic" ? value ** 2 - 8 * value + 12 : value ** 2 + 2 * value + 3)} stroke="var(--doc-plot, #4485ae)" />}
      </g>
      {kind === "regression" && [[0, 3], [1, 6], [2, 11]].map(([a, b]) => <circle key={a} cx={x(a)} cy={y(b)} r="4" fill="var(--doc-plot-point, #6b8c69)" stroke="var(--doc-bg, #fff)" strokeWidth="2" />)}
      <circle cx={x(target[0])} cy={y(target[1])} r="5" fill="var(--doc-plot, #4485ae)" stroke="var(--doc-bg, #fff)" strokeWidth="2" />
      <rect x={x(target[0]) + 12} y={y(target[1]) - 30} width="84" height="25" rx="5" fill="var(--doc-bg, #fff)" stroke="var(--doc-border, #e9e9e7)" /><text x={x(target[0]) + 54} y={y(target[1]) - 13} textAnchor="middle" fill="var(--doc-text, #37352f)" fontSize="12">{label}</text>
      <text x="485" y={Math.min(263, y(0) + 16)} fill="var(--doc-muted, #9b9a97)" fontSize="12">x</text><text x={Math.max(21, x(0) - 16)} y="21" fill="var(--doc-muted, #9b9a97)" fontSize="12">y</text>
    </svg><figcaption>{title}. Illustration; follow the rows below in Desmos.</figcaption>
  </figure>;
}
