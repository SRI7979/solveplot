/** Search cues, not geometry proofs. Never infer correspondence from a picture's shape. */
export function hasSimilarityCue(question: string): boolean {
  return /\bsimilar (?:triangles|figures|polygons)\b|\btriangles?\b[^.!?]*\bsimilar\b|\bcorresponding sides\b|\bangles?\b[^.!?]*(?:equal|congruent)|\bshadow\b[^.!?]*\b(?:tree|pole|height)\b|\b(?:trees?|poles?)\b[\s\S]*\bshadow\b/i.test(question);
}

export function hasKnownRootCue(question: string): boolean {
  return /\b(?:roots?|zeros?|solutions?)\b/i.test(question) && /\b(?:constants?|coefficients?|parameters?)\b/i.test(question) && /[a-wz]\s*x\s*(?:\^\s*\{?2|²)/i.test(question);
}

/** Only explicit named geometric objects; ordinary uppercase prose and choice letters are excluded. */
export function geometryLabels(text: string): Set<string> {
  const labels = new Set<string>();
  const normalized = text.replace(/\\(?:triangle|angle)/g, " angle ").replace(/[∠△]/g, " angle ");
  const pattern = /\b(?:[Tt]riangles?|[Aa]ngles?|[Ss]egments?|[Ll]ines?|[Ss]ides?|[Vv]ertex|[Vv]ertices|[Pp]oints?|[Aa]rcs?|[Cc]enter)\s+([A-Z]{1,3})(?![A-Za-z])/g;
  for (const match of normalized.matchAll(pattern)) for (const letter of match[1]) labels.add(letter);
  // Also read further labels in "triangles ABC and DEF", or "points A, B, and C".
  for (const match of normalized.matchAll(/\b(?:[Tt]riangles?|[Aa]ngles?|[Ss]egments?|[Pp]oints?|[Ss]ides?)\s+([A-Z]{1,3}(?:(?:\s*,\s*(?:and\s+)?|\s+and\s+)[A-Z]{1,3})+)(?![A-Za-z])/g)) {
    for (const token of match[1].match(/[A-Z]{1,3}/g) ?? []) for (const letter of token) labels.add(letter);
  }
  return labels;
}

/** A narrow factual inconsistency, not a general proof/diagram interpretation engine. */
export function unknownGeometryLabels(question: string, rows: readonly { latex: string }[], prose: string): string[] {
  const given = geometryLabels(question);
  if (given.size < 3) return []; // No reliable named-figure inventory to compare.
  for (const row of rows) {
    const defined = row.latex.match(/^\s*([A-Z])\s*=\s*(?:\\left)?\([^,]+,[^,]+\)(?:\\right)?\s*$/);
    if (defined) given.add(defined[1]);
  }
  // A genuinely introduced auxiliary point must say how it is constructed.
  for (const match of prose.matchAll(/\b(?:Let|let|Define|define|Introduce|introduce)\s+(?:point\s+)?([A-Z])\s+(?:be|as)\s+(?:the\s+)?(?:midpoint|intersection|foot|projection)\b/g)) given.add(match[1]);
  return [...geometryLabels(prose)].filter(label => !given.has(label));
}
