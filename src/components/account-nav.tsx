"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Bookmark,
  History,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ScanLine,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import { NEW_PROBLEM_EVENT } from "@/lib/workspace-events";
import SolvePlotLogo from "./solveplot-logo";
import WorkspacePlaceholder from "./workspace-placeholder";
import styles from "./account-nav.module.css";
import { useWorkspaceAccount } from "./workspace-account-provider";

type View = "solve" | "history" | "tricks" | "settings" | "profile";
const STORAGE_KEY = "solveplot-sidebar-collapsed";
const CHANGE_EVENT = "solveplot-sidebar-change";
let memoryCollapsed = false;
function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
function snapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return memoryCollapsed;
  }
}
const links = [
  { href: "/solve", label: "Solver", view: "solve", icon: ScanLine },
  { href: "/history", label: "History", view: "history", icon: History },
  { href: "/tricks", label: "Saved tricks", view: "tricks", icon: Bookmark },
  { href: "/settings", label: "Settings", view: "settings", icon: Settings },
] as const;

function NavigationPending({ onSettled }: { onSettled: () => void }) {
  const { pending } = useLinkStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (wasPending.current && !pending) onSettled();
    wasPending.current = pending;
  }, [pending, onSettled]);
  return (
    <span
      hidden
      data-pending={pending || undefined}
      aria-hidden="true"
    />
  );
}

export default function AccountNav({
  email,
  avatarUrl,
  name,
  active,
  loading = false,
}: {
  email?: string;
  avatarUrl?: string;
  name?: string;
  active: View;
  loading?: boolean;
}) {
  const { account, rememberAccount } = useWorkspaceAccount();
  useEffect(() => {
    if (!loading) rememberAccount({ email, name, avatarUrl });
  }, [loading, email, name, avatarUrl, rememberAccount]);
  const displayAccount = loading ? account : { email, name, avatarUrl };
  const displayEmail = displayAccount?.email;
  const displayAvatar = displayAccount?.avatarUrl;
  const collapsed = useSyncExternalStore(subscribe, snapshot, () => false);
  const [open, setOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [destination, setDestination] = useState<{
    href: string;
    label: string;
  } | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const displayName = displayAccount?.name || displayEmail?.split("@")[0] || "Your profile";
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    else if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);
  useEffect(() => {
    if (dialog.current?.open) dialog.current.close();
  }, [pathname]);
  function toggleSidebar() {
    memoryCollapsed = !collapsed;
    try {
      window.localStorage.setItem(STORAGE_KEY, String(memoryCollapsed));
    } catch {
      /* In-memory preference remains usable. */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
  function close() {
    setOpen(false);
  }
  function sidebar(mobile = false) {
    return (
      <>
        <div className={styles.brandRow}>
          <SolvePlotLogo variant="workspace" />
          {mobile ? (
            <button
              type="button"
              className={`${styles.iconButton} iconControl`}
              aria-label="Close navigation"
              onClick={close}
            >
              <X size={20} />
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.collapse} iconControl`}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={toggleSidebar}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </button>
          )}
        </div>
        <Link
          href="/solve?new=1"
          prefetch={null}
          className={`${styles.newProblem} wsNewProblem`}
          aria-label="New problem"
          title="New problem (N)"
          onClick={(event) => {
            close();
            if (active === "solve") {
              event.preventDefault();
              window.dispatchEvent(new Event(NEW_PROBLEM_EVENT));
            }
          }}
        >
          <Plus size={19} />
          <span className={styles.navText}>New problem</span>
        </Link>
        <nav
          className={styles.links}
          aria-label={mobile ? "Mobile workspace" : "Main navigation"}
        >
          {links.map(({ href, label, view, icon: Icon }) => (
            <Link
              href={href}
              prefetch={null}
              onNavigate={() => {
                if (pathname !== href) setDestination({ href, label });
              }}
              onMouseEnter={() => router.prefetch(href)}
              onFocus={() => router.prefetch(href)}
              onTouchStart={() => router.prefetch(href)}
              key={href}
              data-section={view}
              aria-label={label}
              title={collapsed && !mobile ? label : undefined}
              aria-current={active === view ? "page" : undefined}
              onClick={close}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span className={styles.navText}>{label}</span>
              <NavigationPending
                onSettled={() =>
                  setDestination((current) =>
                    current?.href === href ? null : current,
                  )
                }
              />
            </Link>
          ))}
        </nav>
        <Link
          href="/profile"
          prefetch={null}
          className={`${styles.profile} appProfile`}
          aria-label="Your profile"
          aria-current={active === "profile" ? "page" : undefined}
          onClick={close}
          title={collapsed && !mobile ? displayName : undefined}
        >
          <span className={styles.avatar}>
            {displayAvatar && !photoFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayAvatar}
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setPhotoFailed(true)}
              />
            ) : (
              <UserRound size={21} strokeWidth={1.6} />
            )}
          </span>
          <span className={`${styles.navText}${loading && !account ? ` ${styles.profileSkeleton}` : ""}`}>
            <strong>{loading && !account ? "\u00a0" : displayName}</strong>
            <small>{loading && !account ? "\u00a0" : displayEmail || "Account settings"}</small>
          </span>
        </Link>
      </>
    );
  }
  return (
    <div className={styles.root} data-sidebar-collapsed={collapsed}>
      {destination && (
        <div
          className={styles.destination}
          role="status"
          aria-label={`Loading ${destination.label}`}
        >
          <WorkspacePlaceholder title={destination.label} />
        </div>
      )}
      <aside
        className={`${styles.sidebar}${collapsed ? ` ${styles.collapsed}` : ""}`}
        aria-label="Workspace sidebar"
      >
        {sidebar()}
      </aside>
      <button
        type="button"
        className={`${styles.mobileMenu} wsMobileMenu`}
        ref={opener}
        aria-label="Open navigation"
        aria-expanded={open}
        aria-controls="mobile-workspace-navigation"
        onClick={() => setOpen(true)}
      >
        <Menu size={21} />
      </button>
      <dialog
        id="mobile-workspace-navigation"
        ref={dialog}
        className={styles.mobileNavigation}
        aria-label="Workspace navigation"
        onClose={() => {
          setOpen(false);
          opener.current?.focus();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className={styles.mobileSidebar}>{sidebar(true)}</div>
      </dialog>
    </div>
  );
}
