'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Bookmark, X } from 'lucide-react'
import styles from './landing-features.module.css'

const EXAMPLE_TRICKS = [
  { title: 'Bracket regression', detail: 'Fit unknowns from both roots', equation: '[(a + √b) / 6, (a − √b) / 6] ~ [5.20526, 0.128073]' },
  { title: 'Intersections', detail: 'Find where two equations meet', equation: 'y = 2x + 1     y = −x + 7' },
  { title: 'List filtering', detail: 'Keep the integer values that work', equation: 'L = [1...20]     L[L² > 50]' },
]

const EXAMPLE_HISTORY = [
  { title: 'Quadratic roots', method: 'Bracket regression', equation: '3x² − 16x + 2 = 0' },
  { title: 'Two equations, one point', method: 'Intersections', equation: 'y = 2x + 1,  y = −x + 7' },
  { title: 'Integer values in a range', method: 'List filtering', equation: 'x² > 50,  1 ≤ x ≤ 20' },
]

function ComingSoon() {
  return <span className={styles.comingSoon}>Coming soon</span>
}

function RootGraph() {
  const graphX = (x: number) => 20 + ((x + 0.8) / 7.1) * 184
  const graphY = (y: number) => 12 + ((10 - y) / 32) * 116
  const path = Array.from({ length: 81 }, (_, index) => {
    const x = -0.45 + (6.2 * index) / 80
    return `${index === 0 ? 'M' : 'L'}${graphX(x).toFixed(2)} ${graphY(3 * x * x - 16 * x + 2).toFixed(2)}`
  }).join(' ')
  const roots = [(16 - Math.sqrt(232)) / 6, (16 + Math.sqrt(232)) / 6]

  return <svg className={styles.rootGraph} viewBox="0 0 220 150" fill="none" aria-hidden="true">
    <path className={styles.graphGrid} d="M20 20H204M20 50H204M20 80H204M20 110H204M50 12V135M80 12V135M110 12V135M140 12V135M170 12V135M200 12V135" />
    <path className={styles.graphAxis} d={`M20 ${graphY(0)}H207M${graphX(0)} 12V136`} />
    <path className={styles.graphCurve} d={path} />
    {roots.map((root, index) => <g key={root}><circle cx={graphX(root)} cy={graphY(0)} r="4" fill="currentColor" /><text x={graphX(root) - 7} y={graphY(0) - 10}>r{index === 0 ? '₁' : '₂'}</text></g>)}
  </svg>
}

function SavedWorkspacePreview() {
  const [tab, setTab] = useState<'saved' | 'history'>('saved')
  const [bookmarks, setBookmarks] = useState([true, true, false])
  const [announcement, setAnnouncement] = useState('')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  function changeTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : (index + 1) % 2
    setTab(next === 0 ? 'saved' : 'history')
    tabRefs.current[next]?.focus()
  }

  function toggleBookmark(index: number) {
    setBookmarks((current) => current.map((saved, position) => position === index ? !saved : saved))
    setAnnouncement(`${EXAMPLE_TRICKS[index].title} ${bookmarks[index] ? 'removed from' : 'saved in'} this example only.`)
  }

  return <div className={styles.libraryPreview} role="region" aria-label="Interactive feature preview">
    <div className={styles.libraryTopbar}><span>Workspace</span><span className={styles.exampleLabel}>Interactive example</span></div>
    <div className={styles.libraryTabs} role="tablist" aria-label="Example workspace views">
      {(['saved', 'history'] as const).map((item, index) => <button
        key={item}
        type="button"
        role="tab"
        id={`feature-${item}-tab`}
        aria-controls={`feature-${item}-panel`}
        aria-selected={tab === item}
        tabIndex={tab === item ? 0 : -1}
        ref={(element) => { tabRefs.current[index] = element }}
        onKeyDown={(event) => changeTab(event, index)}
        onClick={() => setTab(item)}
      >{item === 'saved' ? 'Saved tricks' : 'History'}</button>)}
    </div>
    <div id="feature-saved-panel" role="tabpanel" aria-labelledby="feature-saved-tab" hidden={tab !== 'saved'} className={styles.libraryPanel}>
      <div className={styles.listHeading}><span>Technique</span><span>Bookmark</span></div>
      <ul className={styles.libraryList}>
        {EXAMPLE_TRICKS.map((trick, index) => <li key={trick.title}>
          <div className={styles.trickInfo}><h3>{trick.title}</h3><p>{trick.detail}</p><span className={styles.equationSnippet}>{trick.equation}</span></div>
          <button type="button" className={styles.bookmarkButton} aria-pressed={bookmarks[index]} aria-label={`${bookmarks[index] ? 'Unsave' : 'Save'} ${trick.title} in this preview`} onClick={() => toggleBookmark(index)}><Bookmark size={18} fill={bookmarks[index] ? 'currentColor' : 'none'} strokeWidth={1.6} /></button>
        </li>)}
      </ul>
    </div>
    <div id="feature-history-panel" role="tabpanel" aria-labelledby="feature-history-tab" hidden={tab !== 'history'} className={styles.libraryPanel}>
      <div className={styles.listHeading}><span>Example question</span><span>Method</span></div>
      <ul className={styles.historyList}>
        {EXAMPLE_HISTORY.map((question) => <li key={question.title}>
          <div><h3>{question.title}</h3><span className={styles.equationSnippet}>{question.equation}</span></div>
          <span className={styles.methodLabel}>{question.method}</span>
        </li>)}
      </ul>
    </div>
    <p className={styles.previewFootnote}>Example content. Changes here stay in this preview.</p>
    <span className={styles.srOnly} role="status">{announcement}</span>
  </div>
}

