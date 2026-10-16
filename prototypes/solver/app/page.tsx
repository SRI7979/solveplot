'use client';

import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import katex from 'katex';
import { ArrowRight, ArrowUpRight, Bookmark, Check, CheckCheck, ChevronDown, Copy, Expand, FileImage, History, ImagePlus, Info, List, Plus, RotateCcw, ScanLine, Upload, X } from 'lucide-react';
import MockCalculator from './mock-calculator';

type Method = 'difference' | 'intersections';
type Dialog = 'upload' | 'history' | 'saved' | 'help' | null;
type Step = { title: string; kind: string; instruction: string; latex?: string[]; copy?: string; detail: string };
const METHODS = {
  difference: { name: 'Read the x-intercepts', summary: 'Graph the difference, then click the positive x-intercept.', steps: [
    { title: 'Graph the difference', kind: 'Type', instruction: 'Enter this as one expression in Desmos.', latex: ['y=x^2-4x+1-(2x+8)'], copy: 'y=x^2-4x+1-(2x+8)', detail: 'At an intersection, both original equations have the same y-value. Their difference is zero, so the x-intercepts give the intersection x-coordinates.' },
    { title: 'Choose the positive intercept', kind: 'Click', instruction: 'Select the point where the curve crosses the x-axis on the right.', detail: 'There are two intercepts: (−1, 0) and (7, 0). The question asks for the positive x-coordinate, so use the point to the right of the y-axis.' },
    { title: 'Read the first coordinate', kind: 'Read', instruction: 'The point is (7, 0), so the x-coordinate is 7.', detail: 'The graph shows the difference of the two functions, so this point has y = 0. On the original graphs, the same x-value gives the intersection (7, 22).' },
  ] as Step[] },
  intersections: { name: 'Graph both equations', summary: 'Enter the two equations and select their intersection on the right.', steps: [
    { title: 'Graph both equations', kind: 'Type', instruction: 'Give each equation its own expression line.', latex: ['y=x^2-4x+1', 'y=2x+8'], copy: 'y=x^2-4x+1\ny=2x+8', detail: 'The teal curve is the quadratic. The blue line is the linear equation. Points where they meet satisfy both equations.' },
    { title: 'Select the right intersection', kind: 'Click', instruction: 'Click where the teal curve meets the blue line on the right.', detail: 'The graphs intersect at (−1, 6) and (7, 22). Use (7, 22), because its x-coordinate is positive.' },
    { title: 'Read the first coordinate', kind: 'Read', instruction: 'At (7, 22), the x-coordinate is 7. You don’t need the y-value.', detail: 'The question asks for x, which is the first coordinate. Both equations give y = 22 when x = 7.' },
  ] as Step[] },
};

function Tex({ value }: { value: string }) {
  return <span className="math" dangerouslySetInnerHTML={{ __html: katex.renderToString(value, { trust: false, throwOnError: false }) }} />;
}
function Mark() {
  return <svg viewBox="0 0 24 24" fill="none" width="25" height="25" aria-hidden="true"><path d="M3 17c5 0 4-10 9-10s4 10 9 10M3 12h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
}

