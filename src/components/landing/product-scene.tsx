import type { CSSProperties, HTMLAttributes } from "react";
import { appearanceTokens, DEFAULT_APPEARANCE } from "@/lib/appearance";
import styles from "./product-scene.module.css";

// Use the workspace's real Candy theme rather than a second marketing palette.
const candy = Object.fromEntries(
  Object.entries(appearanceTokens(DEFAULT_APPEARANCE, true)).map(([key, value]) => [`--${key}`, value]),
) as CSSProperties;

export function ProductScene({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.scene} ${className}`} data-product-scene="" {...props} />;
}

export function ProductSurface({ className = "", style, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div
    className={`solveplot-shell ${styles.surface} ${className}`}
    data-palette="candy"
    data-color-amount="colorful"
    data-button="raised"
    data-typography="modern"
    data-color-mode="dark"
    style={{ ...candy, ...style }}
    {...props}
  />;
}
