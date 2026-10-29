"use client";

import Link from "next/link";
import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUpRight, BookOpen, Check, ChevronDown, ChevronRight, Copy, FileClock, FileText, Home, Menu, Monitor, Moon, PanelLeftClose, PanelLeftOpen, Search, Sun, X } from "lucide-react";
import { PRODUCT_UPDATES } from "@/content/product-updates";
import { useTheme, type ThemePreference } from "./theme-provider";
import styles from "./document-shell.module.css";

const documentFont = Inter({ subsets: ["latin"], display: "swap", variable: "--font-document-inter" });

type DocumentPage = { href: string; title: string; section: "guides" | "updates" };
// The chrome needs labels, not the guides' teaching data or calculator examples.
const GUIDE_PAGES: readonly DocumentPage[] = [
  { href: "/guides/desmos-sat", title: "Desmos on the SAT", section: "guides" },
  { href: "/guides/systems-of-equations", title: "Systems of equations", section: "guides" },
  { href: "/guides/regression", title: "Regression", section: "guides" },
  { href: "/guides/quadratics", title: "Quadratics", section: "guides" },
];
const UPDATE_PAGES: readonly DocumentPage[] = PRODUCT_UPDATES.map(update => ({ href: `/updates/${update.id}`, title: update.title, section: "updates" }));
const ALL_PAGES = [...GUIDE_PAGES, ...UPDATE_PAGES];
const MOBILE_QUERY = "(max-width: 820px)";
function subscribeMobile(change: () => void) { const media = window.matchMedia(MOBILE_QUERY); media.addEventListener("change", change); return () => media.removeEventListener("change", change); }
function mobileSnapshot() { return window.matchMedia(MOBILE_QUERY).matches; }
const desktopSnapshot = () => false;
const THEME_OPTIONS: { value: ThemePreference; title: string; Icon: typeof Sun }[] = [{ value: "light", title: "Light", Icon: Sun }, { value: "dark", title: "Dark", Icon: Moon }, { value: "system", title: "System", Icon: Monitor }];

