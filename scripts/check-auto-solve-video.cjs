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
  const onlyVariant = process.env.DEMO_REVIEW_VARIANT;
  const evidence = onlyVariant ? JSON.parse(await fs.readFile(path.join(output, "hero-checks.json"), "utf8")).filter(item => item.variant !== onlyVariant) : [];
  try {
    for (const [variant, width, height] of [["desktop", 1363, 936], ["phone", 390, 844]]) {
      if (onlyVariant && variant !== onlyVariant) continue;
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
      const before = await video.evaluate(v => ({ duration: v.duration, muted: v.muted, loop: v.loop, controls: v.controls, src: v.currentSrc, nativeWidth: v.videoWidth, nativeHeight: v.videoHeight }));
      assert.ok(Math.abs(before.duration - 11) < .1, "Video must be approximately 11 seconds");
      assert.equal(before.muted, true);
      assert.equal(before.loop, true);
      assert.equal(before.controls, false);
      assert.ok(before.src.includes(`auto-solve-${variant}.webm`));
      assert.equal(new URL(before.src).searchParams.get("v"), "5", "Player must request the new recording rather than a cached old video");
      const expectedPixels = variant === "desktop" ? [3600, 2250] : [1260, 2340];
      assert.ok(before.nativeWidth >= expectedPixels[0] && before.nativeHeight >= expectedPixels[1], "Recording must retain native triple-density resolution");
      assert.equal(await film.locator("button").count(), 0, "No buttons on/below film");
      assert.ok(await film.locator("figcaption").evaluate(el => getComputedStyle(el).clip !== "auto"), "Caption stays accessible but visually hidden");
      // Observe a complete uninterrupted cycle in the browser before seeking.
      await video.evaluate(v => {
        v.currentTime = 0;
        const quality = v.getVideoPlaybackQuality?.();
        window.__heroPlayback = { previous: 0, wraps: 0, samples: [], quality: quality ? { total: quality.totalVideoFrames, dropped: quality.droppedVideoFrames } : null };
        v.addEventListener("timeupdate", () => {
          const state = window.__heroPlayback;
          if (state.previous > 9 && v.currentTime < 2) state.wraps++;
          state.previous = v.currentTime;
          state.samples.push(Number(v.currentTime.toFixed(2)));
        });
        return v.play();
      });
      await page.waitForFunction(() => window.__heroPlayback.wraps >= 1, { timeout: 18000 });
      const playback = await video.evaluate(v => {
        const state = window.__heroPlayback;
        const quality = v.getVideoPlaybackQuality?.();
        const frames = quality && state.quality ? quality.totalVideoFrames - state.quality.total : null;
        const dropped = quality && state.quality ? quality.droppedVideoFrames - state.quality.dropped : null;
        return { wraps: state.wraps, samples: state.samples.length, last: state.previous, decodedFrames: frames, droppedFrames: dropped, droppedFrameRatio: frames ? dropped / frames : null };
      });
      const finalSamples = [];
      for (const time of [0, 1.5, 2.6, 3.6, 5.2, 6.85, 9.4, 10.85]) {
        await video.evaluate(async (v, seconds) => {
          v.pause();
          await new Promise(resolve => { v.addEventListener("seeked", resolve, { once: true }); v.currentTime = seconds; });
        }, time);
        await film.screenshot({ path: path.join(output, `film-${variant}-${String(time).replace(".", "-")}.png`) });
        if (time >= 9.4) finalSamples.push(await video.evaluate(v => {
          const canvas = document.createElement("canvas");
          canvas.width = 128;
          canvas.height = 80;
          const context = canvas.getContext("2d");
          context.drawImage(v, 0, 0, canvas.width, canvas.height);
          return Array.from(context.getImageData(0, 0, canvas.width, canvas.height).data);
        }));
      }
      // The completed solution must remain intact through the last frame.
      // A fade or reset overlay changes most pixels; cursor movement does not.
      const finalFrameDifference = finalSamples[0].reduce((sum, value, index) => sum + (index % 4 === 3 ? 0 : Math.abs(value - finalSamples[1][index])), 0) / (128 * 80 * 3);
      assert.ok(finalFrameDifference < 3, `No fade before the direct loop (mean pixel difference ${finalFrameDifference.toFixed(2)})`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, "No horizontal overflow");
      const geometry = await film.boundingBox();
      assert.ok(Math.abs((geometry.x + geometry.width / 2) - width / 2) < 2, "Film is centered");
      await page.evaluate(() => scrollTo(0, 0));
      // Re-entering the viewport resumes normal playback. Freeze only this
      // review frame after the uninterrupted-loop check above has completed.
      await video.evaluate(async (v, time) => {
        window.__heroScreenshotPause = setInterval(() => v.pause(), 30);
        v.pause();
        await new Promise(resolve => { v.addEventListener("seeked", resolve, { once: true }); v.currentTime = time; });
        // Freeze the decoded frame while Playwright expands its screenshot
        // clip to include the full hero. Browser video compositing otherwise
        // occasionally paints the first frame during that large capture.
        const canvas = document.createElement("canvas");
        canvas.width = v.videoWidth;
        canvas.height = v.videoHeight;
        canvas.getContext("2d").drawImage(v, 0, 0);
        const frame = document.createElement("img");
        frame.src = canvas.toDataURL("image/png");
        frame.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover";
        v.parentElement.append(frame);
        await frame.decode();
      }, variant === "desktop" ? 6.85 : 9.4);
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
      evidence.push({ variant, viewport: { width, height }, ...before, uninterruptedPlayback: playback, finalFrameDifference, noEndFade: true, centered: true, overflow, buttons: 0, reducedMotion: reducedState, paidApiCalls: paid.length, browserErrors: errors });
      console.log(`Reviewed ${variant}: full loop, readable frame captures, centered, reduced-motion poster, zero paid API calls`);
      await reduced.close();
      await page.close();
    }
    await fs.writeFile(path.join(output, "hero-checks.json"), JSON.stringify(evidence, null, 2) + "\n");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
