import Link from "next/link";
import { Bookmark, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listTricks } from "@/lib/saved-tricks";
import HistoryShell from "@/app/history/history-shell";
import SavedTricks, { type SavedTrickItem } from "./saved-tricks";
import styles from "@/components/library-ui.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saved tricks | SolvePlot",
  robots: { index: false, follow: false },
};

export default async function TricksPage() {
  const user = await requireUser("/tricks");
  let tricks: SavedTrickItem[] | null;
  try {
    tricks = (await listTricks(user.id)).map(
      ({
        id,
        techniqueName,
        structure,
        question,
        answer,
        selection,
        problemId,
        expressions,
      }) => ({
        id,
        techniqueName,
        structure,
        question,
        answer,
        selection,
        problemId,
        expressions,
      }),
    );
  } catch {
    tricks = null;
  }

  return (
    <HistoryShell
      email={user.email}
      avatarUrl={user.avatarUrl}
      name={user.name}
      active="tricks"
    >
      <div className={styles.page}>
        <header className={styles.heading}>
          <div className={styles.title}>
            <span className={styles.pageIcon}>
              <Bookmark size={24} />
            </span>
            <div>
              <h1>Saved tricks</h1>
              <p>Your collection of Desmos shortcuts.</p>
            </div>
          </div>
          <Link href="/solve?new=1" className="primaryButton">
            <Plus size={17} /> New problem
          </Link>
        </header>
        {tricks === null ? (
          <div className={styles.empty} role="alert">
            <h2>Saved tricks couldn’t load</h2>
            <p>Try again in a moment</p>
            <a href="/tricks" className="secondaryButton">
              Retry
            </a>
          </div>
        ) : (
          <SavedTricks initial={tricks} />
        )}
      </div>
    </HistoryShell>
  );
}
