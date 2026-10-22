/* eslint-disable @typescript-eslint/no-require-imports */
// Uses real UI and Desmos; intercepts solve responses so no model calls occur.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const sharp = require("sharp");
const origin = process.env.DEMO_ORIGIN || "http://localhost:3000";

(async () => {
  const fixture = JSON.parse(await fs.readFile("/tmp/solveplot-reliability-fixture.json", "utf8"));
  const image = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="240"><rect width="900" height="240" fill="white"/><g font-family="Arial" font-size="23" fill="#172d35"><text x="24" y="42">g(x)=f(x)/(x+2), where f is quadratic and f(0)=10</text><text x="24" y="90">x: 1, 4</text><text x="24" y="132">g(x): 5, 7</text><text x="24" y="190">What is g(3)?</text></g></svg>')).png().toBuffer();
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH || "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", headless: true });
  const output = "/tmp/solveplot-solver-reliability";
  await fs.mkdir(output, { recursive: true });
  const results = [];
  try {
    for (const scenario of ["cold-and-cached", "first-request-fails", "preflight-reconnects", "manual-reconnect", "phone"]) {
      const page = await browser.newPage({ viewport: scenario === "phone" ? { width: 390, height: 844 } : { width: 1242, height: 892 } });
      const errors = [];
      let scripts = 0, solves = 0, explanations = 0, blocked = scenario === "manual-reconnect";
      page.on("pageerror", error => errors.push(error.message));
      await page.route("**/calculator.js?*", async route => {
        scripts++;
        if (blocked || (scenario === "first-request-fails" && scripts === 1) || (scenario === "preflight-reconnects" && scripts <= 2)) return route.abort();
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()) + ';{const original=Desmos.GraphingCalculator;Desmos.GraphingCalculator=(...args)=>{const c=original(...args);if(!args[0].hasAttribute("data-solveplot-preflight"))window.reliabilityCalculator=c;return c;}}' });
      });
      await page.route("**/api/solve", route => {
        solves++;
        return route.fulfill({ contentType: "application/x-ndjson", body: [
          { type: "methods", ...fixture.payload },
          { type: "solution", methodId: fixture.payload.selectedMethodId, explanation: "cache", solution: fixture.solution },
          { type: "done" },
        ].map(event => JSON.stringify(event)).join("\n") + "\n" });
      });
      await page.route("**/api/solve/preflight", route => route.fulfill({ json: { status: "ready", ...fixture.payload } }));
      await page.route("**/api/solve/method", route => { explanations++; return route.abort(); });
      await page.route("**/api/tutor**", route => route.abort());
      const start = Date.now();
      await page.goto(origin + "/dev-solver-check");
      if (scenario === "manual-reconnect" || scenario === "preflight-reconnects") {
        await page.getByRole("button", { name: "Retry calculator", exact: true }).first().waitFor();
      } else await page.waitForFunction(() => window.reliabilityCalculator);
      const initialStateMs = Date.now() - start;
      await page.locator('#question-image').setInputFiles({ name: "rational-table.png", mimeType: "image/png", buffer: image });
      await page.getByRole("button", { name: "Solve", exact: true }).click();
      if (scenario === "manual-reconnect") {
        const retry = page.locator("#question-panel").getByRole("button", { name: "Retry calculator", exact: true });
        await retry.waitFor();
        assert.equal(solves, 1);
        blocked = false;
        await retry.click();
      }
      await page.getByTestId("answer").waitFor();
      if (scenario === "phone") await page.getByRole("tab", { name: "Calculator", exact: true }).click();
      await page.waitForFunction(() => Math.abs(window.reliabilityCalculator?.expressionAnalysis.solveplot_3?.evaluation?.value - 6.2) < 1e-9);
      const result = await page.evaluate(() => ({ answer: reliabilityCalculator.expressionAnalysis.solveplot_3.evaluation.value, rows: reliabilityCalculator.getExpressions().filter(row => row.latex).map(row => row.latex) }));
      assert.equal(result.rows.length, 3);
      assert.equal(solves, 1, "Reconnect must never repeat the paid solve");
      assert.equal(explanations, 0, "Keep the explanation that already arrived");
      if (scenario === "cold-and-cached") {
        const original = await page.evaluate(() => {
          reliabilityCalculator.setExpression({ id: "student-entry", latex: "y=x+2" });
          reliabilityCalculator.setMathBounds({ left: -3, right: 8, bottom: -2, top: 13 });
          return reliabilityCalculator.getState();
        });
        await page.getByRole("radio", { name: "Dark", exact: true }).click();
        await page.waitForFunction(() => document.documentElement.dataset.theme === "dark");
        const after = await page.evaluate(() => reliabilityCalculator.getState());
        assert.deepEqual(after.expressions.list.map(row => row.latex), original.expressions.list.map(row => row.latex));
        assert.deepEqual(after.graph.viewport, original.graph.viewport);
        await page.getByRole("radio", { name: "Light", exact: true }).click();
        await page.locator('a[href="/"]:visible').first().click();
        await page.waitForURL(origin + "/");
        await page.goBack();
        await page.locator('[data-testid="desmos-calculator"] .dcg-exppanel').waitFor();
        assert.equal(scripts, 1, "Client navigation reuses the loaded API");
      }
      assert.deepEqual(errors, []);
      // Let Desmos finish its short display transition before evidence capture.
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${output}/${scenario}.png` });
      results.push({ scenario, initialStateMs, initialState: scenario === "manual-reconnect" || scenario === "preflight-reconnects" ? "network-failure" : "calculator-ready", scriptRequests: scripts, interceptedSolves: solves, explanationRequests: explanations, realModelCalls: 0, result, browserErrors: errors });
      console.log(`${scenario}: ${initialStateMs} ms to initial state, ${scripts} script request(s), result 6.2, one solve`);
      await page.close();
    }
    await fs.writeFile(`${output}/checks.json`, JSON.stringify(results, null, 2) + "\n");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
