import type { ReactNode } from "react";
import AccountNav from "@/components/account-nav";
import workspace from "@/app/solve/page.module.css";
import { WorkspaceAppearance } from "@/components/appearance-provider";
import { GuestAuthScope } from "@/components/guest-auth-provider";

export default function HistoryShell({
  email,
  avatarUrl,
  name,
  active = "history",
  authenticated = true,
  children,
}: {
  email?: string;
  avatarUrl?: string;
  name?: string;
  active?: "learn" | "history" | "tricks" | "settings" | "profile";
  authenticated?: boolean;
  children: ReactNode;
}) {
  return (
    <GuestAuthScope authenticated={authenticated}><WorkspaceAppearance className={workspace.shell}>
      <header className={workspace.header}>
        <AccountNav
          email={email}
          avatarUrl={avatarUrl}
          name={name}
          active={active}
        />
      </header>
      <main className={`${workspace.main} ${workspace.historyMain}`}>
        {children}
      </main>
    </WorkspaceAppearance></GuestAuthScope>
  );
}
