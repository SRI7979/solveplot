import type { ReactNode } from "react";
import DocumentShell from "@/components/document-shell";
import styles from "./updates.module.css";

export default function UpdatesLayout({ children }: { children: ReactNode }) {
  return <DocumentShell section="updates"><div className={styles.page}>{children}</div></DocumentShell>;
}
