/**
 * Token budget of every solver request, part by part, counted with the
 * o200k_base tokenizer the GPT-5 family uses. Answers "where do the input
 * tokens go, and what would selective strategy retrieval save?" without a
 * model call. Free.
 *
 *   npm run bench:prompt
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { encode } from "gpt-tokenizer/encoding/o200k_base";
import { zodTextFormat } from "openai/helpers/zod";

import { candidatesResponseSchema } from "../src/lib/strategy-selection";
import { explanationSchema } from "../src/lib/solve-cache";
import { loadGoldSolutions } from "../src/lib/gold-solutions";
import { buildCandidatePrompt, CANDIDATE_INSTRUCTIONS, EXPLANATION_INSTRUCTIONS, GOLD_SOLUTION_INSTRUCTIONS } from "../src/lib/solver-instructions";
import { buildRetrievalIndex } from "../src/lib/strategy-retrieval";

const tokens = (text: string) => encode(text).length;
const library = await readFile(path.join(process.cwd(), "src/content/desmos-tricks.md"), "utf8");
const gold = await loadGoldSolutions();
const candidateSchema = JSON.stringify(zodTextFormat(candidatesResponseSchema, "solveplot_candidates"));
const explanationSchemaText = JSON.stringify(zodTextFormat(explanationSchema, "solveplot_explanation"));

// Share the production parser: numbered safety rules are not extra strategies.
const index = buildRetrievalIndex(library);
const strategies = index.strategies.map(item => ({
  title: `${item.number}. ${item.title}`.slice(0, 70),
  technique: item.techniques.join(", ") || "(untagged)", tokens: tokens(item.body),
}));

const parts = {
  "candidate instructions (rules, cost model, syntax)": tokens(CANDIDATE_INSTRUCTIONS),
  "strategy library: policy preamble": tokens(index.preamble),
  "strategy library: numbered strategies": strategies.reduce((sum, item) => sum + item.tokens, 0),
  "strategy library: global safety rules": tokens(index.footer),
  "gold-solution instructions": tokens(GOLD_SOLUTION_INSTRUCTIONS),
  "gold solutions": tokens(gold.prompt),
  "per-request user text": tokens(buildCandidatePrompt()),
  "candidates output schema (structured outputs)": tokens(candidateSchema),
};
const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
console.log("CALL 1 (candidates) input, excluding image tokens and API framing:\n");
console.log("| Part | Tokens | Share |\n|---|---|---|");
for (const [name, count] of Object.entries(parts)) console.log(`| ${name} | ${count} | ${((count / total) * 100).toFixed(1)}% |`);
console.log(`| **total** | **${total}** | |`);
console.log(`\nCALL 2 (explanation): instructions ${tokens(EXPLANATION_INSTRUCTIONS)} + schema ${tokens(explanationSchemaText)} tokens, plus the per-method facts (~300-700).`);

const byTechnique = new Map<string, number>();
for (const item of strategies) byTechnique.set(item.technique, (byTechnique.get(item.technique) ?? 0) + item.tokens);
const largest = [...strategies].sort((a, b) => b.tokens - a.tokens).slice(0, 8);
console.log(`\n${strategies.length} numbered strategies; largest:`);
for (const item of largest) console.log(`  ${String(item.tokens).padStart(5)}  ${item.technique.padEnd(24)} ${item.title}`);
const median = [...strategies].sort((a, b) => a.tokens - b.tokens)[Math.floor(strategies.length / 2)].tokens;
console.log(`\nSelective retrieval estimate: sending the preamble plus 8 relevant strategies (~${8 * median} tokens at the median ${median}) instead of all ${parts["strategy library: numbered strategies"]} would cut call-1 input by ~${Math.max(0, parts["strategy library: numbered strategies"] - 8 * median)} tokens (${(((parts["strategy library: numbered strategies"] - 8 * median) / total) * 100).toFixed(0)}%).`);
