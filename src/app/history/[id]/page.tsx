import AccountNav from "@/components/account-nav";
import SavedProblemWorkspace from "@/components/saved-problem-workspace";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProblem } from "@/lib/problem-history";
import HistoryShell from "../history-shell";
import styles from "@/components/library-ui.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Saved problem | Desmo",
  robots: { index: false, follow: false },
};

export default async function SavedProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/history/${encodeURIComponent(id)}`);
  let problem: Awaited<ReturnType<typeof getProblem>>;
  try {
    problem = await getProblem(user.id, id);
  } catch {
    return (
      <HistoryShell
        email={user.email}
        avatarUrl={user.avatarUrl}
        name={user.name}
      >
        <div className={styles.empty} role="alert">
          <h1>This problem couldn’t load</h1>
          <p>Your saved work has not been changed.</p>
          <a
            href={`/history/${encodeURIComponent(id)}`}
            className="secondaryButton"
          >
            Retry
          </a>
          <Link href="/history" className="textControl">
            Back to history
          </Link>
        </div>
      </HistoryShell>
    );
  }
  if (!problem) notFound();
  return (
    <SavedProblemWorkspace
      userId={user.id}
      solution={problem.solution}
      imageUrl={problem.imageUrl}
      inputText={problem.inputText}
      problemId={problem.id}
      accountNav={
        <AccountNav
          email={user.email}
          avatarUrl={user.avatarUrl}
          name={user.name}
          active="history"
        />
      }
    />
  );
}
