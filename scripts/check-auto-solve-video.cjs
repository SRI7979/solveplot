/* eslint-disable @typescript-eslint/no-require-imports */
// Public hero review only. Real solve/tutor requests are blocked and counted.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("node:fs/promises");
const assert = require("node:assert/strict");
const path = require("node:path");
const origin = process.env.DEMO_ORIGIN || "http://localhost:3000";
const output = "docs/auto-solve-video-review";

(async () => {
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", headless: true });
  const evidence = [];
  try {
    for (const [variant, width, height] of [["desktop", 1363, 936], ["phone", 390, 844]]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "no-preference" });
      const errors = [];
      const paid = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/api/**", async route => {
        if (/\/api\/(solve|tutor)(\/|\?|$)/.test(route.request().url())) {
          paid.push(route.request().url());
          await route.abort();
        } else await route.continue();
      });
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      const film = page.locator(".auto-solve-film");
      const video = film.locator("video");
      await film.waitFor();
      await film.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const v = document.querySelector(".auto-solve-film video");
        return v && v.readyState >= 2 && Number.isFinite(v.duration) && !v.paused;
      }, { timeout: 30000 });
      const before = await video.evaluate(v => ({ duration: v.duration, muted: v.muted, loop: v.loop, controls: v.controls, src: v.currentSrc }));
      assert.ok(Math.abs(before.duration - 11) < .1, "Video must be approximately 11 seconds");
      assert.equal(before.muted, true);
      assert.equal(before.loop, true);
      assert.equal(before.controls, false);
      assert.ok(before.src.includes(`auto-solve-${variant}.webm`));
      assert.equal(await film.locator("button").count(), 0, "No buttons on/below film");
      assert.ok(await film.locator("figcaption").evaluate(el => getComputedStyle(el).clip !== "auto"), "Caption stays accessible but visually hidden");
      // Observe a complete uninterrupted cycle in the browser before seeking.
      await video.evaluate(v => {
        v.currentTime = 0;
        window.__heroPlayback = { previous: 0, wraps: 0, samples: [] };
        v.addEventListener("timeupdate", () => {
          const state = window.__heroPlayback;
          if (state.previous > 9 && v.currentTime < 2) state.wraps++;
          state.previous = v.currentTime;
          state.samples.push(Number(v.currentTime.toFixed(2)));
        });
        return v.play();
      });
      await page.waitForFunction(() => window.__heroPlayback.wraps >= 1, { timeout: 18000 });
      const playback = await page.evaluate(() => ({ wraps: window.__heroPlayback.wraps, samples: window.__heroPlayback.samples.length, last: window.__heroPlayback.previous }));
      for (const time of [1.5, 2.8, 4.4, 8.5]) {
        await video.evaluate(async (v, seconds) => {
          v.pause();
          await new Promise(resolve => { v.addEventListener("seeked", resolve, { once: true }); v.currentTime = seconds; });
        }, time);
        await film.screenshot({ path: path.join(output, `film-${variant}-${String(time).replace(".", "-")}.png`) });
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, "No horizontal overflow");
      const geometry = await film.boundingBox();
      assert.ok(Math.abs((geometry.x + geometry.width / 2) - width / 2) < 2, "Film is centered");
      await page.evaluate(() => scrollTo(0, 0));
      // Re-entering the viewport resumes normal playback. Freeze only this
      // review frame after the uninterrupted-loop check above has completed.
      await video.evaluate(async v => {
        window.__heroScreenshotPause = setInterval(() => v.pause(), 30);
        v.pause();
        await new Promise(resolve => { v.addEventListener("seeked", resolve, { once: true }); v.currentTime = 8.5; });
      });
      await page.locator(".auto-solve-hero").screenshot({ path: path.join(output, `hero-${variant}.png`) });
      assert.deepEqual(errors, []);
      assert.deepEqual(paid, []);
      const reduced = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
      await reduced.goto(origin, { waitUntil: "domcontentloaded" });
      await reduced.waitForFunction(() => {
        const v = document.querySelector(".auto-solve-film video");
        const img = document.querySelector(".auto-solve-poster img");
        return v && getComputedStyle(v).display === "none" && img && img.complete && img.naturalWidth > 0;
      });
      const reducedState = await reduced.locator(".auto-solve-film video").evaluate(v => ({ paused: v.paused, hasSource: !!v.getAttribute("src") }));
      assert.equal(reducedState.paused, true);
      assert.equal(reducedState.hasSource, false);
      evidence.push({ variant, viewport: { width, height }, ...before, uninterruptedPlayback: playback, centered: true, overflow, buttons: 0, reducedMotion: reducedState, paidApiCalls: paid.length, browserErrors: errors });
      console.log(`Reviewed ${variant}: full loop, readable frame captures, centered, reduced-motion poster, zero paid API calls`);
      await reduced.close();
      await page.close();
    }
    await fs.writeFile(path.join(output, "hero-checks.json"), JSON.stringify(evidence, null, 2) + "\n");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
