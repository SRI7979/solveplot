import assert from "node:assert/strict";
import { test } from "node:test";
import { learnThemeColors } from "../src/lib/learn-theme";
import { PALETTES } from "../src/lib/workspace-palettes";

function luminance(hex: string) {
  const [r,g,b] = [1,3,5].map(index => parseInt(hex.slice(index,index+2),16) / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return .2126*r+.7152*g+.0722*b;
}
function contrast(a: string,b: string) { const values = [luminance(a),luminance(b)].sort((x,y)=>y-x); return (values[0]+.05)/(values[1]+.05); }

test("every learning palette has readable accent text and primary-action text in both modes", () => {
  for (const palette of PALETTES) for (const dark of [false,true]) {
    const colors=learnThemeColors(palette.id,dark);
    assert.ok(contrast(colors.onAccent,colors.strong)>=4.5,`${palette.id} ${dark?'dark':'light'} primary label`);
    assert.ok(contrast(colors.accent,dark?'#1b2025':'#ffffff')>=4.5,`${palette.id} ${dark?'dark':'light'} accent text`);
  }
});

test("Candy stays green and other palette choices retain their own hue", () => {
  assert.deepEqual(learnThemeColors("candy",false),{accent:"#087f3e",strong:"#20c565",onAccent:"#101814"});
  for (const palette of PALETTES.filter(item=>item.id!=="candy")) assert.equal(learnThemeColors(palette.id,false).accent,palette.accent);
  assert.deepEqual(learnThemeColors("missing-palette",true),learnThemeColors("candy",true));
});
