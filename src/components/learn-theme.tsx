"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import { useAppearance } from "./appearance-provider";
import { learnThemeColors } from "@/lib/learn-theme";
import styles from "./learn-theme.module.css";

/** Place inside WorkspaceAppearance, so the lesson shares its font and palette settings. */
export function LearnTheme({ children, className = "", style, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { preferences } = useAppearance();
  const colors = Object.fromEntries((["light", "dark"] as const).flatMap((mode) => {
    const token = learnThemeColors(preferences.palette, mode === "dark");
    return [[`--learn-${mode}-accent`, token.accent], [`--learn-${mode}-strong`, token.strong], [`--learn-${mode}-on-accent`, token.onAccent]];
  })) as CSSProperties;
  return <div {...props} className={`${styles.scope} ${className}`} style={{ ...colors, ...style }} data-learn-palette={preferences.palette}>{children}</div>;
}
