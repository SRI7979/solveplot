import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLesson } from "@/lib/learn-catalog";
import { GuestAuthScope } from "@/components/guest-auth-provider";
import LessonPage from "../lesson-page";
import { isLocalLearnReview } from "@/lib/local-learn-review";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = getLesson((await params).slug);
  return { title: lesson ? `${lesson.title} | Learn | SolvePlot` : "Lesson not found | SolvePlot", robots: { index: false, follow: false } };
}

export default async function LearnLessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const lesson = getLesson((await params).slug);
  if (!lesson) notFound();
  const user = await getCurrentUser();
  if (!user && !isLocalLearnReview()) redirect(`/learn?path=${lesson.path}&open=${encodeURIComponent(`/learn/${lesson.slug}`)}`);
  return (
    <GuestAuthScope authenticated={Boolean(user)}>
      <LessonPage lesson={lesson} progressScope={user ? `user:${user.id}` : "guest"} />
    </GuestAuthScope>
  );
}
