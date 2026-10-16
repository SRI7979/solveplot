'use client'

import { useState } from 'react'
import Link from 'next/link'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ArrowRight, ArrowUpRight, Check, FileImage } from 'lucide-react'
import { BRAND } from '@/lib/brand'
import styles from './landing-demo.module.css'

function Tex({ value }: { value: string }) {
  return <span className={styles.math} dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { throwOnError: false, trust: false }) }} />
}

const STEPS = [
  { title: 'Graph the equation', text: 'Click the two x-intercepts. The graph gives you both roots without using the quadratic formula.' },
  { title: 'Fit both roots', text: 'Match the two root forms to those intercepts. One bracket regression finds both a and b.' },
  { title: 'Read the answer', text: 'The fitted values are approximately 16 and 232. They are integers, so round the small decimal error from the clicked roots.' },
]

/** An exact plot of the example quadratic, drawn from its function rather than
 * an illustrative curve. This is a lightweight worked example, not a live solve. */
function RootGraph() {
  const point = (x: number, y: number) => [32 + (x + .8) / 7.2 * 456, 20 + (14 - y) / 38 * 196]
  const path = Array.from({ length: 181 }, (_, i) => {
    const x = -.8 + i / 180 * 7.2
    const [px, py] = point(x, 3 * x * x - 16 * x + 2)
    return `${i === 0 ? 'M' : 'L'}${px.toFixed(3)},${py.toFixed(3)}`
  }).join(' ')
  const y0 = point(0, 0)[1]
  const x0 = point(0, 0)[0]
  const roots = [(16 - Math.sqrt(232)) / 6, (16 + Math.sqrt(232)) / 6]
  return <svg className={styles.graph} viewBox="0 0 520 244" role="img" aria-label="Graph of 3x squared minus 16x plus 2, with x-intercepts at approximately 0.128073 and 5.20526">
    <defs><clipPath id="landing-root-plot"><rect x="25" y="10" width="480" height="220" /></clipPath></defs>
    {Array.from({ length: 8 }, (_, i) => <line key={`x${i}`} x1={point(i, 0)[0]} y1="10" x2={point(i, 0)[0]} y2="230" stroke="#e9eff0" />)}
    {[-20, -15, -10, -5, 0, 5, 10].map(y => <line key={y} x1="25" y1={point(0, y)[1]} x2="505" y2={point(0, y)[1]} stroke="#e9eff0" />)}
    <line x1="25" y1={y0} x2="505" y2={y0} stroke="#9aadb3" />
    <line x1={x0} y1="10" x2={x0} y2="230" stroke="#9aadb3" />
    <path d={path} fill="none" stroke="#216978" strokeWidth="2.7" clipPath="url(#landing-root-plot)" />
    {roots.map((x, i) => {
      const px = point(x, 0)[0]
      return <g key={x}><circle cx={px} cy={y0} r="5" fill="#216978" stroke="white" strokeWidth="2" /><rect x={px - (i ? 40 : 27)} y={y0 - 35} width={i ? 80 : 89} height="24" rx="5" fill="white" stroke="#d2e1e4" /><text x={px + (i ? 0 : 17)} y={y0 - 19} textAnchor="middle" fill="#315e69" fontSize="12" fontFamily="sans-serif">{i ? '5.20526' : '0.128073'}</text></g>
    })}
    <text x={x0 - 10} y="214" textAnchor="end" fill="#7c939c" fontSize="11">−20</text>
    <text x={point(5, 0)[0]} y={y0 + 18} textAnchor="middle" fill="#7c939c" fontSize="11">5</text>
    <text x="495" y={y0 + 18} fill="#7c939c" fontSize="11">x</text>
  </svg>
}