export default function SolverPreview() {
  const [method, setMethod] = useState<Method>('difference');
  const [activeStep, setActiveStep] = useState(2);
  const [originalOpen, setOriginalOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'steps' | 'calculator'>('steps');
  const [expressionsOpen, setExpressionsOpen] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [savedMethods, setSavedMethods] = useState<Method[]>([]);
  const [sampleRevision, setSampleRevision] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<{ name: string; url: string } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const graphRef = useRef<HTMLElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = METHODS[method];
  const saved = savedMethods.includes(method);

  useEffect(() => {
    const element = dialogRef.current;
    if (dialog && !element?.open) element?.showModal();
    else if (!dialog && element?.open) element.close();
  }, [dialog]);
  useEffect(() => () => { if (upload) URL.revokeObjectURL(upload.url); }, [upload]);
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
  function chooseMethod(next: Method) { setMethod(next); setActiveStep(0); setCopied(null); if (menuRef.current) menuRef.current.open = false; }
  function useSample() { setMethod('difference'); setActiveStep(2); setOriginalOpen(false); setMobileTab('steps'); setExpressionsOpen(false); setSampleRevision(n => n + 1); setDialog(null); setNotice('Sample solution opened'); }
  function addFile(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setUploadError('Choose a PNG, JPG, or WebP image'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('Choose an image smaller than 10 MB'); return; }
    setUploadError(''); setUpload({ name: file.name, url: URL.createObjectURL(file) });
  }
  function fileChanged(event: ChangeEvent<HTMLInputElement>) { addFile(event.target.files?.[0]); event.target.value = ''; }
  async function copyExpression(step: Step, index: number) {
    try { await navigator.clipboard.writeText(step.copy ?? ''); setCopied(index); setNotice('Expression copied'); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(null), 1800); }
    catch { setNotice('Clipboard unavailable. You can select and copy the expression directly.'); }
  }
  function showPoint(index: number) { setActiveStep(index); setMobileTab('calculator'); }
  async function expandGraph() {
    try { if (document.fullscreenElement) await document.exitFullscreen(); else await graphRef.current?.requestFullscreen(); }
    catch { setNotice('Full screen is not available in this browser'); }
  }

  return <div className="solverMock">
    <aside className="rail" aria-label="Workspace navigation">
      <Link className="brandMark" href="/" aria-label="Desmo solver"><Mark /></Link>
      <button className="newButton" type="button" aria-label="New problem" title="New problem" onClick={() => setDialog('upload')}><Plus size={23} /></button>
      <nav><button className="railButton current" type="button" aria-label="Solver" title="Solver" onClick={() => { setDialog(null); setMobileTab('steps'); }}><ScanLine size={22} /></button><button className="railButton" type="button" aria-label="History" title="History" onClick={() => setDialog('history')}><History size={22} /></button><button className="railButton" type="button" aria-label="Saved tricks" title="Saved tricks" onClick={() => setDialog('saved')}><Bookmark size={21} /></button></nav>
      <button className="railButton helpButton" type="button" aria-label="Workspace help" title="Workspace help" onClick={() => setDialog('help')}><Info size={21} /></button>
    </aside>
    <header className="workspaceHeader">
      <div className="breadcrumb"><span className="mobileBrand"><span className="brandMark"><Mark /></span>desmo</span><span className="desktopCrumb">Workspace <span>/</span></span><strong>Solver</strong></div>
      <div className="headerActions"><span className="sampleLabel">SAT Math · Sample problem</span><button type="button" className="mobileIcon" aria-label="History" onClick={() => setDialog('history')}><History size={20} /></button><button type="button" className="mobileIcon" aria-label="Saved tricks" onClick={() => setDialog('saved')}><Bookmark size={20} /></button><button type="button" className="secondaryButton headerNew" onClick={() => setDialog('upload')}><Plus size={17} /><span>New problem</span></button></div>
    </header>
    <div className="mobileTabs" role="tablist" aria-label="Solution view"><button id="steps-tab" type="button" role="tab" aria-selected={mobileTab === 'steps'} tabIndex={mobileTab === 'steps' ? 0 : -1} onKeyDown={event => tabKey(event, 0)} aria-controls="steps-panel" onClick={() => setMobileTab('steps')}><List size={18} /> Steps</button><button id="calculator-tab" type="button" role="tab" aria-selected={mobileTab === 'calculator'} tabIndex={mobileTab === 'calculator' ? 0 : -1} onKeyDown={event => tabKey(event, 1)} aria-controls="calculator-panel" onClick={() => setMobileTab('calculator')}><ScanLine size={18} /> Calculator</button></div>
    <main className="workspaceBody" data-mobile-tab={mobileTab}>
      <section className="learningPane" id="steps-panel" aria-label="Guided solution">
        <div className="problemSummary"><div className="sectionLabel"><span>Your problem</span><button type="button" className="textButton" onClick={() => setDialog('upload')}>Replace <ArrowUpRight size={13} /></button></div><div className="givenEquations"><Tex value={'y=x^2-4x+1'} /><Tex value={'y=2x+8'} /></div><p>What is the positive <i>x</i>-coordinate where the graphs intersect?</p><button type="button" className="originalToggle" aria-expanded={originalOpen} aria-controls="original-image" onClick={() => setOriginalOpen(open => !open)}><FileImage size={15} />{originalOpen ? 'Hide original question' : 'View original question'}<ChevronDown size={15} className={originalOpen ? 'rotated' : ''} /></button>{originalOpen && <div className="originalImage" id="original-image"><Image src="/sample-question.png" alt="Original SAT-style question with y = x² − 4x + 1 and y = 2x + 8, asking for the positive intersection x-coordinate. Choices A 5, B 6, C 7, D 8." width={1000} height={620} /><a href="/sample-question.png" target="_blank" rel="noreferrer">Open full-size image <ArrowUpRight size={12} /></a></div>}</div>
        <div className="answerStrip"><span className="answerCheck"><Check size={17} strokeWidth={2.5} /></span><span>Answer <strong>7</strong></span><span className="answerChoice">Choice C</span></div>
        <div className="methodHeading"><span className={method === 'difference' ? 'recommended' : 'alternative'}>{method === 'difference' ? <><CheckCheck size={16} /> Recommended method</> : 'Alternative method'}</span><details className="methodMenu" ref={menuRef} onKeyDown={event => { if (event.key === 'Escape') event.currentTarget.open = false; }}><summary>Other methods <ChevronDown size={14} /></summary><div className="methodOptions"><p>Choose a Desmos method</p>{(Object.keys(METHODS) as Method[]).map(key => <button key={key} type="button" onClick={() => chooseMethod(key)} aria-pressed={method === key}><span><strong>{METHODS[key].name}</strong><small>{key === 'difference' ? 'One expression · Recommended' : 'Two expressions · Direct intersection'}</small></span>{method === key && <Check size={17} />}</button>)}</div></details></div>
        <h1>{selected.name}</h1><p className="strategySummary">{selected.summary}</p>
        <ol className="stepsList">{selected.steps.map((step, index) => <li className="solutionStep" data-active={activeStep === index} key={`${method}-${index}`}>
          <button type="button" className="stepSelect" aria-pressed={activeStep === index} aria-label={`Select step ${index + 1}: ${step.title}`} onClick={() => setActiveStep(index)}><span className="stepNumber">{index + 1}</span><span className="stepTitle"><span className="actionKind">{step.kind}</span><strong>{step.title}</strong></span>{activeStep === index && <span className="stepActiveIndicator" aria-label="Highlighted in calculator"><ArrowUpRight size={16} /></span>}</button>
          <div className="stepBody"><p>{step.instruction}</p>{step.latex && <div className="expressionBox"><div>{step.latex.map(latex => <Tex key={latex} value={latex} />)}</div><button type="button" className="copyButton" aria-label={copied === index ? 'Expression copied' : 'Copy expression'} onClick={() => void copyExpression(step, index)}>{copied === index ? <Check size={15} /> : <Copy size={15} />}<span>{copied === index ? 'Copied' : 'Copy'}</span></button></div>}{index === 1 && <button type="button" className="pointButton" onClick={() => showPoint(index)}>Show on graph <ArrowUpRight size={15} /></button>}{index === 2 && <div className="coordinateReadout"><Tex value={method === 'difference' ? '(\\underbrace{7}_{x},\\,0)' : '(\\underbrace{7}_{x},\\,22)'} /><ArrowRight size={15} /><span><i>x</i> = <strong>7</strong></span></div>}<details className="whyDetail"><summary>Why this works <ChevronDown size={14} /></summary><p>{step.detail}</p></details></div>
        </li>)}</ol>
        <div className="solutionFooter"><button type="button" className={`secondaryButton saveButton${saved ? ' isSaved' : ''}`} aria-pressed={saved} onClick={() => { setSavedMethods(current => current.includes(method) ? current.filter(item => item !== method) : [...current, method]); setNotice(saved ? 'Trick removed from saved' : 'Trick saved for this session'); }}>{saved ? <Check size={16} /> : <Bookmark size={16} />}{saved ? 'Trick saved' : 'Save this trick'}</button><span>Return to this method later</span></div>
      </section>
      <section className="calculatorPane" id="calculator-panel" aria-label="Desmos calculator" ref={graphRef}>
        <header className="calculatorHeader"><h2>Calculator</h2><div><button type="button" className={`expressionToggle${expressionsOpen ? ' toggled' : ''}`} aria-pressed={expressionsOpen} onClick={() => setExpressionsOpen(open => !open)} title="Show or hide Desmos expressions"><List size={17} /><span>Expressions</span></button><button type="button" className="iconButton" aria-label="Reset graph view" title="Reset view" onClick={() => setResetSignal(n => n + 1)}><RotateCcw size={17} /></button><button type="button" className="iconButton" aria-label="Expand calculator" title="Full screen" onClick={() => void expandGraph()}><Expand size={17} /></button></div></header>
        <div className="graphContext"><span className="contextStep">{activeStep + 1}</span><span>{selected.steps[activeStep].title}</span><span className="contextHint">Selected step</span></div>
        <div className="calculatorCanvas"><MockCalculator key={sampleRevision} method={method} activeStep={activeStep} resetSignal={resetSignal} expressionsOpen={expressionsOpen} /></div>
        <footer className="graphFooter"><span className="curveKey"><i />{method === 'difference' ? 'Difference of the two expressions' : 'Quadratic'}{method === 'intersections' && <><i className="lineKey" />Line</>}</span><span className="graphFooterHint">Click a step to follow it on the graph</span></footer>
      </section>
    </main>
    <span className="srOnly" role="status">{notice}</span>
    <dialog ref={dialogRef} className="workspaceDialog" onClose={() => setDialog(null)} onClick={event => { if (event.target === event.currentTarget) setDialog(null); }}>
      <header><h2>{dialog === 'upload' ? 'Add a problem' : dialog === 'history' ? 'History' : dialog === 'saved' ? 'Saved tricks' : 'Use this workspace'}</h2><button type="button" className="iconButton" aria-label="Close dialog" onClick={() => setDialog(null)}><X size={21} /></button></header>
      {dialog === 'upload' && <div className="uploadContent"><p>Bring in a screenshot, or explore the sample problem.</p><div className={`uploadZone${dragging ? ' dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); addFile(event.dataTransfer.files[0]); }}><Upload size={26} strokeWidth={1.7} /><strong>Drop a question here</strong><button type="button" className="secondaryButton" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Choose image</button><span>PNG, JPG, or WebP · up to 10 MB</span><input hidden ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={fileChanged} aria-label="Upload question image" /></div>{uploadError && <p className="uploadError" role="alert">{uploadError}</p>}{upload && <div className="uploadPreview"><div><span>{upload.name}</span><button type="button" className="iconButton" aria-label="Remove uploaded image" onClick={() => setUpload(null)}><X size={17} /></button></div><Image src={upload.url} width={1000} height={620} alt="Your uploaded question preview" unoptimized /><p>Your image stays in this browser. This frontend mockup uses the sample question to demonstrate the solution.</p></div>}<button type="button" className="primaryButton sampleButton" onClick={useSample}>Try the sample problem <ArrowRight size={18} /></button><span className="sampleDescription">Quadratic and line intersections</span></div>}
      {dialog === 'history' && <div className="libraryContent"><p>Your solved questions in this session</p><button type="button" className="libraryEntry" onClick={useSample}><span className="libraryIcon"><History size={19} /></span><span><strong>Quadratic and line intersections</strong><small>Read the x-intercepts · Answer 7</small></span><ArrowRight size={18} /></button></div>}
      {dialog === 'saved' && <div className="libraryContent"><p>Methods you’ve bookmarked in this session</p>{savedMethods.length ? savedMethods.map(key => <div className="savedEntry" key={key}><button type="button" className="libraryEntry" onClick={() => { setMethod(key); setActiveStep(2); setDialog(null); setMobileTab('steps'); }}><span className="libraryIcon"><Bookmark size={19} /></span><span><strong>{METHODS[key].name}</strong><small>{key === 'difference' ? 'Find intersections by graphing the difference' : 'Read the intersection of the two original graphs'}</small></span><ArrowRight size={18} /></button><button type="button" className="textButton" aria-label={`Remove ${METHODS[key].name} bookmark`} onClick={() => setSavedMethods(current => current.filter(item => item !== key))}>Remove bookmark</button></div>) : <div className="emptyLibrary"><Bookmark size={29} strokeWidth={1.4} /><h3>Keep a useful method</h3><p>Choose “Save this trick” beneath the solution to add it here.</p><button type="button" className="secondaryButton" onClick={() => setDialog(null)}>Back to the solution</button></div>}</div>}
      {dialog === 'help' && <div className="helpContent"><p>Select a numbered step to highlight its expression or point in the calculator.</p><p>Copy an expression, try another method, or open “Why this works” for a little more detail. On a phone, switch between Steps and Calculator at the top.</p><button type="button" className="primaryButton" onClick={() => setDialog(null)}>Got it <Check size={17} /></button></div>}
    </dialog>
  </div>;
}
