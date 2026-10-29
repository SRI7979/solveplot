"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type WorkspaceAccount = { email?: string; name?: string; avatarUrl?: string; authenticated: boolean };
const AccountContext = createContext<{
  account: WorkspaceAccount | null;
  rememberAccount: (account: WorkspaceAccount) => void;
}>({ account: null, rememberAccount: () => {} });

/** Keep verified display metadata visible while a workspace route streams. */
export default function WorkspaceAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<WorkspaceAccount | null>(null);
  const pathname = usePathname();
  const rememberAccount = useCallback((next: WorkspaceAccount) => {
    setAccount((current) =>
      current?.email === next.email && current?.name === next.name && current?.avatarUrl === next.avatarUrl && current?.authenticated === next.authenticated
        ? current
        : next,
    );
  }, []);
  if (account && !/^\/(solve|learn|history|tricks|settings|profile)(\/|$)/.test(pathname)) {
    setAccount(null);
  }
  return <AccountContext.Provider value={{ account, rememberAccount }}>{children}</AccountContext.Provider>;
}

export const useWorkspaceAccount = () => useContext(AccountContext);
