# Centered hero recording

The hero uses recordings of the localhost:3000 checkout's real `SolverWorkspace`,
upload handler, loading state, explanation and native Desmos calculator. The
cursor drops the image and clicks Solve. SolvePlot inserts all six expressions
automatically. The desktop composition shows question/explanation and calculator
together; the phone composition uses the app's existing Calculator tab.

The October 19 refresh records the current workspace in **Candy, light mode,
Colorful, Modern typography**, with its rounded Raised buttons. Appearance is
explicitly selected and asserted before capture. The recording uses the real
full-width upload screen, compact solved problem, recommended method, and green
answer panel. A visible cursor click opens Expressions before the final close-up.
There are no recording-specific overrides to the app's spacing or typography.

Only the solve response is intercepted with a schema-validated example. Recording
and playback make no paid model requests. Native Desmos evaluates the regression
and confirms `f(10) = 143` in both recordings. After the regression, the demo
defines `f(x) = ax² + bx + c`, then evaluates `f(10)`. Plain `x` is the function
input; the subscripted `x₁` stays in the regression as the data list. This checkout inserts
data lists rather than a native table, and the recording shows that behavior.

The original coast/lighthouse art, centered headline and CTA remain. This refresh
only changes the recordings and posters; the landing-page layout is untouched. The video
has no visible controls or buttons underneath. Both 11-second variants hold the
result before looping directly to the beginning, without an ending fade.

The camera starts close on the problem, pulls back for the drag/drop and real
loading state, then moves into the fitted graph and evaluation. The problem
follows the cursor from the left on desktop; the phone uses a separately framed
composition and its existing Calculator tab. Curved cursor paths use restrained
easing, and the pointer stays the same screen size during camera movement.

Fresh native 3× captures (3600×2250 desktop and 1260×2340 phone) keep the text and
equations sharp during zooms. The files remain under 7 MiB per variant;
only the matching viewport variant loads. The desktop poster shows the complete
workspace, while the phone poster shows the graph and 143. Reduced-motion users
receive a static poster without a video request. Playback pauses outside the
viewport or when the page is hidden.

## Validation

- `checks.json`: requested appearance, actual calculator expressions and result 143, one intercepted
  request per recording, zero live model calls or browser errors
- `hero-checks.json`: complete uninterrupted desktop/phone loop, centered frame,
  no overflow/controls/buttons, decoded/dropped frame counts, no ending fade,
  and reduced-motion poster
- `hero-desktop.png` / `hero-phone.png`: finished composition
- Film and recording frame captures: drag, real loading spinner, explanation,
  regression and final answer
- ESLint, type checking, production build, and client-secret audit passed.

## Re-record

Requires Playwright, Edge (or `BROWSER_PATH`), and an FFmpeg binary with MJPEG
input and libvpx output (`FFMPEG`). `PLAYWRIGHT_MODULE` can point to an installed
Playwright module outside the application. The fixture route is archived outside
the app so it is never shipped as a production route.

1. Copy `scripts/fixtures/auto-solve-recording/page.tsx.fixture` and
   `recording.module.css` into `src/app/demo-recording/`, naming the page
   `page.tsx`.
2. Run `npx tsx scripts/auto-solve-fixture.ts` and start localhost:3000.
3. Run `node scripts/record-auto-solve.mjs` with the environment paths above.
   Frames/media are staged outside the repository to avoid dev hot reloads
   interrupting the recording. `DEMO_VARIANT=phone` or `desktop` re-records only
   that composition and preserves the other composition's evidence.
4. Remove `src/app/demo-recording/` and run
   `node scripts/check-auto-solve-video.cjs` to review the public hero.
   `DEMO_REVIEW_VARIANT=phone` or `desktop` limits playback checks similarly.

No solver behavior, authentication, backend, or deployment configuration changed.
