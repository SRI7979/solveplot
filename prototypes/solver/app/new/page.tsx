'use client';

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ImagePlus, Upload, X } from 'lucide-react';
import { useWorkspace } from '../workspace';
import './new.css';

export default function NewProblemPage() {
  const { uploadDraft, setUploadDraft, restoreSample } = useWorkspace();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const addFile = useCallback((file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Choose a PNG, JPG, or WebP image.'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('Choose an image smaller than 10 MB.'); return; }
    setError('');
    setUploadDraft({ name: file.name || 'pasted-question', url: URL.createObjectURL(file) });
  }, [setUploadDraft]);

  useEffect(() => {
    function pasteImage(event: ClipboardEvent) {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input:not([type=file]), textarea, [contenteditable]:not([contenteditable=false]), [role=textbox]')) return;
      const clipboard = event.clipboardData;
      const file = Array.from(clipboard?.files ?? []).find(item => item.type.startsWith('image/'))
        ?? Array.from(clipboard?.items ?? []).find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile();
      if (!file) return;
      event.preventDefault();
      addFile(file);
    }
    window.addEventListener('paste', pasteImage);
    return () => window.removeEventListener('paste', pasteImage);
  }, [addFile]);
  function fileChanged(event: ChangeEvent<HTMLInputElement>) {
    addFile(event.target.files?.[0]);
    event.target.value = '';
  }

  return <main className="wsPage newProblemPage" data-page="new"><div className="newProblemInner">
    <header className="wsPageHeading"><h1>New problem</h1><p>Add a screenshot of your question.</p></header>
    <div className={`newProblemDropzone${dragging ? ' isDragging' : ''}${uploadDraft ? ' hasImage' : ''}`} role="group" aria-label="Question image upload" aria-describedby="image-paste-help" tabIndex={0}
      onDragEnter={event => { event.preventDefault(); dragDepth.current += 1; setDragging(true); }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
      onDragLeave={event => { event.preventDefault(); dragDepth.current -= 1; if (dragDepth.current <= 0) setDragging(false); }}
      onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); addFile(event.dataTransfer.files[0]); }}>
      {uploadDraft ? <><Image src={uploadDraft.url} alt="Your uploaded question preview" width={1000} height={700} unoptimized /><div className="newProblemFile"><span>{uploadDraft.name}</span><button type="button" className="iconButton" aria-label="Remove uploaded image" onClick={() => setUploadDraft(null)}><X size={18} /></button></div></> : <><span className="newProblemUploadIcon"><Upload size={27} strokeWidth={1.8} /></span><h2>Drop your question here</h2><p>A clear screenshot works best.</p></>}
      <button type="button" className="secondaryButton" onClick={() => fileRef.current?.click()}><ImagePlus size={17} /> {uploadDraft ? 'Replace image' : 'Choose image'}</button>
      <span className="newProblemFormats">PNG, JPG, or WebP · up to 10 MB</span>
      <span className="newProblemFormats" id="image-paste-help">Paste an image with ⌘V or Ctrl+V</span>
      <input hidden ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={fileChanged} aria-label="Upload question image" />
    </div>
    {error && <p className="uploadError" role="alert">{error}</p>}
    <p className="newProblemNote">This is a design preview. Images stay in this tab; use the sample below to explore a completed solution.</p>
    <section className="newProblemSample" aria-labelledby="sample-heading"><div><h2 id="sample-heading">Try a sample question</h2><p>Find where a quadratic and a line intersect.</p></div><button type="button" className="primaryButton" onClick={() => restoreSample()}>Open sample <ArrowRight size={18} /></button></section>
    <p className="newProblemHistoryNote">Your previous solution is saved in <Link href="/history">History</Link>.</p>
  </div></main>;
}