function TutorPreview() {
  const [open, setOpen] = useState(true)

  return <div className={styles.tutorPreview} role="region" aria-label="AI Tutor feature preview, coming soon">
    <div className={styles.previewToolbar}><span>Feature preview <span className={styles.toolbarDivider}>/</span> AI Tutor</span></div>
    <div className={styles.tutorLayout}>
      <div className={styles.solutionPanel}>
        <div className={styles.solutionHeading}><span>Explanation</span><span>Bracket regression</span></div>
        <div className={styles.solutionStep}>
          <span className={styles.stepNumber}>01</span>
          <div><h3>Start with the graph</h3><p>Graph the quadratic and click its two x-intercepts.</p><div className={styles.solutionEquation}>3x² − 16x + 2</div></div>
        </div>
        <div className={styles.solutionStep}>
          <span className={styles.stepNumber}>02</span>
          <div><h3>Let Desmos fit the unknowns</h3><p className={styles.selectedSentence}><mark>Match both root forms to the two graph intercepts.</mark></p><div className={styles.selectionAction}><span>Selected from the explanation</span><button type="button" className={styles.askButton} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-controls="feature-tutor-conversation">Ask AI Tutor <ArrowRight size={15} /></button></div></div>
        </div>
        <div className={styles.regressionLine}><span>[(a + √b) / 6, (a − √b) / 6]</span><span className={styles.regressionMatch}>~ [5.20526, 0.128073]</span></div>
      </div>
      <div className={styles.conversationPanel} id="feature-tutor-conversation" aria-live="polite">
        <div className={styles.conversationHeading}><h3>Example conversation</h3>{open && <button type="button" onClick={() => setOpen(false)} aria-label="Reset example conversation"><X size={17} /></button>}</div>
        {open ? <div className={styles.conversationContent}>
          <div className={styles.quotedContext}><span>About this line</span><p>“Match both root forms to the two graph intercepts.”</p></div>
          <div className={styles.exampleQuestion}><span>You</span><p>Why do we need both roots?</p></div>
          <div className={styles.exampleAnswer}><span>AI Tutor</span><p>One root gives one condition for two unknowns. Matching both roots lets Desmos fit <i>a</i> and <i>b</i> together.</p></div>
        </div> : <div className={styles.conversationEmpty}>
          <p>Choose “Ask AI Tutor” to reopen the example conversation about the highlighted sentence.</p>
        </div>}
        <p className={styles.conversationNote}>Preview of a planned feature.</p>
      </div>
    </div>
  </div>
}

