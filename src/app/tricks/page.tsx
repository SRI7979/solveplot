import Link from "next/link";
import { Bookmark, Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { GuestSignInButton } from "@/components/guest-auth-provider";
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
  const user = await getCurrentUser();
  let tricks: SavedTrickItem[] | null;
  try {
    tricks = user ? (await listTricks(user.id)).map(
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
    ) : null;
  } catch {
    tricks = null;
  }

  return (
    <HistoryShell
      email={user?.email}
      avatarUrl={user?.avatarUrl}
      name={user?.name}
      authenticated={Boolean(user)}
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
              <p>Saved calculator methods</p>
            </div>
          </div>
          <Link href="/solve?new=1" className="primaryButton">
            <Plus size={17} /> New problem
          </Link>
        </header>
        {!user ? (
          <div className={styles.empty}>
            <Bookmark size={28} aria-hidden="true" />
            <h2>No saved tricks</h2>
            <p>Sign in to save methods from your solutions</p>
            <GuestSignInButton next="/tricks" reason="save" />
          </div>
        ) : tricks === null ? (
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
