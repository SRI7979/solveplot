import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import HistoryShell from "@/app/history/history-shell";
import LearnCatalog from "./learn-catalog";
import { isLocalLearnReview } from "@/lib/local-learn-review";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Learn | SolvePlot",
  robots: { index: false, follow: false },
};

export default async function LearnPage({ searchParams }: { searchParams: Promise<{ path?: string; open?: string }> }) {
  const user = await getCurrentUser();
  const previewAccess = isLocalLearnReview();
  const query = await searchParams;
  const selectedPath = query.path === "sat" ? "sat" : "desmos";
  const target = safeAuthRedirect(query.open);
  const signInNext = target.startsWith("/learn/") ? target : undefined;
  if ((user || previewAccess) && signInNext) redirect(signInNext);
  return (
    <HistoryShell email={user?.email} name={user?.name} avatarUrl={user?.avatarUrl} authenticated={Boolean(user)} active="learn">
      <LearnCatalog initialPath={selectedPath} progressScope={user ? `user:${user.id}` : "guest"} signInNext={signInNext} previewAccess={previewAccess} />
    </HistoryShell>
  );
}
