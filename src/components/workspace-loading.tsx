import AccountNav from "./account-nav";
import { WorkspaceAppearance } from "./appearance-provider";
import workspace from "@/app/solve/page.module.css";
import WorkspacePlaceholder from "./workspace-placeholder";

export default function WorkspaceLoading({
  active,
  title,
}: {
  active: "solve" | "history" | "tricks" | "settings" | "profile";
  title: string;
}) {
  return (
    <WorkspaceAppearance className={workspace.shell}>
      <header className={workspace.header}>
        <AccountNav active={active} />
      </header>
      <main
        className={`${workspace.main} ${workspace.historyMain}`}
        aria-busy="true"
        aria-label={`Loading ${title}`}
      >
        <WorkspacePlaceholder title={title} />
      </main>
    </WorkspaceAppearance>
  );
}
