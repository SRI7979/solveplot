/**
 * Conservative, deterministic floors for student setup work. This complements
 * (rather than replaces) the model's reported costs: a short row isn't free
 * if the student must invent an input before Desmos can do anything.
 *
 * Keep the detector narrow. Derived constants and invalid rows are handled by
 * existing validators; this only prices extra typing and chosen scalar inputs.
 */
export type StudentRow = { latex: string };

function sourceContainsNumber(source: string, value: string): boolean {
  // Match full numbers, not "1" inside "10" or "2026".
  const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^0-9.])${escaped}(?=$|[^0-9.])`).test(source);
}

export function measuredSetupFloor(
  rows: readonly StudentRow[],
  question: string,
  choices: readonly { label: string; text: string }[] | null,
): number {
  const supplied = [question, ...(choices ?? []).map((choice) => choice.text)].join(" ");
  let inventedScalars = 0;
  let unwieldyRows = 0;
  for (const { latex } of rows) {
    const typed = latex.replace(/\\left|\\right|\s/g, "");
    // Only literal assignments count here. A fitted coefficient, expression,
    // or coordinate read from Desmos is NOT assumed to be student-invented.
    const chosen = typed.match(/^[a-zA-Z](?:_\{?\d+\}?)?=(-?(?:\d+(?:\.\d+)?))$/);
    if (chosen && !sourceContainsNumber(supplied, chosen[1])) inventedScalars += 1;
    if (typed.length > 170) unwieldyRows += 2;
    else if (typed.length > 100) unwieldyRows += 1;
  }
  // A single chosen test value has a real setup cost but is not forbidden;
  // penalize excessive expansion without making character count dominant.
  return Math.min(4, inventedScalars * 2 + unwieldyRows);
}
