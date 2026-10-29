import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { GuestSignInButton } from "@/components/guest-auth-provider";
import { listProblems } from "@/lib/problem-history";
import { History, Plus, ArrowLeft, ArrowRight } from "lucide-react";
import HistoryList from "./history-list";
import HistoryShell from "./history-shell";
import styles from "@/components/library-ui.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "History | SolvePlot",
  robots: { index: false, follow: false },
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  const query = await searchParams;
  const requestedPage =
    typeof query.page === "string" && /^\d+$/.test(query.page)
      ? Number(query.page)
      : 1;
  const page = Number.isSafeInteger(requestedPage)
    ? Math.max(1, Math.min(10_000, requestedPage))
    : 1;
  // Provider errors and credentials stay out of the rendered page.
  let result: Awaited<ReturnType<typeof listProblems>> | null;
  try {
    result = user ? await listProblems(user.id, page) : null;
  } catch {
    result = null;
  }

  return (
    <HistoryShell
      email={user?.email}
      avatarUrl={user?.avatarUrl}
      name={user?.name}
      authenticated={Boolean(user)}
    >
      <div className={styles.page}>
        <header className={styles.heading}>
          <div className={styles.title}>
            <span className={styles.pageIcon}>
              <History size={24} />
            </span>
            <div>
              <h1>History</h1>
              <p>Saved questions and solutions</p>
            </div>
          </div>
          <Link href="/solve?new=1" className="primaryButton">
            <Plus size={17} /> New problem
          </Link>
        </header>
        {!user ? (
          <div className={styles.empty}>
            <History size={28} aria-hidden="true" />
            <h2>No saved questions</h2>
            <p>Sign in to save your solutions</p>
            <GuestSignInButton next="/history" />
          </div>
        ) : result === null ? (
          <div className={styles.empty} role="alert">
            <h2>History couldn’t load</h2>
            <p>Your saved problems have not been changed</p>
            <a href={`/history?page=${page}`} className="secondaryButton">
              Retry
            </a>
          </div>
        ) : result.problems.length === 0 ? (
          <div className={styles.empty}>
            <h2>
              {page === 1
                ? "No saved problems yet"
                : "No problems on this page"}
            </h2>
            <p>
              {page === 1
                ? "Upload a question to save its explanation here"
                : "Go back to your most recent problems"}
            </p>
            <Link
              href={page === 1 ? "/solve" : "/history"}
              className="secondaryButton"
            >
              {page === 1 ? "Open solver" : "Back to history"}
            </Link>
          </div>
        ) : (
          <>
            <HistoryList problems={result.problems} />
            <nav className={styles.pagination} aria-label="History pages">
              {page > 1 && (
                <Link
                  href={`/history?page=${page - 1}`}
                  className="secondaryButton"
                >
                  <ArrowLeft size={15} /> Previous
                </Link>
              )}
              <span>Page {page}</span>
              {result.hasMore && (
                <Link
                  href={`/history?page=${page + 1}`}
                  className="secondaryButton"
                >
                  Next <ArrowRight size={15} />
                </Link>
              )}
            </nav>
          </>
        )}
      </div>
    </HistoryShell>
  );
}
