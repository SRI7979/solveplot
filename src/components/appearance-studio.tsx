"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { ArrowUpRight, Bookmark, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { useAppearance } from "./appearance-provider";
import { useTheme } from "./theme-provider";
import { Monitor, Moon, Sun } from "lucide-react";
import Link from "next/link";
import { getPalette, PALETTES, type Palette } from "@/lib/workspace-palettes";
import "./appearance-settings.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "cool", label: "Cool" },
  { id: "warm", label: "Warm" },
  { id: "neutral", label: "Neutral" },
] as const;

const TYPOGRAPHY = [
  { id: "Modern", sample: "Graphs, equations, and regressions." },
  { id: "Geist", sample: "Graphs, equations, and regressions." },
  { id: "Editorial", sample: "Graphs, equations, and regressions." },
  { id: "Technical", sample: "Graphs, equations, and regressions." },
] as const;

const BUTTON_STYLES = ["Solid", "Outline", "Raised"] as const;
const CORNER_STYLES = ["Crisp", "Soft", "Round"] as const;

type Filter = (typeof FILTERS)[number]["id"];

function PaletteSwatches({ palette }: { palette: Palette }) {
  return (
    <span className="appearanceSwatches" aria-hidden="true">
      {(
        palette.swatches ?? [
          palette.accent,
          palette.secondary,
          palette.tertiary,
          palette.canvas,
        ]
      ).map((color, index) => (
        <span key={index} style={{ background: color }} />
      ))}
    </span>
  );
}

function WorkspacePreview() {
  const { preferences } = useAppearance();
  const [saved, setSaved] = useState(false);
  const palette = getPalette(preferences.palette);
  const curve = Array.from({ length: 111 }, (_, index) => {
    const x = -2 + index / 10;
    const y = x * x - 6 * x - 7;
    return `${index === 0 ? "M" : "L"}${((x + 2) * 17).toFixed(2)},${(152 - (y + 20) * 3).toFixed(2)}`;
  }).join(" ");

  return (
    <aside className="appearancePreview" aria-label="Workspace color preview">
      <div className="appearancePreviewHeading">
        <h2>Preview</h2>
        <span>{palette.name}</span>
      </div>
      <div className="appearanceMiniApp">
        <div className="appearanceMiniHeader">
          <strong>Solver</strong>
          <Bookmark size={14} />
        </div>
        <div className="appearanceMiniBody">
          <p className="appearanceMiniLabel">Recommended method</p>
          <h3>Read the intercepts</h3>
          <p>
            Subtract the equations, then find where the graph crosses the
            x-axis.
          </p>
          <div className="appearanceMiniInput">
            <span>1</span>
            <code>y = x² − 4x + 1 − (2x + 8)</code>
          </div>
          <div className="appearanceMiniGraph">
            <svg
              viewBox="0 0 190 170"
              role="img"
              aria-label="Graph of y equals x squared minus 6x minus 7, with the positive intercept at 7, 0"
            >
              <defs>
                <clipPath id="settings-preview-clip">
                  <rect width="190" height="170" />
                </clipPath>
              </defs>
              <g className="appearanceGraphGrid">
                {[0, 34, 68, 102, 136, 170].map((x) => (
                  <line key={`v${x}`} x1={x} x2={x} y1="0" y2="170" />
                ))}
                {[2, 32, 62, 92, 122, 152].map((y) => (
                  <line key={`h${y}`} y1={y} y2={y} x1="0" x2="190" />
                ))}
              </g>
              <g className="appearanceGraphAxes">
                <line x1="34" x2="34" y1="0" y2="170" />
                <line y1="92" y2="92" x1="0" x2="190" />
              </g>
              <path
                d={curve}
                clipPath="url(#settings-preview-clip)"
                className="appearanceGraphCurve"
              />
              <circle
                cx="153"
                cy="92"
                r="4.5"
                className="appearanceGraphPoint"
              />
              <rect
                x="132"
                y="65"
                width="50"
                height="20"
                rx="5"
                className="appearanceGraphLabel"
              />
              <text x="157" y="79" textAnchor="middle">
                (7, 0)
              </text>
            </svg>
          </div>
          <div className="appearanceMiniAnswer">
            <span>
              <Check size={15} /> Answer
            </span>
            <strong>7</strong>
          </div>
          <button
            type="button"
            className="primaryButton appearancePreviewButton"
            aria-pressed={saved}
            onClick={() => setSaved((value) => !value)}
          >
            {saved ? <Check size={15} /> : <Bookmark size={15} />}
            {saved ? "Trick saved" : "Save this trick"}
          </button>
        </div>
      </div>
      <p className="appearancePreviewNote">
        Colors update throughout your workspace. Your expressions and graph view
        are preserved.
      </p>
    </aside>
  );
}

