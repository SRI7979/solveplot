'use client';

import { useState } from 'react';
import { ArrowRight, FileText, Search } from 'lucide-react';
import { useWorkspace } from '../workspace';

export default function HistoryPage() {
  const { restoreSample } = useWorkspace();
  const [query, setQuery] = useState('');
  const matches = 'quadratic and line intersections read the x-intercepts answer 7 sample problem'.includes(query.trim().toLowerCase());
  return <main className="wsPage"><div className="wsPageInner">
    <header className="wsPageHeading"><h1>History</h1><p>Your previous questions and their solutions.</p></header>
    <div className="wsLibraryToolbar"><span>This session</span><label className="wsSearch"><Search size={16} /><input type="search" aria-label="Search history" placeholder="Search your questions" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {matches ? <ul className="wsLibraryList"><li className="wsLibraryRow"><button type="button" className="wsLibraryOpen" onClick={() => restoreSample()}><span className="wsDocumentIcon"><FileText size={21} strokeWidth={1.6} /></span><span className="wsLibraryTitle"><strong>Quadratic and line intersections</strong><small>Read the x-intercepts · Sample question</small></span><span className="wsLibraryAnswer">Answer <strong>7</strong></span><ArrowRight className="wsLibraryArrow" size={19} /></button></li></ul> : <div className="wsEmpty"><Search size={29} strokeWidth={1.5} /><h2>No matching questions</h2><p>Try a different word, or clear the search to see your history.</p><button className="secondaryButton" type="button" onClick={() => setQuery('')}>Clear search</button></div>}
  </div></main>;
}
