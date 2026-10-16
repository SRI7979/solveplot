'use client';

import { useState, type CSSProperties } from 'react';
import { Bookmark, Check, RotateCcw } from 'lucide-react';
import { useAppearance } from '../appearance';
import { PALETTES, type Palette } from '../palettes';
import './settings.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'cool', label: 'Cool' },
  { id: 'warm', label: 'Warm' },
  { id: 'neutral', label: 'Neutral' },
] as const;

type Filter = (typeof FILTERS)[number]['id'];

function PaletteSwatches({ palette }: { palette: Palette }) {
  return <span className="appearanceSwatches" aria-hidden="true">
    <span style={{ background: palette.accent }} />
    <span style={{ background: palette.secondary }} />
    <span style={{ background: palette.tertiary }} />
    <span style={{ background: palette.canvas }} />
  </span>;
}

function WorkspacePreview() {
  const { palette } = useAppearance();
  const curve = Array.from({ length: 111 }, (_, index) => {
    const x = -2 + index / 10;
    const y = x * x - 6 * x - 7;
    return `${index === 0 ? 'M' : 'L'}${((x + 2) * 17).toFixed(2)},${(152 - (y + 20) * 3).toFixed(2)}`;
  }).join(' ');

  return <aside className="appearancePreview" aria-label="Workspace color preview">
    <div className="appearancePreviewHeading"><h2>Preview</h2><span>{palette.name}</span></div>
    <div className="appearanceMiniApp">
      <div className="appearanceMiniHeader"><strong>Solver</strong><Bookmark size={14} /></div>
      <div className="appearanceMiniBody">
        <p className="appearanceMiniLabel">Recommended method</p>
        <h3>Read the intercepts</h3>
        <p>Subtract the equations, then find where the graph crosses the x-axis.</p>
        <div className="appearanceMiniInput"><span>1</span><code>y = x² − 4x + 1 − (2x + 8)</code></div>
        <div className="appearanceMiniGraph">
          <svg viewBox="0 0 190 170" role="img" aria-label="Graph of y equals x squared minus 6x minus 7, with the positive intercept at 7, 0">
            <defs><clipPath id="settings-preview-clip"><rect width="190" height="170" /></clipPath></defs>
            <g className="appearanceGraphGrid">
              {[0, 34, 68, 102, 136, 170].map(x => <line key={`v${x}`} x1={x} x2={x} y1="0" y2="170" />)}
              {[2, 32, 62, 92, 122, 152].map(y => <line key={`h${y}`} y1={y} y2={y} x1="0" x2="190" />)}
            </g>
            <g className="appearanceGraphAxes"><line x1="34" x2="34" y1="0" y2="170" /><line y1="92" y2="92" x1="0" x2="190" /></g>
            <path d={curve} clipPath="url(#settings-preview-clip)" className="appearanceGraphCurve" />
            <circle cx="153" cy="92" r="4.5" className="appearanceGraphPoint" />
            <rect x="132" y="65" width="50" height="20" rx="5" className="appearanceGraphLabel" />
            <text x="157" y="79" textAnchor="middle">(7, 0)</text>
          </svg>
        </div>
        <div className="appearanceMiniAnswer"><span><Check size={15} /> Answer</span><strong>7</strong></div>
      </div>
    </div>
    <p className="appearancePreviewNote">Colors update throughout your workspace. Your expressions and graph view are preserved.</p>
  </aside>;
}

export default function SettingsPage() {
  const { palette, paletteId, setPalette, colorAmount, setColorAmount, resetAppearance } = useAppearance();
  const [filter, setFilter] = useState<Filter>('all');
  const [resetMessage, setResetMessage] = useState('');
  const visiblePalettes = PALETTES.filter(item => filter === 'all' || item.family === filter);

  return <main className="wsPage appearancePage"><div className="wsPageInner appearancePageInner">
    <header className="wsPageHeading"><h1>Settings</h1><p>Make the workspace comfortable for you.</p></header>
    <div className="appearanceLayout">
      <section className="appearanceOptions" aria-labelledby="appearance-heading">
        <div className="appearanceSectionHeading"><h2 id="appearance-heading">Appearance</h2><span>Light palettes</span></div>
        <fieldset className="appearanceAmount">
          <legend>Color amount</legend>
          <p>Choose how much color appears in backgrounds and controls.</p>
          <div className="appearanceAmountChoices">
            {(['soft', 'colorful'] as const).map(amount => <label key={amount} className="appearanceAmountChoice" data-selected={colorAmount === amount}>
              <input type="radio" name="color-amount" value={amount} checked={colorAmount === amount} onChange={() => { setColorAmount(amount); setResetMessage(''); }} />
              <span className="appearanceAmountDot" data-amount={amount} aria-hidden="true" />
              {amount === 'soft' ? 'Soft' : 'Colorful'}
              <Check size={14} aria-hidden="true" />
            </label>)}
          </div>
        </fieldset>

        <fieldset className="appearancePaletteField">
          <legend>Color palette</legend>
          <div className="appearancePaletteToolbar"><p>{PALETTES.length} palettes · <strong>{palette.name}</strong> selected</p><div className="appearanceFilters" role="group" aria-label="Filter palettes">
            {FILTERS.map(item => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
          </div></div>
          <div className="appearancePaletteGrid">
            {visiblePalettes.map(item => <label key={item.id} className="appearancePaletteChoice" data-selected={paletteId === item.id} style={{ '--swatch-accent': item.accent } as CSSProperties}>
              <input type="radio" name="color-palette" value={item.id} checked={paletteId === item.id} onChange={() => { setPalette(item.id); setResetMessage(''); }} aria-label={`${item.name}: ${item.description}`} />
              <PaletteSwatches palette={item} />
              <span className="appearancePaletteName">{item.name}<span className="appearancePaletteCheck" aria-hidden="true">{paletteId === item.id && <Check size={13} strokeWidth={2.5} />}</span></span>
              <span className="appearancePaletteDescription">{item.description}</span>
            </label>)}
          </div>
        </fieldset>
        <footer className="appearanceFooter"><div><p>Saved for this browser tab.</p><span role="status">{resetMessage}</span></div><button type="button" className="appearanceReset" onClick={() => { resetAppearance(); setFilter('all'); setResetMessage('Tidal and Colorful restored.'); }}><RotateCcw size={14} /> Reset to default</button></footer>
      </section>
      <WorkspacePreview />
    </div>
  </div></main>;
}
