/** A bounded AA-consistency check. Does not generate a solution or calculator rows.
 * Requires explicit interior point orders and a named equal-angle pair in the transcription.
 * Unsupported wording, units, ambiguous/inconsistent data, and rounded questions are declined.
 */
export function similarityReadoutConflict(question: string, claimed: number): string | null {
  if (!Number.isFinite(claimed) || /\b(?:not|unless|approximately|nearest|rounded|estimate|overlap|cm|inches|feet|meters)\b/i.test(question)) return null;
  const crossing = question.match(/\b[Ss]egments ([A-Z])([A-Z]) and ([A-Z])([A-Z]) (?:meet|intersect|cross) at ([A-Z])\b/);
  const equal = question.match(/\b(?:[Mm]arked )?angles ([A-Z]{3}) and ([A-Z]{3}) are (?:equal|congruent)\b/);
  const target = question.match(/\b(?:[Ff]ind|[Ww]hat is the length of) (?:the length of )?([A-Z]{2})\b/)?.[1];
  if (!crossing || !equal || !target || [...question.matchAll(/\bare (?:equal|congruent)\b/g)].length !== 1) return null;
  const [, a, b, c, d, p] = crossing;
  if (new Set([a, b, c, d, p]).size !== 5) return null;
  const ordered = (left: string, right: string) => new RegExp(`\\b${left},\\s*${p},\\s*${right} in that order\\b`).test(question) ||
    new RegExp(`\\b${right},\\s*${p},\\s*${left} in that order\\b`).test(question);
  if (!ordered(a, b) || !ordered(c, d)) return null;
  const first = [...equal[1]], second = [...equal[2]];
  const endpoints = new Set([a, b, c, d]);
  if (first[1] === p || second[1] === p || !first.includes(p) || !second.includes(p) ||
      new Set(first).size !== 3 || new Set(second).size !== 3 ||
      [...first, ...second].some(v => v !== p && !endpoints.has(v)) ||
      first.filter(v => second.includes(v)).join("") !== p) return null;
  const opposite = new Map([[a, b], [b, a], [c, d], [d, c]]);
  // The angles at P must use opposite rays, not a common ray or adjacent angle.
  if (!first.filter(v => v !== p).every(v => second.includes(opposite.get(v)!))) return null;
  const otherFirst = first.find(v => v !== p && v !== first[1])!;
  const otherSecond = second.find(v => v !== p && v !== second[1])!;
  const correspondence = new Map([[p, p], [first[1], second[1]], [otherFirst, otherSecond]]);
  const side = (u: string, v: string) => [u, v].sort().join("");
  const pairs = [[p, first[1]], [p, otherFirst], [first[1], otherFirst]].map(([u, v]) => [side(u, v), side(correspondence.get(u)!, correspondence.get(v)!)]);
  const lengths = new Map<string, number>();
  for (const match of question.matchAll(/\b([A-Z])([A-Z])\s*=\s*(\d+(?:\.\d+)?)(?=\s*(?:[,.;?]|and\b|$))/g)) {
    const name = side(match[1], match[2]), value = Number(match[3]);
    if (!(value > 0) || value > 1e6 || (lengths.has(name) && lengths.get(name) !== value)) return null;
    lengths.set(name, value);
  }
  const requested = side(target[0], target[1]);
  if (lengths.has(requested)) return null;
  const targetPair = pairs.find(pair => pair.includes(requested));
  const scales = pairs.filter(([u, v]) => lengths.has(u) && lengths.has(v));
  if (!targetPair || !scales.length) return null;
  const otherSide = targetPair.find(v => v !== requested)!;
  if (!lengths.has(otherSide)) return null;
  const [u, v] = scales[0], left = lengths.get(u)!, right = lengths.get(v)!;
  if (scales.some(([s, t]) => Math.abs(lengths.get(s)! * right - lengths.get(t)! * left) > 1e-8)) return null;
  const leftTarget = targetPair[0] === requested ? claimed : lengths.get(otherSide)!;
  const rightTarget = targetPair[1] === requested ? claimed : lengths.get(otherSide)!;
  const residual = leftTarget * right - rightTarget * left;
  const scale = Math.max(1, Math.abs(leftTarget * right), Math.abs(rightTarget * left));
  if (Math.abs(residual) <= 1e-7 * scale) return null;
  return `The stated point order gives vertical angles at ${p}; together with ${equal[1]} = ${equal[2]}, AA fixes ${[...correspondence].map(([x, y]) => `${x}↔${y}`).join(", ")}. Corresponding sides require ${targetPair[0]}/${targetPair[1]} = ${u}/${v} = ${left}/${right}. The claimed ${target}=${claimed} violates this proportion. Check the correspondence before solving; a graph of a different ratio cannot establish the requested length.`;
}
