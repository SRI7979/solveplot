"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  ArrowUpRight, Bookmark, Check, ChevronDown, Copy, LoaderCircle,
  Monitor, Moon, RotateCcw, ScanLine, Sun,
} from "lucide-react";
import Link from "next/link";
import { getPalette, PALETTES, type Palette } from "@/lib/workspace-palettes";
import { useAppearance } from "./appearance-provider";
import { useTheme } from "./theme-provider";
import MathExpression from "./math-expression";
import solutionStyles from "./solution-explanation.module.css";
import { useGuestAuth } from "./guest-auth-provider";
import "./appearance-settings.css";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "cool", label: "Cool" },
  { id: "warm", label: "Warm" },
  { id: "neutral", label: "Neutral" },
] as const;
const FEATURED_PALETTES = ["candy", "tidal", "lavender", "rose", "espresso", "graphite"];
const TYPOGRAPHY = [
  { id: "Modern", font: "var(--font-nunito), sans-serif", description: "Rounded sans" },
  { id: "Geist", font: "var(--font-geist), sans-serif", description: "Clean sans" },
  { id: "Editorial", font: "var(--font-stix), Georgia, serif", description: "Classic serif" },
  { id: "Technical", font: "var(--font-geist-mono), monospace", description: "Monospace" },
] as const;
const BUTTON_STYLES = ["Solid", "Outline", "Raised"] as const;
const CORNER_STYLES = ["Crisp", "Soft", "Round"] as const;
type Filter = (typeof FILTERS)[number]["id"];

function PaletteSwatches({ palette }: { palette: Palette }) {
  return (
    <span className="appearanceSwatches" aria-hidden="true">
      {(palette.swatches ?? [palette.accent, palette.secondary, palette.tertiary, palette.canvas]).map((color, index) => (
        <span key={index} style={{ background: color }} />
      ))}
    </span>
  );
}

function WorkspacePreview() {
  const { preferences } = useAppearance();
  const palette = getPalette(preferences.palette);
  const [saved, setSaved] = useState(false);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
  }, []);
  async function copyExpression() {
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    try {
      await navigator.clipboard.writeText("y=x^2-6x-7");
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    copyTimeout.current = setTimeout(() => setCopyStatus("idle"), 2500);
  }

  return (
    <aside className="appearancePreview" aria-labelledby="workspace-preview-heading">
      <div className="appearancePreviewHeading">
        <h2 id="workspace-preview-heading">Workspace preview</h2>
        <span>{palette.name}</span>
      </div>
      <div className="appearancePreviewStage">
        <div className="appearanceMiniApp">
          <div className="appearanceMiniHeader">
            <span className="appearanceMiniAppIcon"><ScanLine size={17} /></span>
            <strong>Solver</strong>
            <span>Sample question</span>
          </div>
          <div className="appearanceMiniBody">
            <div className="appearancePreviewQuestion">
              <span>Your problem</span>
              <p>What is the positive x-intercept of <MathExpression latex="y=x^2-6x-7" />?</p>
            </div>
            <div className={`${solutionStyles.answerBox} appearanceMiniAnswer`}>
              <div className={solutionStyles.answerHeading}>
                <span className={solutionStyles.answerCheck}><Check size={14} /></span>
                <span>Answer</span>
              </div>
              <strong className={solutionStyles.answerValue}>7</strong>
            </div>
            <p className="appearanceMiniLabel">Recommended method</p>
            <h3>Read the intercepts</h3>
            <p className="appearancePreviewExplanation">Graph the equation, then select the intercept to the right of the y-axis.</p>
            <div className="appearancePreviewStep">
              <div className={solutionStyles.lineHeading}>
                <div className={solutionStyles.stepSelect}>
                  <span className={solutionStyles.stepNumber}>1</span>
                  <span><small>Type</small><strong>Enter line 1</strong></span>
                </div>
                <button type="button" className="copyButton appearancePreviewCopy" onClick={copyExpression}>
                  {copyStatus === "copied" ? <Check size={13} /> : <Copy size={13} />}
                  {copyStatus === "copied" ? "Copied" : "Copy"}
                </button>
              </div>
              <div className={`${solutionStyles.equation} appearancePreviewEquation`}>
                <MathExpression latex="y=x^2-6x-7" />
              </div>
              <p>The point (7, 0) gives the positive x-intercept.</p>
              <span className="appearanceVisuallyHidden" role="status">
                {copyStatus === "copied" ? "Expression copied." : copyStatus === "failed" ? "Could not copy. Select the expression to copy it manually." : ""}
              </span>
            </div>
            <button type="button" className="primaryButton appearancePreviewButton" aria-pressed={saved} onClick={() => setSaved((value) => !value)}>
              {saved ? <Check size={16} /> : <Bookmark size={16} />}
              {saved ? "Trick saved" : "Save this trick"}
            </button>
          </div>
        </div>
      </div>
      <p className="appearancePreviewNote">Try the buttons here. This example won’t be added to your saved tricks.</p>
    </aside>
  );
}

