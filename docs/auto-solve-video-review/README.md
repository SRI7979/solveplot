# Centered hero recording

The hero uses recordings of the localhost:3000 checkout's real `SolverWorkspace`,
upload handler, loading state, explanation and native Desmos calculator. The
cursor drops the image and clicks Solve. Desmo inserts all six expressions
automatically. The desktop composition shows question/explanation and calculator
together; the phone composition uses the app's existing Calculator tab.

Only the solve response is intercepted with a schema-validated example. Recording
and playback make no paid model requests. Native Desmos evaluates the regression
and confirms `a(10)^2+b(10)+c = 143` in both recordings. This checkout inserts
data lists rather than a native table, and the recording shows that behavior.

The original coast/lighthouse art, centered headline and CTA remain. Only the
hero changed; other landing sections are left for the next update. The video
has no visible controls or buttons underneath. Both 11-second variants crossfade
back to their initial state, with a completed-solution poster and a static
reduced-motion fallback. Media totals approximately 1.4 MB; the player pauses
outside the viewport or when the page is hidden.

## Validation

- `checks.json`: actual calculator expressions and result 143, one intercepted
  request per recording, zero live model calls or browser errors
- `hero-checks.json`: complete uninterrupted desktop/phone loop, centered frame,
  no overflow/controls/buttons, and reduced-motion poster
- `hero-desktop.png` / `hero-phone.png`: finished composition
- Film and recording frame captures: drag, real loading spinner, explanation,
  regression and final answer
- ESLint, type checking, production build, and all 404 tests passed.

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
   interrupting the recording.
4. Remove `src/app/demo-recording/` and run
   `node scripts/check-auto-solve-video.cjs` to review the public hero.

No solver behavior, authentication, backend, or deployment configuration changed.
