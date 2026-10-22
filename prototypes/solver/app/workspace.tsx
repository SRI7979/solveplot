'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bookmark, History, Menu, PanelLeftClose, PanelLeftOpen, Plus, ScanLine, Settings, UserRound, X } from 'lucide-react';
import { useAppearance } from './appearance';
import type { Method } from './preview-data';

const STORAGE_EVENT = 'solveplot-preview-preference';
const memoryPreferences = new Map<string, string>();
const unavailablePreferences = new Set<string>();
function subscribePreferences(listener: () => void) {
  window.addEventListener(STORAGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(STORAGE_EVENT, listener); window.removeEventListener('storage', listener); };
}
function readPreference(key: string, fallback: string) {
  if (unavailablePreferences.has(key)) return memoryPreferences.get(key) ?? fallback;
  try { return window.sessionStorage.getItem(key) ?? fallback; }
  catch { return memoryPreferences.get(key) ?? fallback; }
}
function writePreference(key: string, next: string) {
  memoryPreferences.set(key, next);
  try { window.sessionStorage.setItem(key, next); unavailablePreferences.delete(key); }
  catch { unavailablePreferences.add(key); }
  window.dispatchEvent(new Event(STORAGE_EVENT));
}
function useSessionPreference(key: string, fallback: string) {
  const value = useSyncExternalStore(subscribePreferences, useCallback(() => readPreference(key, fallback), [key, fallback]), () => fallback);
  const update = useCallback((next: string) => writePreference(key, next), [key]);
  return [value, update] as const;
}

export type CalculatorSnapshot = { method: Method; state: unknown };
export type HistoryEntry = {
  id: string;
  title: string;
  method: Method;
  createdAt: string | null;
  calculatorState?: unknown;
};
type UploadDraft = { name: string; url: string };
const HISTORY_KEY = 'solveplot-preview-history';
const CURRENT_KEY = 'solveplot-preview-current-problem';
type CurrentProblem = { id: string; method: Method; hasCurrentSolution: boolean };
const INITIAL_CURRENT: CurrentProblem = { id: 'sample-initial', method: 'difference', hasCurrentSolution: true };
const CURRENT_FALLBACK = JSON.stringify(INITIAL_CURRENT);
function parseCurrent(value: string): CurrentProblem {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && 'id' in parsed && typeof parsed.id === 'string' && 'method' in parsed && (parsed.method === 'difference' || parsed.method === 'intersections') && 'hasCurrentSolution' in parsed && typeof parsed.hasCurrentSolution === 'boolean') return parsed as CurrentProblem;
  } catch { /* Invalid state falls back to the completed example. */ }
  return INITIAL_CURRENT;
}
const INITIAL_HISTORY: HistoryEntry[] = [{ id: 'sample-initial', title: 'Quadratic and line intersections', method: 'difference', createdAt: null }];
const HISTORY_FALLBACK = JSON.stringify(INITIAL_HISTORY);
function parseHistory(value: string): HistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((entry): entry is HistoryEntry => Boolean(entry && typeof entry === 'object' && typeof entry.id === 'string' && typeof entry.title === 'string' && (entry.method === 'difference' || entry.method === 'intersections')));
  } catch { /* A damaged session starts with the supplied example. */ }
  return INITIAL_HISTORY;
}
function upsertHistory(entry: HistoryEntry) {
  const existing = parseHistory(readPreference(HISTORY_KEY, HISTORY_FALLBACK));
  const found = existing.findIndex(item => item.id === entry.id);
  if (found === -1) existing.unshift(entry);
  else existing[found] = { ...existing[found], ...entry };
  writePreference(HISTORY_KEY, JSON.stringify(existing));
}

type WorkspaceState = {
  method: Method;
  selectMethod: (method: Method) => void;
  savedMethods: Method[];
  toggleSavedMethod: (method: Method) => void;
  openUpload: () => void;
  sampleRevision: number;
  restoreSample: (method?: Method) => void;
  historyEntries: HistoryEntry[];
  openHistoryEntry: (id: string) => void;
  currentProblemId: string;
  hasCurrentSolution: boolean;
  calculatorCaptureRef: RefObject<(() => CalculatorSnapshot | null) | null>;
  rememberCalculatorState: (id: string, snapshot: CalculatorSnapshot) => void;
  readCalculatorState: (id: string, method: Method) => unknown;
  uploadDraft: UploadDraft | null;
  setUploadDraft: (draft: UploadDraft | null) => void;
  toast: (message: string) => void;
  profileName: string;
  updateProfileName: (name: string) => void;
};
const WorkspaceContext = createContext<WorkspaceState | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error('The solver preview needs its workspace layout.');
  return value;
}

