import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_APPEARANCE,
  PALETTES,
  appearanceTokens,
  parseAppearance,
} from "../src/lib/appearance";

test("dark color amount changes tinted surfaces without dimming text or selection borders", () => {
  for (const palette of PALETTES) {
    const colorful = appearanceTokens({ ...DEFAULT_APPEARANCE, palette: palette.id }, true);
    const soft = appearanceTokens({ ...DEFAULT_APPEARANCE, palette: palette.id, colorAmount: "soft" }, true);
    for (const token of ["soft", "answer-fill", "secondary-soft", "tertiary-soft", "selection-soft"])
      assert.notEqual(soft[token], colorful[token], `${palette.id}: ${token}`);
    for (const token of ["foreground", "muted", "brand", "selection-accent", "selection-border"])
      assert.equal(soft[token], colorful[token], `${palette.id}: ${token} remains legible`);
  }
});

test("invalid or older session data recovers safely without discarding valid choices", () => {
  for (const value of [
    null,
    "not-json",
    "null",
    "[]",
    '{"palette":-1}',
    '{"palette":6}',
    '{"palette":2.5}',
  ]) {
    assert.deepEqual(parseAppearance(value), DEFAULT_APPEARANCE);
  }
  assert.deepEqual(
    parseAppearance(
      '{"palette":99,"text":"Editorial","button":"Raised","corners":"Soft","oldField":true}',
    ),
    {
      palette: "candy",
      colorAmount: "colorful",
      text: "Editorial",
      button: "Raised",
      corners: "Soft",
    },
  );
});

test("prototype surfaces and legacy text tokens remain distinct in both modes", () => {
  for (const dark of [false, true]) {
    const tokens = appearanceTokens(DEFAULT_APPEARANCE, dark);
    assert.equal(tokens.muted, tokens["muted-foreground"]);
    assert.equal(tokens["ui-muted"], tokens["brand-soft"]);
    assert.notEqual(tokens.muted, tokens["ui-muted"]);
    assert.equal(tokens["surface-raised"], tokens.card);
    assert.equal(tokens["accent-ink"], tokens.brand);
    assert.equal(tokens["primary-foreground"], dark ? "#172027" : "#ffffff");
  }
});

test("legacy palette indices keep their identity and new sessions use Candy", () => {
  assert.equal(parseAppearance(null).palette, "candy");
  assert.equal(parseAppearance('{"palette":2}').palette, "tidal");
  assert.equal(parseAppearance('{"palette":0}').palette, "botanical");
  assert.equal(
    parseAppearance('{"palette":"rose","colorAmount":"soft"}').palette,
    "rose",
  );
  assert.equal(
    parseAppearance('{"palette":"rose","colorAmount":"soft"}').colorAmount,
    "soft",
  );
  assert.equal(parseAppearance('{"palette":"missing"}').palette, "candy");
});
