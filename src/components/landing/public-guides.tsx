import Link from "next/link";
import { ArrowRight } from "lucide-react";
import "./public-guides.css";

/** Public teaching copy stays in server HTML; interactive courses retain their sign-in rules. */
export function PublicGuides() {
  return <section className="public-guides" aria-labelledby="public-guides-title">
    <header><h2 id="public-guides-title">Desmos for SAT math</h2><Link href="/guides">All guides <ArrowRight size={15} /></Link></header>
    <p>Graph equations to find solutions, fit a model with regression, or use algebra when it takes fewer steps. These worked examples show how to choose and check a method.</p>
    <div className="public-guide-links">
      <Link href="/guides/desmos-sat"><strong>How to use Desmos on the SAT</strong><span>Choose a method and check your answer</span><ArrowRight size={16} /></Link>
      <Link href="/guides/regression"><strong>Regression</strong><span>Fit unknown values from given data</span><ArrowRight size={16} /></Link>
      <Link href="/guides/systems-of-equations"><strong>Systems of equations</strong><span>Find the point that satisfies both equations</span><ArrowRight size={16} /></Link>
      <Link href="/guides/quadratics"><strong>Quadratic equations</strong><span>Read roots from a graph and check them</span><ArrowRight size={16} /></Link>
    </div>
    <p className="public-guides-note">SolvePlot is a study tool. Use the calculator provided in Bluebook during the SAT; SolvePlot’s AI assistance is for preparation.</p>
  </section>;
}
