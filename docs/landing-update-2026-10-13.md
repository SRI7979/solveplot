# Landing page update

The coast artwork and source-derived landing remain in place. This update
applies the user's revised direction to the existing local implementation
(`606d121`), based on `SRI7979/desmo-3f` branch `v0/refine-button-weights`.
The inspected upstream snapshot was `56461e7812e18881a4362f41ae390f1ec608dc18`.
The latest user direction intentionally replaces that source's marketing copy
and FAQ styling rather than claiming an identical copy of the prototype.

## Design references

Reviewed [Cluely's homepage](https://cluely.com/), [Linear's homepage](https://linear.app/),
and [Vercel's homepage](https://vercel.com/). Applied the clear product-section
hierarchy and straightforward question rows seen in these references, especially
Cluely's explicitly titled Frequently asked questions. These are design
inferences, not a claim to use those companies' proprietary components or fonts.
The illustration, Geist body typography, and STIX hero remain from the existing
Desmo/source implementation. No competitor assets or claims are copied.

## Changes

- Native smooth anchor scrolling for How it works, Your workspace, Questions,
  and Back to top. Reduced-motion preferences use immediate scrolling.
- Those navigation links also remain visible on mobile.
- Replaced slogans, uppercase decorative section labels, and numbered FAQ
  labels with descriptive headings and ordinary sentences.
- The showcase heading is “How Desmo solves a problem”, followed by the
  philosophy of minimizing hand work and letting Desmos handle the problem.
- Replaced the large FAQ slogan with four common questions and a link to
  `/faq`, a public page containing twelve questions grouped by topic.
- Native details/summary accordions retain keyboard and no-JavaScript support.
- The landing demo now uses the verified two-root bracket fit, with explicit
  integer rounding. It no longer fixes a=16 or displays the obsolete screenshot.
- Removed the decorative calculator status dots from the showcase.
- `src/lib/brand.ts` holds the shared landing/FAQ/logo/root-title name. Legacy
  route titles and solver copy should be audited at the time of a full rename.
- Google sign-in branding requirements and the external setup steps are in
  [google-sign-in-branding.md](google-sign-in-branding.md). This update does not
  change Google Cloud settings or the working OAuth callback flow.

## Verification

- All 395 offline tests, lint, TypeScript, and the production build passed,
  including static `/faq`.
- Browser checks at 1242×892 and 390×844: all three header links animated
  through intermediate scroll positions and landed at their intended sections.
- Keyboard Enter opens/closes the FAQ; all twelve questions render on `/faq`.
- No horizontal overflow on the landing or FAQ pages, and no browser errors.
- The real Desmos engine evaluated the showcase's rounded sum to exactly 248
  with no expression errors; both roots are fitted and no fixed a slider exists.
- Browser requests made no solve/tutor calls, so testing incurred no model cost.
- Screenshot captures: `/tmp/desmo-landing-review.d6YhwE/` (local review artifacts).

The landing stays light independently of a user's workspace theme, matching the
existing source's marketing page behavior. The solver's Tidal tokens, Appearance
studio, authentication, API routes, and storage behavior are unchanged.

This update is local only; it has not been deployed or merged.
