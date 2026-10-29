/**
 * Replays recorded benchmark runs through the CURRENT server-side validation
 * and selection, without any model call: every run of `npm run bench:solver`
 * saves its raw candidate outputs, so a change to rejection rules, cost weights,
 * or ranking can be measured on the same model outputs before spending
 * credits on a new live run. Free.
 *
 *   npm run bench:replay -- <recorded-label> [--out=<label>]
 *
 * Reports how many recorded defaults change and how the strategy metrics
 * move. A recorded Desmos rescue can be replayed from its saved second output;
 * a newly triggered rescue still needs a model call and is counted instead.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { answerMatches } from "./classifiers";
import { loadCases } from "./benchmark/load-cases";
import { methodRecord } from "./benchmark/record";
import { metricsTable } from "./benchmark/report";
import { classifyStrategy, summarizeByGroup, type RunRecord } from "./benchmark/score";
import { validateCandidatesResponse } from "../src/lib/solve-output";
import { repairIntegerFactorExtremum, repairQuadraticRationalIntercept } from "../src/lib/semantic-repairs";
import { repairDesmosNativePlans } from "../src/lib/desmos-native-plans";
import { desmosRescueTarget, mergeSelections, selectMethods, StrategySelectionError } from "../src/lib/strategy-selection";

const args = process.argv.slice(2);
const label = args.find((arg) => !arg.startsWith("--"));
if (!label) throw new Error("Pass the label of a recorded benchmark run (evals/results/<label>.json).");
const outLabel = args.find((arg) => arg.startsWith("--out="))?.slice(6) ?? `${label}-replayed`;

const recorded = JSON.parse(await readFile(path.join(process.cwd(), "evals/results", `${label}.json`), "utf8"));
if (recorded.format !== 2) throw new Error(`${label} predates raw-output recording; replay needs a run from npm run bench:solver.`);
const cases = new Map((await loadCases()).map((item) => [item.id, item]));

let changed = 0;
let wouldRescue = 0;
let unreplayable = 0;
const transitions: string[] = [];
const replayed: RunRecord[] = (recorded.records as RunRecord[]).map((record) => {
  const item = cases.get(record.caseId);
  const outputs = (record.candidateOutputs ?? []) as { output?: unknown; rejection?: unknown }[];
  const accepted = outputs.filter((candidate) => candidate.output !== undefined && !candidate.rejection);
  if (!item || !record.ok || record.clarification || accepted.length === 0) {
    unreplayable += 1;
    return record;
  }
  try {
    const parse = (output: unknown) =>
      validateCandidatesResponse({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }] }).parsed;
    // A failed first validation was retried; the last accepted main output is
    // the one the live pipeline selected. A successful recorded rescue has a
    // second accepted output that must be merged with the primary selection.
    const hadRescue = (record.rescue === "applied" || record.rescue === "kept") && accepted.length > 1;
    const primaryOutput = hadRescue ? accepted[accepted.length - 2] : accepted[accepted.length - 1];
    const primary = parse(primaryOutput.output);
    let selection = selectMethods(repairDesmosNativePlans(repairIntegerFactorExtremum(repairQuadraticRationalIntercept(primary))));
    const rescueTarget = desmosRescueTarget(selection);
    if (rescueTarget && hadRescue) {
      const secondary = parse(accepted[accepted.length - 1].output);
      const corrected = selectMethods(repairIntegerFactorExtremum(repairQuadraticRationalIntercept({
        ...secondary,
        question: selection.question,
        choices: selection.choices,
      })));
      selection = mergeSelections(selection, corrected);
    } else if (rescueTarget) {
      wouldRescue += 1;
    }
    const eligible = selection.methods.filter((method) => !method.rejected);
    const winner = eligible.find((method) => method.id === selection.winnerId)!;
    if (winner.techniqueId !== record.winner?.techniqueId) {
      changed += 1;
      transitions.push(`${record.caseId}#${record.runIndex + 1}: ${record.winner?.techniqueId} → ${winner.techniqueId}`);
    }
    return {
      ...record,
      winner: methodRecord(winner),
      methods: eligible.map(methodRecord),
      strategyClass: classifyStrategy(winner.techniqueId, item),
      goldListed: eligible.some((method) => (item.gold as string[]).includes(method.techniqueId)),
      answer: winner.answer,
      answerCorrect: answerMatches(winner.answer, item.correctAnswer, item.choices),
      rejections: selection.methods.filter((method) => method.rejected).map((method) => ({ technique: method.techniqueId, rule: method.rejected!.rule })),
    };
  } catch (error) {
    // Every candidate now rejected: the live pipeline would have retried.
    if (error instanceof StrategySelectionError) {
      changed += 1;
      transitions.push(`${record.caseId}#${record.runIndex + 1}: ${record.winner?.techniqueId} → (all rejected: ${error.message.slice(0, 120)})`);
      return { ...record, ok: false, error: `replay: ${error.message}` };
    }
    unreplayable += 1;
    return record;
  }
});

const before = summarizeByGroup(recorded.records);
const after = summarizeByGroup(replayed);
const report = [
  `# Replay of ${label} with the current server code`,
  "",
  `${replayed.length} recorded runs; ${changed} default(s) changed; ${wouldRescue} would trigger a Desmos rescue; ${unreplayable} not replayable. Latency columns are the recorded ones.`,
  "",
  metricsTable(after, before),
  "",
  transitions.length ? `## Changed defaults\n\n${transitions.map((line) => `- ${line}`).join("\n")}` : "No default changed.",
  "",
].join("\n");
await mkdir(path.join(process.cwd(), "evals/reports"), { recursive: true });
await writeFile(path.join(process.cwd(), "evals/reports", `${outLabel}.md`), report);
console.log(report);
