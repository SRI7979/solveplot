import { notFound } from "next/navigation";
import { getLessonContent } from "@/lib/lesson-content";
import { LESSONS, type Lesson } from "@/lib/learn-catalog";
import { getLessonJourney } from "@/lib/lesson-journeys";
import LessonReader from "./lesson-reader";
import SatLessonReader from "./sat-lesson-reader";

export default function LessonPage({ lesson, progressScope }: { lesson: Lesson; progressScope: string }) {
  const content = getLessonContent(lesson.slug);
  const journey = getLessonJourney(lesson.slug);
  if (!content || !journey) notFound();
  const nextTopics = lesson.slug === "circles" ? ["geometry", "graphing-equations"] : content.related;
  const related = nextTopics.flatMap((slug) => LESSONS.filter((item) => item.slug === slug));
  const Reader = lesson.path === "sat" ? SatLessonReader : LessonReader;
  return <Reader key={lesson.slug} lesson={lesson} content={content} journey={journey} related={related} progressScope={progressScope} />;
}
