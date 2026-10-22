import Link from "next/link";
import { WorkspaceAppearance } from "@/components/appearance-provider";
import SolvePlotLogo from "@/components/solveplot-logo";
import styles from "@/app/login/page.module.css";

export default function ProblemNotFound() {
  return (
    <WorkspaceAppearance className={styles.entry}>
      <main className={styles.page}>
        <SolvePlotLogo centered variant="workspace" />
        <section className={`${styles.card} appPageEnter`}>
          <h1>Problem not found</h1>
          <p className={styles.subtitle}>This problem isn’t in your history.</p>
          <Link href="/history" className={`${styles.button} secondaryButton`}>
            Back to history
          </Link>
        </section>
      </main>
    </WorkspaceAppearance>
  );
}
