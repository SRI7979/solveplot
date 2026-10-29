import { notFound, redirect } from "next/navigation";
import { GuestAuthScope } from "@/components/guest-auth-provider";
import { getCurrentUser } from "@/lib/auth";
import { getCheckpoint } from "@/lib/learn-checkpoints";
import CheckpointReader from "../../checkpoint-reader";
import { isLocalLearnReview } from "@/lib/local-learn-review";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const checkpoint = getCheckpoint((await params).id);
  return {
    title: checkpoint ? checkpoint.title + " | Learn | SolvePlot" : "Checkpoint not found | SolvePlot",
    robots: { index: false, follow: false },
  };
}

export default async function LearnCheckpointPage({ params }: { params: Promise<{ id: string }> }) {
  const checkpoint = getCheckpoint((await params).id);
  if (!checkpoint) notFound();
  const user = await getCurrentUser();
  if (!user && !isLocalLearnReview()) redirect(`/learn?path=${checkpoint.path}&open=${encodeURIComponent(`/learn/checkpoint/${checkpoint.id}`)}`);
  return <GuestAuthScope authenticated={Boolean(user)}>
    <CheckpointReader key={checkpoint.id} checkpoint={checkpoint} progressScope={user ? "user:" + user.id : "guest"} />
  </GuestAuthScope>;
}
