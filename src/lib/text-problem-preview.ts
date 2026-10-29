import sharp from "sharp";
import { typedProblemRequestSchema } from "./text-problem";

/** A thumbnail for the existing image-backed History schema. The exact typed
 * source is stored separately in the solution JSON and shown as selectable text,
 * and the solver receives text directly, never this preview. */
export async function textProblemPreview(problem: string): Promise<Buffer> {
  const text = typedProblemRequestSchema.parse({ problem }).problem;
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    const characters = Array.from(paragraph);
    if (!characters.length) lines.push("");
    while (characters.length) lines.push(characters.splice(0, 84).join(""));
  }
  const displayed = lines.slice(0, 80);
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&apos;",
        })[c]!,
    );
  const height = 110 + displayed.length * 24;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="${height}"><rect width="100%" height="100%" fill="#fff"/><text x="32" y="35" font-family="sans-serif" font-size="13" fill="#62717c">TYPED QUESTION</text><g font-family="monospace" font-size="16" fill="#25282d" xml:space="preserve">${displayed.map((line, i) => `<text x="32" y="${74 + i * 24}">${escape(line)}</text>`).join("")}</g>${lines.length > displayed.length ? `<text x="32" y="${height - 14}" font-family="sans-serif" font-size="12" fill="#62717c">Full text is available in the saved problem.</text>` : ""}</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
