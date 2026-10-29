import { getPalette } from "./workspace-palettes";

function mixWithWhite(hex: string, amount: number) {
  return "#" + [1, 3, 5].map((index) => Math.round(parseInt(hex.slice(index, index + 2), 16) * (1 - amount) + 255 * amount).toString(16).padStart(2, "0")).join("");
}

function luminance(hex: string) {
  const values = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return values[0] * .2126 + values[1] * .7152 + values[2] * .0722;
}

/** Learn has its own vivid Candy green; other selections use their actual palette. */
export function learnThemeColors(paletteId: string, dark: boolean) {
  const palette = getPalette(paletteId);
  const candy = palette.id === "candy";
  const accent = candy ? dark ? "#46df83" : "#087f3e" : dark ? mixWithWhite(palette.accent, .34) : palette.accent;
  const strong = candy ? dark ? "#25d36d" : "#20c565" : accent;
  const black = "#101814";
  const strongLuminance = luminance(strong);
  const whiteContrast = 1.05 / (strongLuminance + .05);
  const blackContrast = (strongLuminance + .05) / (luminance(black) + .05);
  return { accent, strong, onAccent: whiteContrast >= blackContrast ? "#ffffff" : black };
}
