import Link from "next/link";
import { X } from "lucide-react";
import { WorkspaceAppearance } from "./appearance-provider";
import { LearnTheme } from "./learn-theme";
import { ExercisePlaceholder } from "./workspace-placeholder";
import styles from "./workspace-loading.module.css";

export default function LessonLoading({ checkpoint = false }: { checkpoint?: boolean }) {
  return <WorkspaceAppearance className={styles.exerciseShell}><LearnTheme><Link href="/learn" className={styles.exerciseExit} aria-label="Back to lessons"><X size={21} /></Link><ExercisePlaceholder checkpoint={checkpoint} /></LearnTheme></WorkspaceAppearance>;
}
