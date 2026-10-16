'use client';

import { useState } from 'react';
import { ArrowRight, Bookmark, Search, X } from 'lucide-react';
import { METHODS } from '../preview-data';
import { useWorkspace } from '../workspace';

export default function SavedPage() {
  const { savedMethods, toggleSavedMethod, restoreSample } = useWorkspace();
  const [query, setQuery] = useState('');
  const filtered = savedMethods.filter(method => `${METHODS[method].name} ${METHODS[method].summary}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <main className="wsPage" data-page="saved"><div className="wsPageInner">
    <header className="wsPageHeading"><h1>Saved tricks</h1><p>Reopen a saved method with its original question.</p></header>
    {savedMethods.length > 0 ? <><div className="wsLibraryToolbar"><span>{savedMethods.length} saved {savedMethods.length === 1 ? 'method' : 'methods'}</span><label className="wsSearch"><Search size={16} /><input type="search" aria-label="Search saved tricks" placeholder="Search your saved tricks" value={query} onChange={event => setQuery(event.target.value)} /></label></div>{filtered.length > 0 ? <ul className="wsLibraryList">{filtered.map(method => <li className="wsLibraryRow" key={method}><button type="button" className="wsLibraryOpen" onClick={() => restoreSample(method)}><span className="wsDocumentIcon"><Bookmark size={20} strokeWidth={1.6} /></span><span className="wsLibraryTitle"><strong>{METHODS[method].name}</strong><small>{method === 'difference' ? 'Find intersections with one expression' : 'Read where the two original graphs meet'}</small></span><ArrowRight className="wsLibraryArrow" size={18} /></button><button className="wsRemoveBookmark" type="button" aria-label={`Remove ${METHODS[method].name} bookmark`} title="Remove bookmark" onClick={() => toggleSavedMethod(method)}><X size={17} /></button></li>)}</ul> : <div className="wsEmpty"><Search size={29} strokeWidth={1.5} /><h2>No matching tricks</h2><p>Try a different word, or clear your search.</p><button className="secondaryButton" type="button" onClick={() => setQuery('')}>Clear search</button></div>}</> : <div className="wsEmpty"><Bookmark size={31} strokeWidth={1.5} /><h2>Save a method for next time</h2><p>Choose “Save this trick” beneath a solution. You can return to it here whenever you need it.</p><button type="button" className="secondaryButton" onClick={() => restoreSample()}>Open the sample solution <ArrowRight size={16} /></button></div>}
  </div></main>;
}
