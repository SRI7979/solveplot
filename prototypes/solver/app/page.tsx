'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import Image from 'next/image';
import katex from 'katex';
import { ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, Copy, Expand, FileImage, List, RotateCcw, ScanLine } from 'lucide-react';
import MockCalculator from './mock-calculator';
import { METHODS, type Method, type Step } from './preview-data';
import { useWorkspace } from './workspace';
import { useSolverSplit } from './use-solver-split';

function Tex({ value }: { value: string }) {
  return <span className="math" dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { trust: false, throwOnError: false }) }} />;
}

export default function SolverPreview() {
  const { sampleRevision } = useWorkspace();
  return <SolverSolution key={sampleRevision} />;
}

function SolverSolution() {
  const { method, selectMethod, savedMethods, toggleSavedMethod, openUpload, sampleRevision, toast } = useWorkspace();
  const { containerRef, split, isDragging, separatorProps } = useSolverSplit();
  const [activeStep, setActiveStep] = useState(2);
  const [originalOpen, setOriginalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'steps' | 'calculator'>('steps');
  const [expressionsOpen, setExpressionsOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const graphRef = useRef<HTMLElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = METHODS[method];
  const saved = savedMethods.includes(method);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  useEffect(() => {
    function closeMenu(event: PointerEvent) { if (menuRef.current && !menuRef.current.contains(event.target as Node)) menuRef.current.open = false; }
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, []);

  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
    setMobileTab(next === 0 ? 'steps' : 'calculator');
    event.currentTarget.parentElement?.querySelectorAll('button')[next]?.focus();
  }
  function chooseMethod(next: Method) { selectMethod(next); setActiveStep(0); setCopied(null); if (menuRef.current) menuRef.current.open = false; }
  async function copyExpression(step: Step, index: number) {
    try { await navigator.clipboard.writeText(step.copy ?? ''); setCopied(index); toast('Expression copied'); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(null), 1800); }
    catch { toast('Clipboard unavailable. Select and copy the expression directly.'); }
  }
  function showPoint(index: number) { setActiveStep(index); setMobileTab('calculator'); }
  async function expandGraph() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await graphRef.current?.requestFullscreen(); }
    catch { toast('Full screen is not available in this browser'); }
  }

  return <div className="solverMock">
    <div className="mobileTabs" role="tablist" aria-label="Solution view"><button id="steps-tab" type="button" role="tab" aria-selected={mobileTab === 'steps'} tabIndex={mobileTab === 'steps' ? 0 : -1} onKeyDown={event => tabKey(event, 0)} aria-controls="steps-panel" onClick={() => setMobileTab('steps')}><List size={18} /> Steps</button><button id="calculator-tab" type="button" role="tab" aria-selected={mobileTab === 'calculator'} tabIndex={mobileTab === 'calculator' ? 0 : -1} onKeyDown={event => tabKey(event, 1)} aria-controls="calculator-panel" onClick={() => setMobileTab('calculator')}><ScanLine size={18} /> Calculator</button></div>
    <main className="workspaceBody" ref={containerRef} data-mobile-tab={mobileTab} data-dragging={isDragging} style={{ '--solution-width': `${split}%` } as CSSProperties}>
      <section className="learningPane" id="steps-panel" aria-label="Guided solution">
        <div className="problemSummary"><div className="sectionLabel"><span>Your problem</span><button type="button" className="textButton" onClick={openUpload}>Replace <ArrowUpRight size={13} /></button></div><div className="givenEquations"><Tex value={'y=x^2-4x+1'} /><Tex value={'y=2x+8'} /></div><p>What is the positive <i>x</i>-coordinate where the graphs intersect?</p><button type="button" className="originalToggle" aria-expanded={originalOpen} aria-controls="original-image" onClick={() => setOriginalOpen(open => !open)}><FileImage size={15} />{originalOpen ? 'Hide original question' : 'View original question'}<ChevronDown size={15} className={originalOpen ? 'rotated' : ''} /></button>{originalOpen && <div className="originalImage" id="original-image"><Image src="/sample-question.png" alt="Original SAT-style question with y = x² − 4x + 1 and y = 2x + 8, asking for the positive intersection x-coordinate. Choices A 5, B 6, C 7, D 8." width={1000} height={620} /><a href="/sample-question.png" target="_blank" rel="noreferrer">Open full-size image <ArrowUpRight size={12} /></a></div>}</div>
        <div className="answerStrip"><span className="answerCheck"><Check size={17} strokeWidth={2.5} /></span><span>Answer <strong>7</strong></span><span className="answerChoice">Choice C</span></div>
        <div className="methodHeading"><span className={method === 'difference' ? 'recommended' : 'alternative'}>{method === 'difference' ? 'Recommended method' : 'Alternative method'}</span><details className="methodMenu" ref={menuRef} onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false; }}><summary>Other methods <ChevronDown size={14} /></summary><div className="methodOptions"><p>Choose a Desmos method</p>{(Object.keys(METHODS) as Method[]).map(key => <button key={key} type="button" onClick={() => chooseMethod(key)} aria-pressed={method === key}><span><strong>{METHODS[key].name}</strong><small>{key === 'difference' ? 'One expression · Recommended' : 'Two expressions · Direct intersection'}</small></span>{method === key && <Check size={17} />}</button>)}</div></details></div>
        <h1>{selected.name}</h1><p className="strategySummary">{selected.summary}</p>
        <ol className="stepsList">{selected.steps.map((step, index) => <li className="solutionStep" data-active={activeStep === index} key={`${method}-${index}`}>
          <button type="button" className="stepSelect" aria-pressed={activeStep === index} aria-label={`Select step ${index + 1}: ${step.title}`} onClick={() => setActiveStep(index)}><span className="stepNumber">{index + 1}</span><span className="stepTitle"><span className="actionKind">{step.kind}</span><strong>{step.title}</strong></span></button>
          <div className="stepBody"><p>{step.instruction}</p>{step.latex && <div className="expressionBox"><div>{step.latex.map(latex => <Tex key={latex} value={latex} />)}</div><button type="button" className="copyButton" aria-label={copied === index ? 'Expression copied' : 'Copy expression'} onClick={() => void copyExpression(step, index)}>{copied === index ? <Check size={15} /> : <Copy size={15} />}<span>{copied === index ? 'Copied' : 'Copy'}</span></button></div>}{index === 1 && <button type="button" className="pointButton" onClick={() => showPoint(index)}>Show on graph <ArrowUpRight size={15} /></button>}{index === 2 && <div className="coordinateReadout"><Tex value={method === 'difference' ? '(\\underbrace{7}_{x},\\,0)' : '(\\underbrace{7}_{x},\\,22)'} /><ArrowRight size={15} /><span><i>x</i> = <strong>7</strong></span></div>}<details className="whyDetail"><summary>Why this works <ChevronDown size={14} /></summary><p>{step.detail}</p></details></div>
        </li>)}</ol>
        <div className="solutionFooter"><button type="button" className={`secondaryButton saveButton${saved ? ' isSaved' : ''}`} aria-pressed={saved} onClick={() => { toggleSavedMethod(method); }}>{saved ? <Check size={16} /> : <Bookmark size={16} />}{saved ? 'Trick saved' : 'Save this trick'}</button><span>Return to this method later</span></div>
      </section>
      <div className="paneDivider" {...separatorProps}><span aria-hidden="true" /></div>
      <section className="calculatorPane" id="calculator-panel" aria-label="Desmos calculator" ref={graphRef}>
        <header className="calculatorHeader"><h2>Calculator</h2><div><button type="button" className={`expressionToggle${expressionsOpen ? ' toggled' : ''}`} aria-pressed={expressionsOpen} onClick={() => setExpressionsOpen(open => !open)} title="Show or hide Desmos expressions"><List size={17} /><span>Expressions</span></button><button type="button" className="iconButton" aria-label="Reset graph view" title="Reset view" onClick={() => setResetSignal(n => n + 1)}><RotateCcw size={17} /></button><button type="button" className="iconButton" aria-label="Expand calculator" title="Full screen" onClick={() => void expandGraph()}><Expand size={17} /></button></div></header>
        <div className="graphContext"><span className="contextStep">{activeStep + 1}</span><span>{selected.steps[activeStep].title}</span></div>
        <div className="calculatorCanvas"><MockCalculator key={sampleRevision} method={method} activeStep={activeStep} resetSignal={resetSignal} expressionsOpen={expressionsOpen} /></div>
        <footer className="graphFooter"><span className="curveKey"><i />{method === 'difference' ? 'Difference of the two expressions' : 'Quadratic'}{method === 'intersections' && <><i className="lineKey" />Line</>}</span></footer>
      </section>
    </main>
  </div>;
}
