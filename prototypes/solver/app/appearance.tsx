'use client';

import { createContext, useContext, useRef, useSyncExternalStore, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { DEFAULT_PALETTE_ID, getPalette, type Palette } from './palettes';

type ColorAmount = 'soft' | 'colorful';
type Preference = { paletteId: string; colorAmount: ColorAmount };
type CalculatorDraft = { method: string; sampleRevision: number; state: unknown };
type Appearance = Preference & {
  palette: Palette;
  setPalette: (id: string) => void;
  setColorAmount: (amount: ColorAmount) => void;
  resetAppearance: () => void;
  calculatorDraftRef: RefObject<CalculatorDraft | null>;
};

const KEY = 'desmo-preview-appearance';
const EVENT = 'desmo-preview-appearance-change';
const DEFAULTS: Preference = { paletteId: DEFAULT_PALETTE_ID, colorAmount: 'colorful' };
const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULTS);
let memorySnapshot = DEFAULT_SNAPSHOT;
let storageUnavailable = false;
const AppearanceContext = createContext<Appearance | null>(null);

function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener('storage', listener);
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', listener); };
}
function getSnapshot() {
  if (storageUnavailable) return memorySnapshot;
  try { return sessionStorage.getItem(KEY) ?? DEFAULT_SNAPSHOT; }
  catch { storageUnavailable = true; return memorySnapshot; }
}
function parsePreference(snapshot: string): Preference {
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!value || typeof value !== 'object') return DEFAULTS;
    const stored = value as Record<string, unknown>;
    return {
      paletteId: getPalette(typeof stored.paletteId === 'string' ? stored.paletteId : DEFAULT_PALETTE_ID).id,
      colorAmount: stored.colorAmount === 'soft' ? 'soft' : 'colorful',
    };
  } catch { return DEFAULTS; }
}
function savePreference(preference: Preference) {
  memorySnapshot = JSON.stringify(preference);
  try { sessionStorage.setItem(KEY, memorySnapshot); } catch { storageUnavailable = true; }
  window.dispatchEvent(new Event(EVENT));
}

// Blend solid colors with white so every palette has coordinated surfaces.
function tint(hex: string, proportion: number) {
  const channels = [1, 3, 5].map(start => Math.round(255 + (parseInt(hex.slice(start, start + 2), 16) - 255) * proportion));
  return `#${channels.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}
export function paletteVariables(palette: Palette, amount: ColorAmount): CSSProperties {
  const vivid = amount === 'colorful';
  return {
    '--ink': palette.ink,
    '--muted': tint(palette.ink, .77),
    '--subtle': tint(palette.ink, .72),
    '--teal': palette.accent,
    '--teal-deep': palette.accentDeep,
    '--accent-hover': palette.accentDeep,
    '--accent-ink': '#ffffff',
    '--accent-border': tint(palette.accent, .42),
    '--soft': tint(palette.accent, vivid ? .13 : .065),
    '--paper': '#ffffff',
    '--canvas': palette.canvas,
    '--sidebar': vivid ? palette.canvas : tint(palette.accent, .025),
    '--raised': tint(palette.accent, vivid ? .045 : .02),
    '--hover': tint(palette.accent, vivid ? .09 : .04),
    '--border': tint(palette.ink, .14),
    '--control-border': tint(palette.ink, .19),
    '--control-edge': tint(palette.ink, .28),
    '--answer-fill': tint(palette.accent, vivid ? .10 : .05),
    '--secondary': palette.secondary,
    '--secondary-soft': tint(palette.secondary, vivid ? .12 : .055),
    '--tertiary': palette.tertiary,
    '--tertiary-soft': tint(palette.tertiary, vivid ? .12 : .055),
    '--curve-blue': palette.secondary,
  } as CSSProperties;
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('Appearance settings need the workspace provider.');
  return context;
}

export default function AppearanceProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => DEFAULT_SNAPSHOT);
  const preference = parsePreference(snapshot);
  const palette = getPalette(preference.paletteId);
  const calculatorDraftRef = useRef<CalculatorDraft | null>(null);
  const value: Appearance = {
    ...preference, palette, calculatorDraftRef,
    setPalette: id => savePreference({ ...parsePreference(getSnapshot()), paletteId: getPalette(id).id }),
    setColorAmount: colorAmount => savePreference({ ...parsePreference(getSnapshot()), colorAmount }),
    resetAppearance: () => savePreference(DEFAULTS),
  };

  return <AppearanceContext.Provider value={value}><div className="appearanceScope" data-palette={palette.id} data-color-amount={preference.colorAmount} style={paletteVariables(palette, preference.colorAmount)}>{children}</div></AppearanceContext.Provider>;
}
