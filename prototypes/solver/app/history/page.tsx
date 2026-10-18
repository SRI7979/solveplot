'use client';

import { useState } from 'react';
import { ArrowRight, FileText, Search } from 'lucide-react';
import { METHODS } from '../preview-data';
import { useWorkspace } from '../workspace';

export default function HistoryPage() {
  const { historyEntries, openHistoryEntry } = useWorkspace();
  const [query, setQuery] = useState('');
  const filtered = historyEntries.filter(entry => `${entry.title} ${METHODS[entry.method].name} answer 7 sample problem`.toLowerCase().includes(query.trim().toLowerCase()));
  return <main className="wsPage" data-page="history"><div className="wsPageInner">
    <header className="wsPageHeading"><h1>History</h1><p>Your previous questions and their solutions.</p></header>
    <div className="wsLibraryToolbar"><span>This session · {historyEntries.length} {historyEntries.length === 1 ? 'question' : 'questions'}</span><label className="wsSearch"><Search size={16} /><input type="search" aria-label="Search history" placeholder="Search your questions" value={query} onChange={event => setQuery(event.target.value)} /></label></div>
    {filtered.length ? <ul className="wsLibraryList">{filtered.map(entry => <li className="wsLibraryRow" key={entry.id}><button type="button" className="wsLibraryOpen" onClick={() => openHistoryEntry(entry.id)}><span className="wsDocumentIcon"><FileText size={21} strokeWidth={1.6} /></span><span className="wsLibraryTitle"><strong>{entry.title}</strong><small>{METHODS[entry.method].name} · {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'Sample question'}</small></span><span className="wsLibraryAnswer">Answer <strong>7</strong></span><ArrowRight className="wsLibraryArrow" size={19} /></button></li>)}</ul> : <div className="wsEmpty"><Search size={29} strokeWidth={1.5} /><h2>No matching questions</h2><p>Try a different word, or clear the search to see your history.</p><button className="secondaryButton" type="button" onClick={() => setQuery('')}>Clear search</button></div>}
  </div></main>;
}
