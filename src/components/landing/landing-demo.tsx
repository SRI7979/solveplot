'use client'
/* eslint-disable @next/next/no-img-element -- the calculator capture and logo mark are cropped with CSS positioning that next/image would change. */

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { ArrowUpRight, Bookmark, Check, Copy, CornerDownRight, Expand, History, Monitor, Moon, Plus, RotateCcw, ScanLine, SlidersHorizontal, Sun } from 'lucide-react'
import { DEFAULT_APPEARANCE, PALETTES } from '@/lib/appearance'
import { BRAND } from '@/lib/brand'
import { MATH_OPTIONS, type DesmosCalculatorInstance } from '@/lib/desmos-engine'
import { calculatorPayload } from '@/lib/desmos-preflight'
import './landing-product.css'

function Tex({ value, display = false }: { value: string; display?: boolean }) {
  const html = katex.renderToString(value, { displayMode: display, throwOnError: false, trust: false })
  return display
    ? <div className="showcase-equation" dangerouslySetInnerHTML={{ __html: html }} />
    : <span dangerouslySetInnerHTML={{ __html: html }} />
}

/** The two routes Desmo lists for this question, with the labels the solver shows (shape, rows, hand steps, math needed). */
const ROUTES = {
  desmos: { name: 'Bracket regression', approach: 'Desmos way', recommended: true, shape: '4 rows · fits both parameters from the clicked roots', rows: 4, hand: 0, level: 'Low' },
  math: { name: 'Quadratic formula', approach: 'Math way', recommended: false, shape: 'no calculator · quadratic formula · 3 algebra steps', rows: 0, hand: 3, level: 'High' },
} as const
type Route = keyof typeof ROUTES

const DESMOS_LINES = [
  { latex: '3x^{2}-16x+2', purpose: 'Graph the given quadratic and click both x-intercepts: approximately 5.20526 and 0.128073.' },
  { latex: '[(a+\\sqrt{b})/6,(a-\\sqrt{b})/6]\\sim[5.20526,0.128073]', purpose: 'Match the plus form to the larger root and the minus form to the smaller root. Desmos fits both a and b, approximately 16 and 232.' },
  { latex: 'a+b', purpose: 'Show their sum. The small decimal tail comes from copying approximate graph coordinates.' },
  { latex: '\\operatorname{round}(a)+\\operatorname{round}(b)', purpose: 'The question requires integers. Round each fitted parameter, then add them to get exactly 248.' },
]

const MATH_STEPS = [
  { text: 'Apply the quadratic formula.', latex: 'x=\\frac{16\\pm\\sqrt{16^{2}-4(3)(2)}}{6}' },
  { text: 'Simplify under the root: 256 − 24 = 232.', latex: 'x=\\frac{16\\pm\\sqrt{232}}{6}' },
  { text: 'Match the plus root to the given form: a is 16 and b is 232, so a + b is 248.', latex: null },
]

const IDEAS: Record<Route, string> = {
  desmos: 'Graph the quadratic and click both roots. One bracket regression matches the plus and minus radical forms to those roots and fits both a and b. Neither parameter needs a slider or a value worked out by hand.',
  math: 'The quadratic formula writes both roots in the same form as the question, so you can match the numbers directly.',
}

/** Built exactly as the solver builds what it inserts: normalized rows, ids, and colors. */
const DESMOS_PAYLOAD = calculatorPayload(DESMOS_LINES.map(({ latex }) => ({ latex })), null)
const GRAPH_BOUNDS = { left: -3, right: 8, bottom: -24, top: 12 }

/**
 * The live Desmos calculator with the Desmos way's four lines, as the solver
 * shows it; blank for the math way, as the solver clears it for a paper
 * method. The Desmos script loads only once the showcase is near the screen,
 * with the solver's own capture shown until then (and if no API key is set).
 */
