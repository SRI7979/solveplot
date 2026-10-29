import type { ReactNode } from "react";
import DocumentShell from "@/components/document-shell";

export default function GuidesLayout({ children }: { children: ReactNode }) {
  return <DocumentShell section="guides">{children}</DocumentShell>;
}
