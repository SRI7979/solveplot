import { PRODUCT_UPDATES } from "../src/content/product-updates";

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args[0] && !args[0].startsWith("--date="))) {
    throw new Error("Usage: npm run release:check -- [--date=YYYY-MM-DD]");
  }
  const releaseDate = args[0]?.slice("--date=".length) ?? new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (!validDate(releaseDate)) throw new Error(`Invalid release date: ${releaseDate}`);
  if (PRODUCT_UPDATES.length === 0) throw new Error("Add a public update before releasing.");

  const ids = new Set<string>();
  let previousDate = releaseDate;
  for (const entry of PRODUCT_UPDATES) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id) || entry.id.length > 100) {
      throw new Error(`Invalid update ID: ${entry.id}`);
    }
    if (ids.has(entry.id)) throw new Error(`Duplicate update ID: ${entry.id}`);
    ids.add(entry.id);
    if (!validDate(entry.date)) throw new Error(`Invalid date for ${entry.id}: ${entry.date}`);
    if (entry.date > releaseDate) throw new Error(`Future-dated update: ${entry.id}`);
    if (entry.date > previousDate) throw new Error("Keep public updates newest first.");
    previousDate = entry.date;
    if (!entry.title.trim() || !entry.summary.trim() || entry.changes.length === 0 || entry.changes.some((change) => !change.trim())) {
      throw new Error(`Update ${entry.id} needs a title, summary, and specific changes.`);
    }
  }
  if (PRODUCT_UPDATES[0].date !== releaseDate) {
    throw new Error(`Add an update for ${releaseDate}; the latest entry is ${PRODUCT_UPDATES[0].date}.`);
  }
  console.log(`Public update check passed: ${PRODUCT_UPDATES.length} entries; latest release ${releaseDate}. Review the wording before deployment.`);
} catch (error) {
  console.error(`Release notes: ${error instanceof Error ? error.message : "Validation failed."}`);
  process.exitCode = 1;
}
