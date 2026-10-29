"use client";

import { useId, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import MathExpression from "@/components/math-expression";
import styles from "./lesson-visuals.module.css";

/** A concrete input/output model before the student has to learn calculator syntax. */
export function FunctionExplorer() {
  const [input, setInput] = useState(4);
  const id = useId();
  const output = input * 3 + 2;
  const x = 42 + input * 43;
  const y = 235 - output * 10;
  return <div className={styles.explorer}>
    <div className={styles.ruleHeading}><MathExpression latex="f(x)=3x+2" /><span>One rule. Different inputs.</span></div>
    <div className={styles.visual}>
      <div className={styles.machine} aria-label={`${input} times 3, plus 2, equals ${output}`}>
        <div className={styles.value}><span>Input</span><strong key={`in-${input}`}>{input}</strong></div>
        <ArrowRight size={18} className={styles.arrow} />
        <div className={styles.operations}><span>× 3</span><span>+ 2</span></div>
        <ArrowRight size={18} className={styles.arrow} />
        <div className={styles.value} data-output><span>Output</span><strong key={`out-${output}`}>{output}</strong></div>
      </div>
      <svg className={styles.plot} viewBox="0 0 340 270" role="img" aria-label={`The function f of x equals 3x plus 2. The point (${input}, ${output}) is selected.`}>
        <g className={styles.grid}>{[0,1,2,3,4,5,6].map(n => <line key={`x-${n}`} x1={42+n*43} x2={42+n*43} y1="25" y2="235" />)}{[0,5,10,15,20].map(n => <line key={`y-${n}`} x1="42" x2="315" y1={235-n*10} y2={235-n*10} />)}</g>
        <path className={styles.axes} d="M42 18V235H320" />
        <g className={styles.labels}>{[0,2,4,6].map(n => <text key={n} x={42+n*43} y="254" textAnchor="middle">{n}</text>)}{[5,10,15,20].map(n => <text key={n} x="30" y={240-n*10} textAnchor="end">{n}</text>)}<text x="326" y="239">x</text><text x="37" y="12">y</text></g>
        <path className={styles.line} d="M42 215L300 35" />
        <path className={styles.guides} d={`M42 ${y}H${x}V235`} />
        <circle className={styles.halo} cx={x} cy={y} r="13" /><circle className={styles.point} cx={x} cy={y} r="6" />
        <g className={styles.pointLabel} style={{ transform:`translate(${Math.min(x+12,230)}px,${Math.max(y-40,7)}px)` } as CSSProperties}><rect width="82" height="29" rx="8" /><text x="41" y="19" textAnchor="middle">({input}, {output})</text></g>
      </svg>
    </div>
    <div className={styles.controls}><label htmlFor={id}>Change the input<span aria-live="polite"><MathExpression latex={`f(${input})=${output}`} /></span></label><div className={styles.range}><span>0</span><input id={id} type="range" min="0" max="6" step="1" value={input} onChange={event => setInput(Number(event.target.value))} aria-valuetext={`Input ${input}; output ${output}`} style={{ "--range-progress":`${input/6*100}%` } as CSSProperties} /><span>6</span></div></div>
  </div>;
}