export function AppearanceStudio({ settings = false }: { settings?: boolean }) {
  const {
    preferences,
    setPreferences,
    reset: resetAppearance,
  } = useAppearance();
  const paletteId = preferences.palette;
  const palette = getPalette(paletteId);
  const colorAmount = preferences.colorAmount;
  const setPalette = (id: string) =>
    setPreferences({ ...preferences, palette: id });
  const setColorAmount = (amount: "soft" | "colorful") =>
    setPreferences({ ...preferences, colorAmount: amount });
  const [filter, setFilter] = useState<Filter>("all");
  const [resetMessage, setResetMessage] = useState("");
  const [accountPending, setAccountPending] = useState(false);
  useEffect(() => {
    if (!accountPending) return;
    const timeout = window.setTimeout(() => setAccountPending(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [accountPending]);
  const visiblePalettes = PALETTES.filter(
    (item) => filter === "all" || item.family === filter,
  );

  if (!settings)
    return (
      <Link href="/settings" className="secondaryButton">
        Appearance settings
      </Link>
    );
  return (
    <div className="appearancePage">
      <div className="wsPageInner appearancePageInner">
        <header className="wsPageHeading">
          <div>
            <h1>Settings</h1>
            <p>Customize colors, typography, and controls.</p>
          </div>
          <Link
            href="/profile"
            prefetch={true}
            className="secondaryButton appearanceAccountLink"
            aria-busy={accountPending}
            onNavigate={() => setAccountPending(true)}
          >
            {accountPending ? (
              <LoaderCircle size={17} className="appearanceAccountSpinner" />
            ) : null}
            <span>{accountPending ? "Opening account…" : "Manage your account"}</span>
            {!accountPending ? <ArrowUpRight size={17} /> : null}
          </Link>
        </header>
        <div className="appearanceLayout">
          <section
            className="appearanceOptions"
            aria-labelledby="appearance-heading"
          >
            <div className="appearanceSectionHeading">
              <h2 id="appearance-heading">Appearance</h2>
              <AppearanceThemeToggle />
            </div>
            <fieldset className="appearanceAmount">
              <legend>Color amount</legend>
              <p>Choose how much color appears in backgrounds and controls.</p>
              <div className="appearanceAmountChoices segmentedControl">
                {(["soft", "colorful"] as const).map((amount) => (
                  <label
                    key={amount}
                    className="appearanceAmountChoice choiceControl"
                    data-selected={colorAmount === amount}
                  >
                    <input
                      type="radio"
                      name="color-amount"
                      value={amount}
                      checked={colorAmount === amount}
                      onChange={() => {
                        setColorAmount(amount);
                        setResetMessage("");
                      }}
                    />
                    <span
                      className="appearanceAmountDot"
                      data-amount={amount}
                      aria-hidden="true"
                    />
                    {amount === "soft" ? "Soft" : "Colorful"}
                    <Check size={14} aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="appearancePaletteField">
              <legend>Color palette</legend>
              <div className="appearancePaletteToolbar">
                <p>
                  {PALETTES.length} palettes · <strong>{palette.name}</strong>{" "}
                  selected
                </p>
                <div
                  className="appearanceFilters segmentedControl"
                  role="group"
                  aria-label="Filter palettes"
                >
                  {FILTERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="choiceControl"
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="appearancePaletteGrid">
                {visiblePalettes.map((item) => (
                  <label
                    key={item.id}
                    className="appearancePaletteChoice"
                    data-selected={paletteId === item.id}
                    style={{ "--swatch-accent": item.accent } as CSSProperties}
                  >
                    <input
                      type="radio"
                      name="color-palette"
                      value={item.id}
                      checked={paletteId === item.id}
                      onChange={() => {
                        setPalette(item.id);
                        setResetMessage("");
                      }}
                      aria-label={`${item.name}: ${item.description}`}
                    />
                    <PaletteSwatches palette={item} />
                    <span className="appearancePaletteName">
                      {item.name}
                      <span
                        className="appearancePaletteCheck"
                        aria-hidden="true"
                      >
                        {paletteId === item.id && (
                          <Check size={13} strokeWidth={2.5} />
                        )}
                      </span>
                    </span>
                    <span className="appearancePaletteDescription">
                      {item.description}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="appearanceAmount">
              <legend>Typography</legend>
              <p>Choose the reading style used across your workspace.</p>
              <div className="appearanceAmountChoices">
                {TYPOGRAPHY.map(({ id: text, sample }) => (
                  <label
                    key={text}
                    className="appearanceAmountChoice"
                    data-selected={preferences.text === text}
                  >
                    <input
                      type="radio"
                      name="workspace-font"
                      value={text}
                      checked={preferences.text === text}
                      onChange={() => {
                        setPreferences({ ...preferences, text });
                        setResetMessage("");
                      }}
                    />
                    <span className="appearanceChoiceText">
                      <strong>{text}</strong>
                      <small>{sample}</small>
                    </span>
                    <Check size={14} aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="appearanceAmount appearanceTreatmentField">
              <legend>Button style</legend>
              <p>Choose solid, outlined, or raised buttons.</p>
              <div className="appearanceAmountChoices">
                {BUTTON_STYLES.map((button) => (
                  <label
                    key={button}
                    className="appearanceAmountChoice"
                    data-selected={preferences.button === button}
                  >
                    <input
                      type="radio"
                      name="workspace-button-style"
                      value={button}
                      checked={preferences.button === button}
                      onChange={() => {
                        setPreferences({ ...preferences, button });
                        setResetMessage("");
                      }}
                    />
                    {button}
                    <Check size={14} aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset className="appearanceAmount appearanceTreatmentField">
              <legend>Corner style</legend>
              <p>Set the shape of panels, fields, and buttons.</p>
              <div className="appearanceAmountChoices">
                {CORNER_STYLES.map((corners) => (
                  <label
                    key={corners}
                    className="appearanceAmountChoice"
                    data-selected={preferences.corners === corners}
                  >
                    <input
                      type="radio"
                      name="workspace-corner-style"
                      value={corners}
                      checked={preferences.corners === corners}
                      onChange={() => {
                        setPreferences({ ...preferences, corners });
                        setResetMessage("");
                      }}
                    />
                    {corners}
                    <Check size={14} aria-hidden="true" />
                  </label>
                ))}
              </div>
            </fieldset>
            <footer className="appearanceFooter">
              <div>
                <p>Saved for this browser tab.</p>
                <span role="status">{resetMessage}</span>
              </div>
              <button
                type="button"
                className="appearanceReset secondaryButton"
                onClick={() => {
                  resetAppearance();
                  setFilter("all");
                  setResetMessage(`Candy and Colorful restored.`);
                }}
              >
                <RotateCcw size={14} /> Reset to default
              </button>
            </footer>
          </section>
          <WorkspacePreview />
        </div>
      </div>
    </div>
  );
}

export function AppearanceThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      className={`appearanceThemeToggle segmentedControl themeControlGroup ${className}`}
      role="group"
      aria-label="Color mode"
    >
      {(
        [
          { value: "light", label: "Light", icon: Sun },
          { value: "dark", label: "Dark", icon: Moon },
          { value: "system", label: "System", icon: Monitor },
        ] as const
      ).map(({ value, label, icon: Icon }) => (
        <button
          type="button"
          key={value}
          className="iconControl"
          aria-pressed={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
        >
          <Icon size={17} />
        </button>
      ))}
    </div>
  );
}
