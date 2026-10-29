import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import sharp from "sharp";
import manifest from "../src/app/manifest";
import { BRAND } from "../src/lib/brand";
import { PRODUCT_STRUCTURED_DATA, SITE_METADATA, SITE_ORIGIN, SITE_TITLE } from "../src/lib/site-metadata";

test("favicon contains real square 16/32/48/64 frames rendered from the existing official SVG", async () => {
  const source = await readFile("src/app/icon.svg");
  const ico = await readFile("src/app/favicon.ico");
  assert.equal(ico.readUInt16LE(0), 0);
  assert.equal(ico.readUInt16LE(2), 1);
  assert.equal(ico.readUInt16LE(4), 4);
  for (const [index, size] of [16, 32, 48, 64].entries()) {
    const entry = 6 + index * 16;
    assert.equal(ico[entry], size);
    assert.equal(ico[entry + 1], size);
    const length = ico.readUInt32LE(entry + 8);
    const offset = ico.readUInt32LE(entry + 12);
    assert.ok(offset >= 70 && offset + length <= ico.length);
    const frame = ico.subarray(offset, offset + length);
    const actual = await sharp(frame).raw().toBuffer();
    const expected = await sharp(source, { density: 384 }).resize(size, size).raw().toBuffer();
    assert.deepEqual(actual, expected, "ICO pixels must preserve the official artwork");
  }
});

test("public PNG icons match their dimensions and preserve the official artwork; existing Apple/share images remain valid", async () => {
  const source = await readFile("src/app/icon.svg");
  for (const size of [32, 48, 96, 192, 512]) {
    const file = `public/icons/solveplot-${size}.png`;
    const info = await sharp(file).metadata();
    assert.equal(info.width, size);
    assert.equal(info.height, size);
    assert.deepEqual(await sharp(file).raw().toBuffer(), await sharp(source, { density: 384 }).resize(size, size).raw().toBuffer());
  }
  const apple = await sharp("src/app/apple-icon.png").metadata();
  assert.equal(apple.width, 180);
  assert.equal(apple.height, 180);
  const social = await sharp("public/images/solveplot-share-v2.png").metadata();
  assert.equal(social.width, 1200);
  assert.equal(social.height, 630);
});

test("manifest, homepage metadata and structured data use one consistent brand without unverified social profiles", () => {
  const app = manifest();
  assert.equal(app.name, BRAND.name);
  assert.equal(app.short_name, BRAND.name);
  assert.equal(app.start_url, "/");
  assert.equal(app.display, "browser", "do not imply a new offline/standalone app");
  assert.deepEqual(app.icons?.map(icon => icon.sizes), ["192x192", "512x512"]);
  assert.equal(SITE_METADATA.applicationName, BRAND.name);
  assert.equal(SITE_METADATA.openGraph.siteName, BRAND.name);
  assert.ok(SITE_TITLE.startsWith(`${BRAND.name} |`));
  assert.ok(SITE_METADATA.icons.icon.some(icon => icon.sizes === "96x96" && icon.type === "image/png"));
  const [organization, website] = PRODUCT_STRUCTURED_DATA["@graph"];
  assert.equal(organization.name, BRAND.name);
  assert.equal(website.name, BRAND.name);
  assert.equal(website.alternateName, BRAND.domain);
  assert.equal(website.url, SITE_ORIGIN);
  assert.equal(organization.logo?.url, `${SITE_ORIGIN}/icons/solveplot-512.png`);
  assert.ok(!("sameAs" in organization), "only owner-confirmed profile URLs may be added");
});