function SimilarProblemsPreview() {
  return <div className={styles.futurePreview} role="img" aria-label="Coming soon: similar problems feature preview. A quadratic root problem is paired with a new example that uses the same bracket regression method.">
    <div className={styles.futureToolbar}><span>Similar problems · Feature preview</span></div>
    <div className={styles.similarBody}>
      <div className={styles.sourceProblem}>
        <div><span className={styles.smallLabel}>Original question</span><h4>Find the unknowns<br />from the roots.</h4><span className={styles.futureEquation}>3x² − 16x + 2 = 0</span></div>
        <RootGraph />
      </div>
      <div className={styles.sameMethod}><span /><span>Same technique, a new question</span><span /></div>
      <div className={styles.similarQuestion}><div><span className={styles.smallLabel}>Example question</span><span className={styles.futureEquation}>2x² − 9x + 1 = 0</span><p>One root is (a + √b) / 4, where <i>a</i> and <i>b</i> are integers. What is <i>a</i> + <i>b</i>?</p></div><span className={styles.methodPill}>Bracket regression</span></div>
    </div>
  </div>
}

function TargetedPracticePreview() {
  const questions = [
    { title: 'Roots in radical form', equation: '3x² − 16x + 2 = 0' },
    { title: 'Two equations, two unknowns', equation: '[2a + b, a − b] ~ [11, 1]' },
    { title: 'A parameter in a quadratic', equation: 'y = ax² + bx + 2' },
  ]

  return <div className={styles.futurePreview} role="img" aria-label="Coming soon: targeted practice feature preview. An example set includes three bracket regression questions: radical roots, a system of equations, and a quadratic parameter.">
    <div className={styles.futureToolbar}><span>Targeted practice · Feature preview</span></div>
    <div className={styles.practiceBody}>
      <div className={styles.practiceHeading}><span className={styles.smallLabel}>Example practice set</span><h4>Bracket regression</h4><p>One technique. A few different ways to use it.</p></div>
      <ol className={styles.practiceQuestions}>{questions.map((question, index) => <li key={question.title}><span className={styles.practiceNumber}>{String(index + 1).padStart(2, '0')}</span><div><h5>{question.title}</h5><span className={styles.practiceEquation}>{question.equation}</span></div></li>)}</ol>
    </div>
  </div>
}

export function LandingFeatures() {
  return <div className={styles.features}>
    <section className={styles.workspaceSection} id="experience" aria-labelledby="feature-workspace-title">
      <div className={styles.workspaceCopy}><span className={styles.eyebrow}>Saved tricks &amp; history</span><h2 id="feature-workspace-title">Keep the methods you want to use again</h2><p>Save a useful technique, or return to a solved question in History. The next time a familiar pattern appears, you know where to look.</p><div className={styles.workspaceLinks}><Link href="/tricks">Saved tricks <ArrowUpRight size={16} /></Link><Link href="/history">Your history <ArrowUpRight size={16} /></Link></div></div>
      <SavedWorkspacePreview />
    </section>

    <section className={styles.tutorSection} aria-labelledby="feature-tutor-title">
      <div className={styles.sectionIntro}><div className={styles.headingMeta}><span className={styles.eyebrow}>AI Tutor</span><ComingSoon /></div><h2 id="feature-tutor-title">Ask about the part that lost you</h2><p>A preview of a more focused conversation: highlight a line, ask your question, and get an explanation tied to that exact step.</p></div>
      <TutorPreview />
    </section>

    <section className={styles.futureSection} aria-labelledby="feature-future-title">
      <div className={styles.sectionIntro}><h2 id="feature-future-title">More ways to practice</h2><p>We’re exploring ways to turn a useful solution into a method you can recognize and use again.</p></div>
      <div className={styles.futureGrid}>
        <article className={styles.futureFeature}><div className={styles.futureTitle}><h3>Similar problems</h3><ComingSoon /></div><p>Try a new question that calls for the same Desmos technique.</p><SimilarProblemsPreview /></article>
        <article className={styles.futureFeature}><div className={styles.futureTitle}><h3>Targeted practice</h3><ComingSoon /></div><p>Spend a little more time with the techniques you want to learn.</p><TargetedPracticePreview /></article>
      </div>
    </section>
  </div>
}