function LandingCalculator({ route }: { route: Route }) {
  const host = useRef<HTMLDivElement>(null)
  const calculator = useRef<DesmosCalculatorInstance | null>(null)
  const [near, setNear] = useState(false)
  const [ready, setReady] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_DESMOS_API_KEY?.trim()

  useEffect(() => {
    const element = host.current
    if (!element || !apiKey) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      setNear(true)
      observer.disconnect()
    }, { rootMargin: '600px' })
    observer.observe(element)
    return () => observer.disconnect()
  }, [apiKey])

  useEffect(() => {
    if (!ready || !host.current || !window.Desmos) return
    const instance = window.Desmos.GraphingCalculator(host.current, { ...MATH_OPTIONS, expressions: true, expressionsCollapsed: false, settingsMenu: true, keypad: true, fontSize: 15, border: false })
    calculator.current = instance
    return () => { instance.destroy(); calculator.current = null }
  }, [ready])

  useEffect(() => {
    const instance = calculator.current
    if (!instance) return
    if (route === 'math') { instance.setBlank(); return }
    instance.setExpressions(DESMOS_PAYLOAD.items)
    instance.setMathBounds(GRAPH_BOUNDS)
  }, [route, ready])

  return <div className="calculator-live" data-ready={ready || undefined}>
    <div ref={host} className="calculator-host" aria-label="Interactive Desmos graphing calculator"/>
    {!ready && route === 'desmos' && <div className="calculator-placeholder calculator-loading">Loading the calculator</div>}
    {route === 'math' && <p className="calculator-empty-note">The math way is worked on paper, so the calculator stays empty.</p>}
    {near && apiKey && <Script src={`https://www.desmos.com/api/v1.11/calculator.js?apiKey=${encodeURIComponent(apiKey)}`} onReady={() => setReady(true)}/>}
  </div>
}

const count = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const tidal = PALETTES[DEFAULT_APPEARANCE.palette]

/** The default workspace palette (Tidal), as the solver applies it. */
function workspaceColors(): CSSProperties {
  const [background, card, foreground, muted, soft, brand, , border] = tidal.light
  return { '--app-bg': background, '--app-card': card, '--app-fg': foreground, '--app-muted': muted, '--app-soft': soft, '--app-brand': brand, '--app-border': border } as CSSProperties
}

export function LandingDemo() {
  const [route, setRoute] = useState<Route>('desmos')
  const [panel, setPanel] = useState<'explanation' | 'calculator'>('explanation')
  const selected = ROUTES[route]
  return <section className="product-showcase" id="preview" aria-labelledby="showcase-title">
    <div className="showcase-intro">
      <h2 id="showcase-title">How {BRAND.name} solves a problem</h2>
      <p>Our goal is to minimize the work you do by hand and let Desmos handle as much of the problem as possible. Here’s an example you can try.</p>
    </div>
    <div className="showcase-stage"><div className="showcase-app" style={workspaceColors()}>
      <header className="showcase-toolbar">
        <span className="showcase-brand"><span className="provided-mark" aria-hidden="true"><img src="/images/desmo-logo-source.png" alt=""/></span>{BRAND.wordmark}</span>
        <span className="showcase-breadcrumb">Workspace <span>/</span> <b>Solver</b></span>
        <span className="showcase-theme" aria-hidden="true"><span data-on><Sun size={12}/></span><span><Moon size={12}/></span><span><Monitor size={12}/></span></span>
        <Link href="/solve" aria-label={`Open the ${BRAND.name} solver`}><ArrowUpRight size={17}/></Link>
      </header>
      <div className="showcase-panels" role="tablist" aria-label="Workspace panels">{(['explanation', 'calculator'] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={panel === item} onClick={() => setPanel(item)}>{item === 'explanation' ? 'Explanation' : 'Calculator'}</button>)}</div>
      <div className="showcase-layout" data-panel={panel}>
        <aside className="showcase-rail" aria-label="Preview navigation">
          <Link href="/solve" aria-label="New problem"><Plus size={16}/></Link>
          <span className="rail-line"/>
          <span data-on aria-hidden="true"><ScanLine size={16}/></span>
          <span aria-hidden="true"><History size={16}/></span>
          <span aria-hidden="true"><Bookmark size={16}/></span>
          <span className="rail-avatar" aria-hidden="true">S</span>
        </aside>

        <div className="showcase-reasoning">
          <div className="showcase-problem">
            <span className="document-label">PROBLEM <span>question.png</span></span>
            <div className="question-shot" role="img" aria-label="The uploaded question: 3x squared minus 16x plus 2 equals 0. One solution can be written as a plus root b, over 6, where a and b are integers. What is a plus b? Choices: 66, 132, 248, 296.">
              <Tex value={'3x^{2}-16x+2=0'} display/>
              <p>One solution to the given equation can be written as <Tex value={'\\dfrac{a+\\sqrt{b}}{6}'}/>, where <i>a</i> and <i>b</i> are integers. What is the value of <i>a</i> + <i>b</i>?</p>
              <ol className="question-choices">{[['A', '66'], ['B', '132'], ['C', '248'], ['D', '296']].map(([label, value]) => <li key={label}><span>{label}</span>{value}</li>)}</ol>
            </div>
          </div>

          <div className="showcase-routes">
            <div className="route-heading"><h3>Choose your route</h3><span>{count(selected.rows, 'row')} · {count(selected.hand, 'hand step')}</span></div>
            <div className="route-list" role="tablist" aria-label="Solving method">
              {(Object.keys(ROUTES) as Route[]).map((key) => {
                const item = ROUTES[key]
                return <button key={key} type="button" role="tab" aria-selected={route === key} onClick={() => setRoute(key)} data-approach={key}>
                  <span className="route-name">{item.name}</span>
                  <span className="route-labels">{item.recommended && <span className="route-recommended">Recommended</span>}<span className="route-approach">{item.approach}</span></span>
                </button>
              })}
            </div>
            <div className="route-details">
              <p>{selected.shape}</p>
              <dl><div><dt>Desmos rows</dt><dd>{selected.rows}</dd></div><div><dt>Hand steps</dt><dd>{selected.hand}</dd></div><div><dt>Math needed</dt><dd>{selected.level}</dd></div></dl>
            </div>
          </div>

          <div className="showcase-answer" aria-live="polite"><span>ANSWER <span className="answer-choice">Choice C</span></span><strong>248</strong></div>

          <div className="showcase-idea">
            <div className="idea-heading"><h4>The idea</h4><span className="save-trick"><Bookmark size={12}/>Save this trick</span></div>
            <p>{IDEAS[route]}</p>
          </div>

          {route === 'desmos' ? <div className="showcase-lines">
            <div className="lines-heading"><h4>In Desmos</h4><span>4 lines</span></div>
            <ol>{DESMOS_LINES.map((line, index) => <li key={line.latex}>
              <div className="line-heading"><span><b>{String(index + 1).padStart(2, '0')}</b>Line {index + 1}</span><span className="line-copy"><Copy size={11}/>Copy</span></div>
              <div className="line-equation"><Tex value={line.latex}/></div>
              <p>{line.purpose}</p>
            </li>)}</ol>
            <div className="read-result"><CornerDownRight size={14}/><div><h5>Read the result</h5><p>The fit gives <i>a</i> ≈ 16 and <i>b</i> ≈ 232. Line 4 rounds the integer parameters and adds them to give exactly 248: choice C.</p></div></div>
          </div> : <div className="showcase-lines">
            <div className="lines-heading"><h4>Walkthrough</h4><span>3 steps</span></div>
            <ol className="walkthrough">{MATH_STEPS.map((step, index) => <li key={step.text}><b>{index + 1}</b><div><p>{step.text}</p>{step.latex && <Tex value={step.latex} display/>}</div></li>)}</ol>
          </div>}
        </div>

        <div className="showcase-calculator">
          <div className="calculator-bar"><span>Calculator</span><span className="calculator-icons" aria-hidden="true"><RotateCcw size={13}/><Expand size={13}/></span></div>
          <div className="trace-bar"><span aria-hidden="true">↳</span>Select a calculator line to trace its reasoning</div>
          <LandingCalculator route={route}/>
          <div className="calculator-foot">{route === 'desmos' ? '4 lines added' : 'Ready'}</div>
        </div>
      </div>
    </div></div>
    <div className="showcase-under"><span>Compare the two methods above</span><Link href="/solve">Solve your own question <ArrowUpRight size={15}/></Link></div>
  </section>
}