export function LandingDemo() {
  const [step, setStep] = useState(2)
  return <>
    <section className={styles.story} id="preview" aria-labelledby="problem-story-title">
      <div className={styles.storyGrid}>
        <div className={styles.input}>
          <h2 id="problem-story-title">Stuck with a<br className={styles.desktopBreak} /> hard problem?</h2>
          <p>Start with the question in front of you</p>
          <div className={styles.paper}>
            <div className={styles.file}><FileImage size={15} /> question.png</div>
            <div className={styles.question}>
              <div className={styles.problemEquation}><Tex value={'3x^2-16x+2=0'} /></div>
              <p>One solution to the given equation can be written as <Tex value={'\\frac{a+\\sqrt{b}}{6}'} />, where <i>a</i> and <i>b</i> are integers. What is the value of <Tex value={'a+b'} />?</p>
              <ol className={styles.choices}>{[['A', '66'], ['B', '132'], ['C', '248'], ['D', '296']].map(([label, answer]) => <li key={label}><span>{label}</span>{answer}</li>)}</ol>
            </div>
          </div>
        </div>
        <div className={styles.connection} aria-hidden="true"><ArrowRight size={27} strokeWidth={1.5} /></div>
        <div className={styles.output}>
          <h3>Here’s how {BRAND.name} helps</h3>
          <p>A method that lets Desmos do the work</p>
          <div className={styles.solution}>
            <header><span className={styles.wordmark}><svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><rect width="24" height="24" rx="8" fill="#216978" /><path d="M5 15c4 0 3-7 7-7s3 7 7 7M5 12h14" fill="none" stroke="white" strokeWidth="1.7" strokeLinecap="round" /></svg>{BRAND.wordmark}</span><span>Worked example</span></header>
            <div className={styles.method}><span>Recommended method</span><strong>Bracket regression</strong></div>
            <RootGraph />
            <div className={styles.exampleTabs} role="tablist" aria-label="Explore this solution">{STEPS.map((item, index) => <button key={item.title} type="button" id={`root-step-${index}`} role="tab" aria-selected={step === index} tabIndex={step === index ? 0 : -1} aria-controls="root-example-panel" onKeyDown={event => { if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return; event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowLeft' ? 2 : 1)) % 3; setStep(next); event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus() }} onClick={() => setStep(index)}><span>{index + 1}</span>{['Graph', 'Fit', 'Answer'][index]}</button>)}</div>
            <div className={styles.detail} role="tabpanel" id="root-example-panel" aria-labelledby={`root-step-${step}`}>
              <h4>{STEPS[step].title}</h4>
              <div className={styles.expression}>{step === 0 ? <Tex value={'3x^2-16x+2'} /> : <><Tex value={'[(a+\\sqrt{b})/6,(a-\\sqrt{b})/6]'} /><Tex value={'\\sim[5.20526,0.128073]'} /></>}</div>
              {step > 0 && <div className={styles.parameters}><Tex value={'a\\approx16'} /><Tex value={'b\\approx232'} /></div>}
              <p>{STEPS[step].text}</p>
              {step === 2 && <div className={styles.answer}><span><Check size={16} /> Answer <small>Choice C</small></span><strong>248</strong><span><Tex value={'\\operatorname{round}(a)+\\operatorname{round}(b)'} /></span></div>}
            </div>
          </div>
        </div>
      </div>
      <div className={styles.exampleFooter}><span>Example: quadratic roots</span><Link href="/solve">Try your own question <ArrowUpRight size={16} /></Link></div>
    </section>
    <section className={styles.overview} aria-labelledby="overview-title">
      <h2 id="overview-title">An SAT Math solver<br /> built around Desmos</h2>
      <div><p>Upload a screenshot of a problem. {BRAND.name} finds a Desmos method, fills the calculator, and explains each entry so you can follow it yourself.</p><p>Graphs, regressions, lists, and other calculator tricks come first. You can compare methods when there’s another way to solve it.</p><Link href="/solve">Open the solver <ArrowUpRight size={16} /></Link></div>
      <ol className={styles.workflow}><li><span>Start with a screenshot</span><span>Upload, paste, or drag it in</span></li><li><ArrowRight size={18} aria-hidden="true" /><span>Get a Desmos method</span><span>With the calculator filled in</span></li><li><ArrowRight size={18} aria-hidden="true" /><span>Understand the steps</span><span>Read the explanation beside it</span></li></ol>
    </section>
  </>
}
