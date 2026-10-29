/** Stable Fisher-Yates shuffle. Answer IDs and authored content stay untouched,
 * so grading, saved answers, and content versions survive presentation changes. */
export function lessonChoiceOrder<T>(choices: readonly T[], seed: string): T[] {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index++) state = Math.imul(state ^ seed.charCodeAt(index), 16777619);
  const random = () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const ordered = [...choices];
  for (let index = ordered.length - 1; index > 0; index--) {
    const other = Math.floor(random() * (index + 1));
    [ordered[index], ordered[other]] = [ordered[other], ordered[index]];
  }
  return ordered;
}
