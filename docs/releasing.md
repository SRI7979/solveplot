# Releasing SolvePlot

Every production release with changes people can see or use needs a public update entry. The source is `src/content/product-updates.ts`; the website renders that file. Keep previous entries so visitors can see what changed over time.

1. Before deploying, add a new entry at the top with a unique ID, the release date in `YYYY-MM-DD` format, a short title, and specific changes that are ready to ship. Describe what people can do or what was fixed. Group changes shipped together; do not promise work that is still planned.
2. Run `npm run release:check` alongside the checks appropriate to the changes. It checks the release-note structure and expects an entry for the current date in America/New_York, matching the release calendar. For a deliberately different release date, use `npm run release:check -- --date=YYYY-MM-DD`. Review the actual wording too: a structural check cannot tell whether a feature works or whether a note covers every change.
3. Deploy only when authorized. Verify the live public updates page and the changed features. If a deployment fails, correct its status before calling the changes shipped. If a release is rolled back, add a factual correction rather than removing history.

The notes and check are a manual release step. They do not generate future entries, deploy the app, or confirm that a release succeeded. Do not include private problem text, account information, secrets, or internal benchmark captures in public entries.

## Update pages and visuals

Each entry has a `visual` in addition to its text. `src/app/updates/update-visual.tsx` maps that value to an app screenshot or an evidence-based chart. Screenshots live in `public/images/updates/`; crop out account names, email addresses, and private questions. Include descriptive alternative text, real image dimensions, and a caption that distinguishes current screenshots from historical captures. Never present an illustration or a staged view as proof of solver accuracy.

The archive is `/updates`. Each entry also receives `/updates/<id>` and a sitemap entry, so its ID must remain stable after publication. Preserve old notes; explain superseding behavior in a new entry. Check the archive and individual pages on a phone-sized viewport, open the full-size images, and retain the limitations beside any benchmark graphic.
