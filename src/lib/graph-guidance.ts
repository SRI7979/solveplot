import type { Solution } from "./solver-schema";

/** Repair an obsolete instruction, without changing the method, rows, or answer. */
export function repairGraphGuidance(solution: Solution): Solution {
  if (
    solution.status !== "solved" ||
    !solution.readAnswer ||
    !solution.expressions.length
  )
    return solution;
  const command = solution.readAnswer.match(
    /\b(?:type|enter)\s+[`"']?([xy])_intercept\b/i,
  );
  if (!command) return solution;
  const axis = command[1].toLowerCase();
  // A method can explicitly define its own variable. That is not a built-in-command mistake.
  if (
    solution.expressions.some((row) =>
      new RegExp(`^\\s*${axis}_(?:\\{intercept\\}|intercept)\\s*=`).test(
        row.latex,
      ),
    )
  )
    return solution;
  const row = solution.result?.row ?? 1;
  if (row < 1 || row > solution.expressions.length) return solution;
  return {
    ...solution,
    readAnswer: `Click the curve on line ${row}, then click the ${axis}-intercept requested in the question. Read the ${axis}-coordinate shown in the point label.`,
  };
}
