/** Resize the existing official icon without changing its artwork.
 * npm exec tsx scripts/generate-brand-icons.mts [--check]
 * No AI, network requests, credentials, or runtime generation.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import sharp from "sharp";

const check = process.argv.includes("--check");
const source = await readFile("src/app/icon.svg");
const render = (size: number) => sharp(source, { density: 384 }).resize(size, size).png().toBuffer();
const sizes = [16, 32, 48, 64, 96, 192, 512];
const frames = new Map(await Promise.all(sizes.map(async size => [size, await render(size)] as const)));
const icoSizes = [16, 32, 48, 64];
const header = Buffer.alloc(6 + icoSizes.length * 16);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
for (const [index, size] of icoSizes.entries()) {
  const frame = frames.get(size)!;
  const entry = 6 + index * 16;
  header[entry] = size;
  header[entry + 1] = size;
  header.writeUInt16LE(1, entry + 4);
  header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(frame.length, entry + 8);
  header.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
}
const assets: [string, Buffer][] = [
  ["src/app/favicon.ico", Buffer.concat([header, ...icoSizes.map(size => frames.get(size)!)])],
  ...[32, 48, 96, 192, 512].map(size => [`public/icons/solveplot-${size}.png`, frames.get(size)!] as [string, Buffer]),
];
if (!check) await mkdir("public/icons", { recursive: true });
for (const [file, bytes] of assets) {
  if (check) assert.deepEqual(await readFile(file), bytes, `${file} must match the official SVG`);
  else await writeFile(file, bytes);
}
console.log(`${check ? "Verified" : "Generated"} ${assets.length} icon assets from the unchanged official SolvePlot SVG.`);