function Mark() {
  return <svg viewBox="0 0 24 24" fill="none" width="24" height="24" aria-hidden="true"><path d="M3 17c5 0 4-10 9-10s4 10 9 10M3 12h18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>;
}
export function ProfileAvatar({ large = false }: { large?: boolean }) {
  return <span className={`wsAvatar${large ? ' wsAvatarLarge' : ''}`} aria-hidden="true"><UserRound size={large ? 31 : 21} strokeWidth={1.7} /></span>;
}

const navigation = [
  { href: '/', name: 'Solver', icon: ScanLine },
  { href: '/history', name: 'History', icon: History },
  { href: '/saved', name: 'Saved tricks', icon: Bookmark },
  { href: '/settings', name: 'Settings', icon: Settings },
];

export default function Workspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { calculatorDraftRef } = useAppearance();
  const [currentPreference, setCurrentPreference] = useSessionPreference(CURRENT_KEY, CURRENT_FALLBACK);
  const { method, id: currentProblemId, hasCurrentSolution } = parseCurrent(currentPreference);
  const [sampleRevision, setSampleRevision] = useState(0);
  const [historyPreference] = useSessionPreference(HISTORY_KEY, HISTORY_FALLBACK);
  const historyEntries = parseHistory(historyPreference);
  const [savedPreference, setSavedPreference] = useSessionPreference('solveplot-preview-saved', '[]');
  const [collapsedPreference, setCollapsedPreference] = useSessionPreference('solveplot-preview-sidebar', 'expanded');
  const [profileName, updateProfileName] = useSessionPreference('solveplot-preview-profile-name', '');
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft | null>(null);
  const [notice, setNotice] = useState('');
  const calculatorCaptureRef = useRef<(() => CalculatorSnapshot | null) | null>(null);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapsed = collapsedPreference === 'collapsed';
  let savedMethods: Method[] = [];
  try {
    const parsed: unknown = JSON.parse(savedPreference);
    if (Array.isArray(parsed)) savedMethods = [...new Set(parsed.filter((entry): entry is Method => entry === 'difference' || entry === 'intersections'))];
  } catch { /* An invalid preference is equivalent to an empty library. */ }

  useEffect(() => {
    const dialog = mobileMenuRef.current;
    if (mobileNavigation && !dialog?.open) dialog?.showModal();
    else if (!mobileNavigation && dialog?.open) dialog.close();
  }, [mobileNavigation]);
  useEffect(() => {
    // Browser Back/Forward should dismiss the drawer just like a navigation link.
    const dialog = mobileMenuRef.current;
    if (dialog?.open) dialog.close();
  }, [pathname]);
  useEffect(() => () => { if (uploadDraft) URL.revokeObjectURL(uploadDraft.url); }, [uploadDraft]);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  const rememberCalculatorState = useCallback((id: string, snapshot: CalculatorSnapshot) => {
    const entry = parseHistory(readPreference(HISTORY_KEY, HISTORY_FALLBACK)).find(item => item.id === id);
    if (entry) upsertHistory({ ...entry, method: snapshot.method, calculatorState: snapshot.state });
  }, []);
  const readCalculatorState = useCallback((id: string, selectedMethod: Method) => {
    const entry = parseHistory(readPreference(HISTORY_KEY, HISTORY_FALLBACK)).find(item => item.id === id && item.method === selectedMethod);
    return entry?.calculatorState;
  }, []);
  function selectMethod(next: Method) {
    setCurrentPreference(JSON.stringify({ id: currentProblemId, method: next, hasCurrentSolution }));
  }
  function archiveCurrentProblem() {
    const captured = calculatorCaptureRef.current?.();
    if (captured) rememberCalculatorState(currentProblemId, captured);
    else {
      const draft = calculatorDraftRef.current;
      if (draft?.sampleRevision === sampleRevision && (draft.method === 'difference' || draft.method === 'intersections')) {
        rememberCalculatorState(currentProblemId, { method: draft.method, state: draft.state });
      }
    }
  }
  function toast(message: string) {
    setNotice(message);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 2600);
  }
  function toggleSavedMethod(next: Method) {
    const exists = savedMethods.includes(next);
    setSavedPreference(JSON.stringify(exists ? savedMethods.filter(item => item !== next) : [...savedMethods, next]));
    toast(exists ? 'Trick removed' : 'Trick saved');
  }
  function closeNavigation() {
    if (mobileMenuRef.current?.open) mobileMenuRef.current.close();
    setMobileNavigation(false);
  }
  function navigateAway() {
    archiveCurrentProblem();
    closeNavigation();
  }
  function openUpload() {
    archiveCurrentProblem();
    setCurrentPreference(JSON.stringify({ id: currentProblemId, method, hasCurrentSolution: false }));
    closeNavigation();
    router.push('/new');
  }
  function restoreSample(next: Method = 'difference') {
    archiveCurrentProblem();
    const id = crypto.randomUUID();
    upsertHistory({ id, title: 'Quadratic and line intersections', method: next, createdAt: new Date().toISOString() });
    setCurrentPreference(JSON.stringify({ id, method: next, hasCurrentSolution: true }));
    // A new example must not inherit the previous question's edited graph.
    const revision = sampleRevision + 1;
    calculatorDraftRef.current = { method: next, sampleRevision: revision, state: null };
    setSampleRevision(revision);
    setUploadDraft(null);
    closeNavigation();
    router.push('/');
    toast('Sample solution opened');
  }
  function openHistoryEntry(id: string) {
    archiveCurrentProblem();
    const entry = parseHistory(readPreference(HISTORY_KEY, HISTORY_FALLBACK)).find(item => item.id === id);
    if (!entry) return;
    const revision = sampleRevision + 1;
    calculatorDraftRef.current = { method: entry.method, sampleRevision: revision, state: entry.calculatorState ?? null };
    setCurrentPreference(JSON.stringify({ id: entry.id, method: entry.method, hasCurrentSolution: true }));
    setSampleRevision(revision);
    closeNavigation();
    router.push('/');
  }
  function sidebar(mobile = false) {
    return <>
      <div className="wsBrandRow"><Link href="/" className="wsBrand" aria-label="SolvePlot solver" onClick={navigateAway}><span className="wsMark"><Mark /></span><span className="wsSidebarText">SolvePlot</span></Link>{mobile ? <button type="button" className="wsIconButton" aria-label="Close navigation" onClick={closeNavigation}><X size={19} /></button> : <button type="button" className="wsIconButton wsCollapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsedPreference(collapsed ? 'expanded' : 'collapsed')}><PanelLeftClose size={18} /></button>}</div>
      {!mobile && collapsed && <button type="button" className="wsExpand" aria-label="Expand sidebar" title="Expand sidebar" onClick={() => setCollapsedPreference('expanded')}><PanelLeftOpen size={19} /></button>}
      <button type="button" className="wsNewProblem" onClick={openUpload} aria-label="New problem" aria-current={pathname === '/new' || (pathname === '/' && !hasCurrentSolution) ? 'page' : undefined} title="New problem"><Plus size={19} /><span className="wsSidebarText">New problem</span></button>
      <nav className="wsNavigation" aria-label={mobile ? 'Mobile workspace' : 'Workspace'}>{navigation.map(item => <Link href={item.href} key={item.href} className="wsNavLink" data-section={item.href.slice(1) || 'solver'} aria-current={pathname === item.href && (item.href !== '/' || hasCurrentSolution) ? 'page' : undefined} title={item.name} onClick={navigateAway}><item.icon size={20} strokeWidth={1.8} /><span className="wsSidebarText">{item.name}</span></Link>)}</nav>
      <Link href="/profile" className="wsProfileLink" aria-label="Your profile" aria-current={pathname === '/profile' ? 'page' : undefined} title="Your profile" onClick={navigateAway}><ProfileAvatar /><span className="wsSidebarText"><strong>{profileName.trim() || 'Your profile'}</strong><small>Personal workspace</small></span></Link>
    </>;
  }

  return <WorkspaceContext.Provider value={{ method, selectMethod, savedMethods, toggleSavedMethod, openUpload, sampleRevision, restoreSample, historyEntries, openHistoryEntry, currentProblemId, hasCurrentSolution, calculatorCaptureRef, rememberCalculatorState, readCalculatorState, uploadDraft, setUploadDraft, toast, profileName, updateProfileName }}>
    <div className="workspaceShell" data-sidebar={collapsed ? 'collapsed' : 'expanded'}>
      <aside className="workspaceSidebar">{sidebar()}</aside>
      <button className="wsIconButton wsMobileMenu" type="button" aria-label="Open navigation" onClick={() => setMobileNavigation(true)}><Menu size={21} /></button>
      <div className="workspaceContent">{children}</div>
    </div>
    <div className="wsToast" role="status" data-visible={Boolean(notice)}>{notice}</div>
    <dialog ref={mobileMenuRef} className="wsMobileNavigation" aria-label="Workspace navigation" onClose={() => setMobileNavigation(false)} onClick={event => { if (event.target === event.currentTarget) closeNavigation(); }}><div className="wsMobileSidebar">{sidebar(true)}</div></dialog>
  </WorkspaceContext.Provider>;
}