export function AppearanceStudio({ settings = false }: { settings?: boolean }) {
  const { preferences, setPreferences, reset: resetAppearance } = useAppearance();
  const { isGuest, requestSignIn } = useGuestAuth();
  const palette = getPalette(preferences.palette);
  const [filter, setFilter] = useState<Filter>("all");
  const [showAllPalettes, setShowAllPalettes] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [accountPending, setAccountPending] = useState(false);
  useEffect(() => {
    if (!accountPending) return;
    const timeout = window.setTimeout(() => setAccountPending(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [accountPending]);
  const visiblePalettes = showAllPalettes
    ? PALETTES.filter((item) => filter === "all" || item.family === filter)
    : PALETTES.filter((item) => FEATURED_PALETTES.includes(item.id) || item.id === preferences.palette);
  const update = (next: Partial<typeof preferences>) => {
    setPreferences({ ...preferences, ...next });
    setResetMessage("");
  };

  if (!settings) return <Link href="/settings" className="secondaryButton">Appearance settings</Link>;
  return (
    <div className="appearancePage">
      <div className="wsPageInner appearancePageInner">
        <header className="wsPageHeading">
          <div>
            <h1>Settings</h1>
            <p>Colors, fonts, and controls</p>
          </div>
          {isGuest ? <button type="button" className="secondaryButton appearanceAccountLink" onClick={() => requestSignIn("account", "/profile")}>
            <span>Sign in</span><ArrowUpRight size={16} />
          </button> : <Link href="/profile" prefetch className="secondaryButton appearanceAccountLink" aria-busy={accountPending} onNavigate={() => setAccountPending(true)}>
            {accountPending ? <LoaderCircle size={16} className="appearanceAccountSpinner" /> : null}
            <span>{accountPending ? "Opening account…" : "Manage account"}</span>
            {!accountPending ? <ArrowUpRight size={16} /> : null}
          </Link>}
        </header>
        <div className="appearanceLayout">
          <section className="appearanceOptions" aria-label="Workspace appearance">
            <div className="appearanceGroup">
              <div className="appearanceSectionHeading"><h2>Appearance</h2></div>
              <div className="appearanceSettingRow">
                <div><h3>Color mode</h3><p>Light, dark, or system</p></div>
                <AppearanceThemeToggle />
              </div>
              <fieldset className="appearanceField appearancePaletteField">
                <legend>Color palette</legend>
                <div className="appearancePaletteToolbar">
                  <p><strong>{palette.name}</strong> <span>{palette.description}</span></p>
                  <button type="button" className="textControl appearancePaletteExpand" aria-expanded={showAllPalettes} aria-controls="appearance-palettes" onClick={() => { setShowAllPalettes(!showAllPalettes); setFilter("all"); }}>
                    {showAllPalettes ? "Show fewer" : `All ${PALETTES.length} palettes`}<ChevronDown size={15} />
                  </button>
                </div>
                {showAllPalettes && (
                  <div className="appearanceFilters segmentedControl" role="group" aria-label="Filter palettes">
                    {FILTERS.map((item) => (
                      <button key={item.id} type="button" className="choiceControl" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>
                    ))}
                  </div>
                )}
                <div className="appearancePaletteGrid" id="appearance-palettes">
                  {visiblePalettes.map((item) => (
                    <label key={item.id} className="appearancePaletteChoice" data-selected={preferences.palette === item.id} style={{ "--swatch-accent": item.accent } as CSSProperties}>
                      <input type="radio" name="color-palette" value={item.id} checked={preferences.palette === item.id} onChange={() => update({ palette: item.id })} aria-label={`${item.name}: ${item.description}`} />
                      <PaletteSwatches palette={item} />
                      <span className="appearancePaletteName">{item.name}<span className="appearancePaletteCheck" aria-hidden="true">{preferences.palette === item.id && <Check size={12} strokeWidth={2.5} />}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="appearanceField appearanceAmount">
                <legend>Color amount</legend>
                <div className="appearanceFieldRow">
                  <p>Backgrounds and selected controls</p>
                  <div className="appearanceAmountChoices segmentedControl">
                    {(["soft", "colorful"] as const).map((amount) => (
                      <label key={amount} className="appearanceAmountChoice choiceControl" data-selected={preferences.colorAmount === amount}>
                        <input type="radio" name="color-amount" value={amount} checked={preferences.colorAmount === amount} onChange={() => update({ colorAmount: amount })} />
                        <span className="appearanceAmountDot" data-amount={amount} aria-hidden="true" />
                        {amount === "soft" ? "Soft" : "Colorful"}
                      </label>
                    ))}
                  </div>
                </div>
              </fieldset>
            </div>
            <div className="appearanceGroup">
              <fieldset className="appearanceField appearanceTypographyField">
                <legend>Typography</legend>
                <p>Text throughout the workspace</p>
                <div className="appearanceTypographyChoices">
                  {TYPOGRAPHY.map(({ id: text, font, description }) => (
                    <label key={text} className="appearanceAmountChoice appearanceTypographyChoice" data-selected={preferences.text === text}>
                      <input type="radio" name="workspace-font" value={text} checked={preferences.text === text} onChange={() => update({ text })} />
                      <span className="appearanceTypeSample" style={{ fontFamily: font }} aria-hidden="true">Aa</span>
                      <span className="appearanceChoiceText"><strong>{text}</strong><small>{description}</small></span>
                      <Check size={14} aria-hidden="true" />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="appearanceGroup appearanceControlGroup">
              <div className="appearanceSectionHeading"><h2>Controls</h2></div>
              <fieldset className="appearanceField appearanceTreatmentField">
                <legend>Button style</legend>
                <div className="appearanceTreatmentChoices">
                  {BUTTON_STYLES.map((button) => (
                    <label key={button} className="appearanceAmountChoice appearanceTreatmentChoice" data-selected={preferences.button === button}>
                      <input type="radio" name="workspace-button-style" value={button} checked={preferences.button === button} onChange={() => update({ button })} />
                      <span className="appearanceButtonSample" data-style={button.toLowerCase()} aria-hidden="true"><span>Button</span></span>
                      <span>{button}</span>
                      <Check size={13} aria-hidden="true" />
                    </label>
                  ))}
                </div>
              </fieldset>
              <fieldset className="appearanceField appearanceTreatmentField">
                <legend>Corner style</legend>
                <div className="appearanceTreatmentChoices">
                  {CORNER_STYLES.map((corners) => (
                    <label key={corners} className="appearanceAmountChoice appearanceTreatmentChoice" data-selected={preferences.corners === corners}>
                      <input type="radio" name="workspace-corner-style" value={corners} checked={preferences.corners === corners} onChange={() => update({ corners })} />
                      <span className="appearanceCornerSample" data-style={corners.toLowerCase()} aria-hidden="true" />
                      <span>{corners}</span>
                      <Check size={13} aria-hidden="true" />
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            <footer className="appearanceFooter">
              <div><p><Check size={13} /> Changes saved in this tab</p><span role="status">{resetMessage}</span></div>
              <button type="button" className="appearanceReset secondaryButton" onClick={() => { resetAppearance(); setFilter("all"); setResetMessage("Default appearance restored."); }}><RotateCcw size={14} /> Reset to default</button>
            </footer>
          </section>
          <WorkspacePreview />
        </div>
      </div>
    </div>
  );
}

export function AppearanceThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={`appearanceThemeToggle segmentedControl ${className}`} role="group" aria-label="Color mode">
      {([
        { value: "light", label: "Light", icon: Sun },
        { value: "dark", label: "Dark", icon: Moon },
        { value: "system", label: "System", icon: Monitor },
      ] as const).map(({ value, label, icon: Icon }) => (
        <button type="button" key={value} className="choiceControl" aria-pressed={theme === value} onClick={() => setTheme(value)}><Icon size={15} /><span>{label}</span></button>
      ))}
    </div>
  );
}