export default function DocumentShell({ children, section, title }: { children: ReactNode; section: "guides" | "updates"; title?: string }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, desktopSnapshot);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const sidebarOpener = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const search = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchOpener = useRef<HTMLButtonElement>(null);
  const appearance = useRef<HTMLDivElement>(null);
  const appearanceButton = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activePage = ALL_PAGES.find(page => page.href === pathname);
  const sectionLabel = section === "guides" ? "Guides" : "Updates";
  const currentTitle = title ?? activePage?.title;
  const filtered = ALL_PAGES.filter(page => `${page.title} ${page.section}`.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);
  useEffect(() => {
    if (!mobile || !mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const handle = (event: globalThis.KeyboardEvent) => {
      if (search.current?.open) return;
      if (event.key === "Escape") { event.preventDefault(); setMobileOpen(false); return; }
      if (event.key !== "Tab") return;
      const stops = Array.from(sidebar.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),summary') ?? []);
      const visible = stops.filter(element => element.getClientRects().length > 0);
      const first = visible[0], last = visible.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handle);
      returnFocus.current?.focus();
    };
  }, [mobile, mobileOpen]);
  useEffect(() => {
    if (!appearanceOpen) return;
    const close = (event: PointerEvent) => { if (!appearance.current?.contains(event.target as Node)) setAppearanceOpen(false); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") { setAppearanceOpen(false); appearanceButton.current?.focus(); } };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    appearance.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    return () => { document.removeEventListener("pointerdown", close); document.removeEventListener("keydown", escape); };
  }, [appearanceOpen]);

  function toggleSidebar() {
    if (mobile) { returnFocus.current = document.activeElement as HTMLElement; setMobileOpen(value => !value); }
    else setCollapsed(value => !value);
  }
  function closeSidebar() { if (mobile) setMobileOpen(false); else { setCollapsed(true); requestAnimationFrame(() => sidebarOpener.current?.focus()); } }
  function openSearch() { setQuery(""); search.current?.showModal(); requestAnimationFrame(() => searchInput.current?.focus()); }
  function closeSearch() { search.current?.close(); searchOpener.current?.focus(); }
  function menuKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]'));
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); setCopied(true); if (copyTimer.current) clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  }
  const pageLink = (page: DocumentPage) => <Link key={page.href} href={page.href} className={styles.pageLink} aria-current={pathname === page.href ? "page" : undefined} onClick={() => setMobileOpen(false)}><FileText size={16} /><span>{page.title}</span></Link>;

  return <div className={`${styles.shell} ${documentFont.variable}`} data-sidebar-collapsed={collapsed} data-mobile-open={mobileOpen}>
    <a href="#document-content" className={styles.skip}>Skip to content</a>
    {mobileOpen && <button className={styles.backdrop} type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside ref={sidebar} id="document-sidebar" className={styles.sidebar} aria-label="Document navigation" aria-hidden={mobile ? !mobileOpen : collapsed} inert={mobile ? !mobileOpen : collapsed} role={mobile && mobileOpen ? "dialog" : undefined} aria-modal={mobile && mobileOpen ? true : undefined}>
      <div className={styles.workspace}><Link href="/" className={styles.workspaceName} onClick={() => setMobileOpen(false)}><span className={styles.workspaceMark}>S</span><strong>SolvePlot</strong></Link><button type="button" className={styles.iconButton} onClick={closeSidebar} aria-label="Close sidebar" title="Close sidebar"><PanelLeftClose size={17} /></button></div>
      <button ref={searchOpener} className={styles.searchButton} type="button" onClick={openSearch}><Search size={17} /><span>Search pages</span></button>
      <nav className={styles.primaryNav} aria-label="Site navigation"><Link href="/" onClick={() => setMobileOpen(false)}><Home size={17} />Home</Link><Link href="/guides" onClick={() => setMobileOpen(false)} aria-current={pathname === "/guides" ? "page" : undefined}><BookOpen size={17} />Guides</Link><Link href="/updates" onClick={() => setMobileOpen(false)} aria-current={pathname === "/updates" ? "page" : undefined}><FileClock size={17} />Updates</Link></nav>
      <div className={styles.sidebarPages}>
        <details open className={styles.navGroup}><summary><ChevronRight size={13} /><span>Guides</span></summary><nav aria-label="Guide pages">{GUIDE_PAGES.map(pageLink)}</nav></details>
        <details open={section === "updates"} className={styles.navGroup}><summary><ChevronRight size={13} /><span>Updates</span></summary><nav aria-label="Update pages">{UPDATE_PAGES.map(pageLink)}</nav></details>
      </div>
      <div className={styles.sidebarFooter}><Link href="/solve" onClick={() => setMobileOpen(false)}><ArrowUpRight size={16} />Open solver</Link><Link href="/faq" onClick={() => setMobileOpen(false)}>Help &amp; FAQ</Link></div>
    </aside>
    <div className={styles.canvas}>
      <header className={styles.toolbar}>
        <button ref={sidebarOpener} type="button" className={styles.iconButton} onClick={toggleSidebar} aria-label={mobile ? "Open navigation" : collapsed ? "Open sidebar" : "Close sidebar"} aria-controls="document-sidebar" aria-expanded={mobile ? mobileOpen : !collapsed} title="Toggle sidebar">{mobile ? <Menu size={18} /> : <PanelLeftOpen size={17} />}</button>
        <nav className={styles.breadcrumbs} aria-label="Page location"><Link href={section === "guides" ? "/guides" : "/updates"}>{section === "guides" ? <BookOpen size={15} /> : <FileClock size={15} />}<span>{sectionLabel}</span></Link>{currentTitle && <><span className={styles.slash}>/</span><span className={styles.currentPage}>{currentTitle}</span></>}</nav>
        <div className={styles.toolbarActions}>
          <button type="button" className={styles.copyButton} onClick={() => void copyLink()} aria-label={copied ? "Page link copied" : "Copy page link"}>{copied ? <Check size={14} /> : <Copy size={14} />}<span>{copied ? "Copied" : "Copy link"}</span></button>
          <div ref={appearance} className={styles.appearance}>
            <button ref={appearanceButton} type="button" className={styles.appearanceButton} onClick={() => setAppearanceOpen(value => !value)} aria-label="Page appearance" aria-haspopup="menu" aria-expanded={appearanceOpen} title="Appearance"><span className={styles.typeIcon}>Aa</span><ChevronDown size={11} /></button>
            {appearanceOpen && <div className={styles.appearanceMenu} role="menu" aria-label="Page theme" onKeyDown={menuKey}><span className={styles.menuLabel}>Appearance</span>{THEME_OPTIONS.map(({ value, title: label, Icon }) => <button type="button" role="menuitemradio" aria-checked={theme === value} key={value} onClick={() => { setTheme(value); setAppearanceOpen(false); appearanceButton.current?.focus(); }}><Icon size={16} /><span>{label}</span>{theme === value && <Check size={15} />}</button>)}</div>}
          </div>
          <Link href="/solve" className={styles.solverLink}>Open solver <ArrowUpRight size={13} /></Link>
        </div>
        <span className={styles.srOnly} role="status">{copied ? "Page link copied" : ""}</span>
      </header>
      <div className={styles.content} id="document-content" tabIndex={-1}>{children}</div>
    </div>
    <dialog ref={search} className={styles.searchDialog} aria-label="Find a page" onClick={event => { if (event.target === event.currentTarget) closeSearch(); }} onCancel={() => searchOpener.current?.focus()}>
      <div className={styles.searchField}><Search size={20} /><input ref={searchInput} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search guides and updates" aria-label="Search guides and updates" /><button type="button" className={styles.iconButton} onClick={closeSearch} aria-label="Close search"><X size={18} /></button></div>
      <div className={styles.searchResults}><span className={styles.menuLabel}>{query.trim() ? `${filtered.length} pages` : "Guides and updates"}</span>{filtered.length ? filtered.map(page => <Link key={page.href} href={page.href} onClick={() => { search.current?.close(); setMobileOpen(false); }}><FileText size={17} /><span>{page.title}<small>{page.section === "guides" ? "Guides" : "Updates"}</small></span><ArrowUpRight size={14} /></Link>) : <p>No matching pages</p>}</div>
    </dialog>
  </div>;
}
