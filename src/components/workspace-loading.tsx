import AccountNav from "./account-nav";
import { WorkspaceAppearance } from "./appearance-provider";
import workspace from "@/app/solve/page.module.css";
import WorkspacePlaceholder, { type WorkspaceLoadingView } from "./workspace-placeholder";

export default function WorkspaceLoading({
  active,
  title,
  variant = active,
}: {
  active: "solve" | "learn" | "history" | "tricks" | "settings" | "profile";
  title: string;
  variant?: WorkspaceLoadingView;
}) {
  return (
    <WorkspaceAppearance className={workspace.shell}>
      <header className={workspace.header}>
        <AccountNav active={active} loading />
      </header>
      <main
        className={`${workspace.main} ${workspace.historyMain}`}
        aria-label={title}
      >
        <WorkspacePlaceholder title={title} variant={variant} />
      </main>
    </WorkspaceAppearance>
  );
}
