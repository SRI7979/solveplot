<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Solver evaluation preferences

- Use questions from https://www.bedrockprep.com/ for future solver quality evaluations, retaining source URLs or problem IDs. Keep existing regression/unit tests and user-supplied regression cases.
- Use publicly accessible Bedrock questions first; when coverage is unavailable, publicly available official College Board SAT questions are an approved fallback. Preserve provenance and separate supplied labels from agent-reviewed methods.
- Check that each evaluated solution includes a complete, practical Desmos method, using the real Desmos engine when available. A correct answer alone does not establish a working method.
- Explicitly report cases with no usable Desmos method, distinguishing a discovery/validation failure from a problem where Desmos offers no meaningful benefit. Do not fabricate calculator methods or silently exclude failures from evaluation results.

## Public release notes

- Every production deployment with user-visible changes must include a dated entry in `src/content/product-updates.ts`, shown on the public updates page. Describe the actual shipped behavior in plain language; do not expose private questions, account data, credentials, or internal experiment traces.
- Add or update the entry before deployment, run `npm run release:check`, and verify the public entry after deployment. Keep entries newest first and preserve prior releases. Several changes shipped together may share one entry; a later deployment needs its own entry or a clearly identified addition for that date.
- Release notes are maintained manually as part of the release. Do not claim that future notes will be generated or published automatically. See `docs/releasing.md` for the short workflow. This requirement does not itself authorize a deployment.