export function ProductPersonalization() {
  const [palette, setPalette] = useState(DEFAULT_APPEARANCE.palette)
  const current = PALETTES[palette]
  const [background, , , , soft, brand] = current.light
  return <section className="personalization-story" id="experience">
    <div className="personalization-copy">
      <h2>Set up your workspace</h2>
      <p>Choose a palette, typeface, and light or dark mode in Settings. Your choices apply to the solver, History, and Saved tricks.</p>
      <div className="palette-switches" aria-label="Preview workspace palette">{PALETTES.map((item, index) => <button key={item.name} type="button" aria-pressed={index === palette} onClick={() => setPalette(index)}><span style={{ background: item.light[5] }}/>{item.name}</button>)}</div>
      <Link href="/settings">Customize your workspace <ArrowUpRight size={15}/></Link>
    </div>
    <div className="personalization-scene" style={{ background, color: brand }}>
      <div className="appearance-mini">
        <header><SlidersHorizontal size={16}/><span>Customize appearance</span></header>
        <small>{current.name} · Modern · Raised · Round</small>
        <div className="appearance-swatches">{[brand, soft, background].map((color) => <span key={color} style={{ background: color }}/>)}</div>
        <div className="appearance-type">Your workspace<br/>in {current.name}</div>
        <div className="appearance-bottom"><span>{current.note}</span><span style={{ background: brand, color: background }}><Check size={13}/>{current.name}</span></div>
      </div>
      <span className="scene-caption">Available in light and dark mode</span>
    </div>
  </section>
}
