import { PALETTES, getPalette, paletteVariables } from "./workspace-palettes";
export { PALETTES } from "./workspace-palettes";

export type AppearancePreferences = {
  palette: string;
  colorAmount: "soft" | "colorful";
  text: "Modern" | "Geist" | "Editorial" | "Technical";
  button: "Solid" | "Outline" | "Raised";
  corners: "Crisp" | "Soft" | "Round";
};
export const DEFAULT_APPEARANCE: AppearancePreferences = {
  palette: "candy",
  colorAmount: "colorful",
  text: "Modern",
  button: "Raised",
  corners: "Round",
};
export const APPEARANCE_STORAGE_KEY = "solveplot-appearance";
const LEGACY_PALETTES = [
  "botanical",
  "espresso",
  "tidal",
  "plum",
  "terracotta",
  "cobalt",
];
export function parseAppearance(value: string | null): AppearancePreferences {
  try {
    const input = JSON.parse(value ?? "null");
    if (!input || typeof input !== "object" || Array.isArray(input))
      return { ...DEFAULT_APPEARANCE };
    const palette =
      typeof input.palette === "string"
        ? input.palette
        : Number.isInteger(input.palette)
          ? LEGACY_PALETTES[input.palette]
          : undefined;
    return {
      palette: PALETTES.some((item) => item.id === palette)
        ? palette
        : DEFAULT_APPEARANCE.palette,
      colorAmount: input.colorAmount === "soft" ? "soft" : "colorful",
      text: ["Modern", "Geist", "Editorial", "Technical"].includes(input.text)
        ? input.text
        : DEFAULT_APPEARANCE.text,
      button: ["Solid", "Outline", "Raised"].includes(input.button)
        ? input.button
        : DEFAULT_APPEARANCE.button,
      corners: ["Crisp", "Soft", "Round"].includes(input.corners)
        ? input.corners
        : DEFAULT_APPEARANCE.corners,
    };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}
function blend(hex: string, base: string, ratio: number) {
  return (
    "#" +
    [1, 3, 5]
      .map((index) =>
        Math.round(
          parseInt(base.slice(index, index + 2), 16) * (1 - ratio) +
            parseInt(hex.slice(index, index + 2), 16) * ratio,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
/** Tokens are scoped to workspace shells; math and server behavior stay independent. */
export function appearanceTokens(
  preferences: AppearancePreferences,
  dark: boolean,
): Record<string, string> {
  const palette = getPalette(preferences.palette);
  const p = paletteVariables(palette, preferences.colorAmount);
  if (dark) {
    Object.assign(p, {
      "--ink": "#e8edf0",
      "--paper": "#1b2025",
      "--canvas": "#14181c",
      "--sidebar": "#171b20",
      "--raised": "#22282e",
      "--hover": "#293139",
      "--border": "#303940",
      "--control-border": "#3c4750",
      "--control-edge": "#11161a",
      "--muted": "#b0bac2",
      "--subtle": "#a0adb7",
      "--teal": blend(palette.accent, "#ffffff", 0.4),
      "--secondary": blend(palette.secondary, "#ffffff", 0.4),
      "--tertiary": blend(palette.tertiary, "#ffffff", 0.4),
      "--accent-border": blend(palette.accent, "#303940", 0.4),
      "--selection-border": blend(palette.secondary, "#394956", 0.4),
      "--soft": blend(palette.accent, "#1b2025", 0.22),
      "--answer-fill": blend(palette.accent, "#1b2025", 0.17),
      "--secondary-soft": blend(palette.secondary, "#1b2025", 0.2),
      "--tertiary-soft": blend(palette.tertiary, "#1b2025", 0.2),
      "--selection-soft": blend(palette.secondary, "#1b2025", 0.22),
      "--selection-accent": blend(palette.secondary, "#ffffff", 0.4),
      "--primary-button":
        palette.id === "candy"
          ? "#e8edf0"
          : blend(palette.accent, "#ffffff", 0.4),
      "--primary-button-hover": "#ffffff",
      "--primary-edge": "#76838d",
    });
  }
  const foreground = p["--ink"],
    card = p["--paper"],
    background = p["--canvas"],
    soft = p["--soft"],
    brand = p["--teal"],
    border = p["--border"];
  const radius =
    preferences.corners === "Crisp"
      ? "0.25rem"
      : preferences.corners === "Soft"
        ? "0.625rem"
        : "1rem";
  return {
    ...Object.fromEntries(
      Object.entries(p)
        .filter(
          ([key]) =>
            !["--secondary", "--accent-ink", "--accent-hover"].includes(key),
        )
        .map(([key, value]) => [key.slice(2), value]),
    ),
    background,
    card,
    foreground,
    popover: card,
    "card-foreground": foreground,
    "popover-foreground": foreground,
    primary: p["--primary-button"],
    "primary-foreground": dark ? "#172027" : "#ffffff",
    secondary: soft,
    "secondary-accent": p["--secondary"],
    "secondary-foreground": foreground,
    muted: p["--muted"],
    "ui-muted": soft,
    "muted-foreground": p["--muted"],
    accent: soft,
    "accent-foreground": foreground,
    brand,
    "brand-soft": soft,
    success: brand,
    input: border,
    ring: p["--secondary"],
    radius,
    "radius-sm": `max(2px, calc(${radius} - 6px))`,
    "radius-md": `max(3px, calc(${radius} - 4px))`,
    "radius-lg": radius,
    "radius-xl": `calc(${radius} + 4px)`,
    "radius-2xl": `calc(${radius} + 8px)`,
    surface: p["--raised"],
    "surface-raised": card,
    "surface-muted": background,
    "accent-ink": brand,
    "accent-text": brand,
    "accent-soft": soft,
    "accent-hover": brand,
    "accent-pressed": brand,
    "answer-surface": p["--answer-fill"],
    "border-subtle": border,
    "border-strong": p["--control-border"],
    "border-accent": p["--accent-border"],
    "success-soft": soft,
    "panel-header": card,
    "trace-line": border,
    danger: dark ? "#ffaaa6" : "#b3363b",
    "danger-soft": dark ? "#3b2328" : "#fff2f2",
    destructive: "#e5484d",
    "shadow-card": "none",
    "shadow-pop": dark ? "0 18px 48px #0008" : "0 12px 32px #18232e14",
    "shadow-float": dark ? "0 18px 48px #0008" : "0 12px 32px #18232e14",
    "font-sans":
      preferences.text === "Editorial"
        ? "var(--font-stix), Georgia, serif"
        : preferences.text === "Technical"
          ? "var(--font-geist-mono), ui-monospace, monospace"
          : preferences.text === "Geist"
            ? "var(--font-geist), ui-sans-serif, system-ui, sans-serif"
            : "var(--font-nunito), ui-sans-serif, system-ui, sans-serif",
    "font-mono": "var(--font-geist-mono), ui-monospace, monospace",
  };
}
