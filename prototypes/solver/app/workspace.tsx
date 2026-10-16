'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, Bookmark, ChevronRight, History, ImagePlus, Menu, PanelLeftClose, PanelLeftOpen, Plus, ScanLine, Settings, Upload, UserRound, X } from 'lucide-react';
import type { Method } from './preview-data';

const STORAGE_EVENT = 'desmo-preview-preference';
const memoryPreferences = new Map<string, string>();
function subscribePreferences(listener: () => void) {
  window.addEventListener(STORAGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(STORAGE_EVENT, listener); window.removeEventListener('storage', listener); };
}
function readPreference(key: string, fallback: string) {
  try { return window.sessionStorage.getItem(key) ?? fallback; }
  catch { return memoryPreferences.get(key) ?? fallback; }
}
function useSessionPreference(key: string, fallback: string) {
  const value = useSyncExternalStore(subscribePreferences, useCallback(() => readPreference(key, fallback), [key, fallback]), () => fallback);
  const update = useCallback((next: string) => {
    memoryPreferences.set(key, next);
    try { window.sessionStorage.setItem(key, next); } catch { /* Session preferences still work in memory. */ }
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }, [key]);
  return [value, update] as const;
}

type WorkspaceState = {
  method: Method;
  selectMethod: (method: Method) => void;
  savedMethods: Method[];
  toggleSavedMethod: (method: Method) => void;
  openUpload: () => void;
  sampleRevision: number;
  restoreSample: (method?: Method) => void;
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
  const [method, selectMethod] = useState<Method>('difference');
  const [sampleRevision, setSampleRevision] = useState(0);
  const [savedPreference, setSavedPreference] = useSessionPreference('desmo-preview-saved', '[]');
  const [collapsedPreference, setCollapsedPreference] = useSessionPreference('desmo-preview-sidebar', 'expanded');
  const [profileName, updateProfileName] = useSessionPreference('desmo-preview-profile-name', '');
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<{ name: string; url: string } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [notice, setNotice] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const uploadTriggerRef = useRef<HTMLElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mobileMenuRef = useRef<HTMLDialogElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapsed = collapsedPreference === 'collapsed';
  const title = pathname === '/profile' ? 'Profile' : navigation.find(item => item.href === pathname)?.name ?? 'Workspace';
  let savedMethods: Method[] = [];
  try {
    const parsed: unknown = JSON.parse(savedPreference);
    if (Array.isArray(parsed)) savedMethods = [...new Set(parsed.filter((entry): entry is Method => entry === 'difference' || entry === 'intersections'))];
  } catch { /* An invalid preference is equivalent to an empty library. */ }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (uploadOpen && !dialog?.open) dialog?.showModal();
    else if (!uploadOpen && dialog?.open) dialog.close();
  }, [uploadOpen]);
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
  useEffect(() => () => { if (upload) URL.revokeObjectURL(upload.url); }, [upload]);
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

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
  function openUpload() {
    uploadTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (mobileMenuRef.current?.open) mobileMenuRef.current.close();
    setMobileNavigation(false);
    setUploadOpen(true);
  }
  function closeUpload() {
    setUploadOpen(false);
    requestAnimationFrame(() => {
      const candidates = [uploadTriggerRef.current, document.querySelector<HTMLElement>('.wsMobileMenu'), document.querySelector<HTMLElement>('.workspaceSidebar .wsNewProblem')];
      const target = candidates.find(element => element?.isConnected && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden' && !element.closest('dialog:not([open])'));
      target?.focus({ preventScroll: true });
    });
  }
  function restoreSample(next: Method = 'difference') {
    selectMethod(next);
    setSampleRevision(revision => revision + 1);
    setUploadOpen(false);
    setMobileNavigation(false);
    router.push('/');
    toast('Sample solution opened');
  }
  function addFile(file?: File) {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setUploadError('Choose a PNG, JPG, or WebP image'); return; }
    if (file.size > 10 * 1024 * 1024) { setUploadError('Choose an image smaller than 10 MB'); return; }
    setUploadError('');
    setUpload({ name: file.name, url: URL.createObjectURL(file) });
  }
  function fileChanged(event: ChangeEvent<HTMLInputElement>) { addFile(event.target.files?.[0]); event.target.value = ''; }
  function sidebar(mobile = false) {
    return <>
      <div className="wsBrandRow"><Link href="/" className="wsBrand" aria-label="Desmo solver" onClick={() => setMobileNavigation(false)}><span className="wsMark"><Mark /></span><span className="wsSidebarText">desmo</span></Link>{mobile ? <button type="button" className="wsIconButton" aria-label="Close navigation" onClick={() => setMobileNavigation(false)}><X size={19} /></button> : <button type="button" className="wsIconButton wsCollapse" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsedPreference(collapsed ? 'expanded' : 'collapsed')}><PanelLeftClose size={18} /></button>}</div>
      {!mobile && collapsed && <button type="button" className="wsExpand" aria-label="Expand sidebar" title="Expand sidebar" onClick={() => setCollapsedPreference('expanded')}><PanelLeftOpen size={19} /></button>}
      <button type="button" className="wsNewProblem" onClick={openUpload} aria-label="New problem" title="New problem"><Plus size={19} /><span className="wsSidebarText">New problem</span></button>
      <nav className="wsNavigation" aria-label={mobile ? 'Mobile workspace' : 'Workspace'}>{navigation.map(item => <Link href={item.href} key={item.href} className="wsNavLink" data-section={item.href.slice(1) || 'solver'} aria-current={pathname === item.href ? 'page' : undefined} title={item.name} onClick={() => setMobileNavigation(false)}><item.icon size={20} strokeWidth={1.8} /><span className="wsSidebarText">{item.name}</span></Link>)}</nav>
      <Link href="/profile" className="wsProfileLink" aria-label="Your profile" aria-current={pathname === '/profile' ? 'page' : undefined} title="Your profile" onClick={() => setMobileNavigation(false)}><ProfileAvatar /><span className="wsSidebarText"><strong>{profileName.trim() || 'Your profile'}</strong><small>Personal workspace</small></span></Link>
    </>;
  }

  return <WorkspaceContext.Provider value={{ method, selectMethod, savedMethods, toggleSavedMethod, openUpload, sampleRevision, restoreSample, toast, profileName, updateProfileName }}>
    <div className="workspaceShell" data-sidebar={collapsed ? 'collapsed' : 'expanded'}>
      <aside className="workspaceSidebar">{sidebar()}</aside>
      <header className="workspaceTopbar"><div className="wsBreadcrumb"><button className="wsIconButton wsMobileMenu" type="button" aria-label="Open navigation" onClick={() => setMobileNavigation(true)}><Menu size={21} /></button><span className="wsBreadcrumbRoot">Workspace</span><ChevronRight size={13} className="wsBreadcrumbChevron" /><strong>{title}</strong></div><span className="wsTopbarNote">SAT Math</span></header>
      <div className="workspaceContent">{children}</div>
    </div>
    <div className="wsToast" role="status" data-visible={Boolean(notice)}>{notice}</div>
    <dialog ref={mobileMenuRef} className="wsMobileNavigation" aria-label="Workspace navigation" onClose={() => setMobileNavigation(false)} onClick={event => { if (event.target === event.currentTarget) setMobileNavigation(false); }}><div className="wsMobileSidebar">{sidebar(true)}</div></dialog>
    <dialog ref={dialogRef} className="workspaceDialog" aria-labelledby="upload-dialog-title" onClose={closeUpload} onClick={event => { if (event.target === event.currentTarget) setUploadOpen(false); }}>
      <header><h2 id="upload-dialog-title">Add a problem</h2><button type="button" className="iconButton" aria-label="Close dialog" onClick={() => setUploadOpen(false)}><X size={21} /></button></header>
      <div className="uploadContent"><p>Bring in a screenshot, or explore the sample problem.</p><div className={`uploadZone${dragging ? ' dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={event => { event.preventDefault(); setDragging(false); addFile(event.dataTransfer.files[0]); }}><Upload size={26} strokeWidth={1.7} /><strong>Drop a question here</strong><button type="button" className="secondaryButton" onClick={() => fileRef.current?.click()}><ImagePlus size={16} /> Choose image</button><span>PNG, JPG, or WebP · up to 10 MB</span><input hidden ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={fileChanged} aria-label="Upload question image" /></div>{uploadError && <p className="uploadError" role="alert">{uploadError}</p>}{upload && <div className="uploadPreview"><div><span>{upload.name}</span><button type="button" className="iconButton" aria-label="Remove uploaded image" onClick={() => setUpload(null)}><X size={17} /></button></div><Image src={upload.url} width={1000} height={620} alt="Your uploaded question preview" unoptimized /><p>Your image stays in this browser. This frontend mockup uses the sample question to demonstrate the solution.</p></div>}<button type="button" className="primaryButton sampleButton" onClick={() => restoreSample()}>Try the sample problem <ArrowRight size={18} /></button><span className="sampleDescription">Quadratic and line intersections</span></div>
    </dialog>
  </WorkspaceContext.Provider>;
}
