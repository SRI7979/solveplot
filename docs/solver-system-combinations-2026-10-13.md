# Systems in their own unknowns: the bracket regression, not arithmetic

The user reported a solve where Desmo recommended a math way for
`7x + 4y + 8z = 61`, `4x + y + 5z = 37`, asking for `x + y + z`. It chose Direct
arithmetic: scale both equations by 1/3 and subtract. The user's Desmos way,
now gold 016, is:

```
[7x_{1}+4y_{1}+8z,4x_{1}+y_{1}+5z]~[61,37]
x_{1}+y_{1}+z        → 8
```

## Why the math way won

Selection already ranks every Desmos way ahead of every math way. A math way
wins only when no Desmos way survives. Three gaps lined up:

1. **Rule 2 rejected the method.** `findRegressionDeterminacyViolations`
   rejected any fit with more unknowns than equations (3 vs 2). It never checked
   whether the value the plan reads is fixed, although PHILOSOPHY.md allows
   that case once it is checked. Only the product case (gold 009) was handled.
2. **The library didn't teach it.** Bracket regression was taught for
   equations with unknown *constants*. Nothing covered a system in its own
   unknowns, or typing x and y as x_{1} and y_{1}.
3. **The retry wasn't pointed at it.** No structure detector matched, so the
   Desmos rescue had no hint. If the model tried the regression, the rescue
   answered "underdetermined".

## Changes

- **`src/lib/linear-forms.ts`:** exact affine forms over Desmos LaTeX, using
  BigInt rationals, plus a row-reduction check that a readout is fixed by the
  conditions. Anything outside the supported subset, or nonlinear, is
  "cannot verify".
- **Rule 2:** an underdetermined bracket or scalar fit passes when the result
  line is a later bare expression the conditions fix exactly. Data-list,
  nonlinear, and restricted fits keep the old behavior. The rejection message
  now tells the model how to read a fixed combination.
- **Strategy 79 in the library** (the count is now 79), cross-referenced from
  strategy 5 and the routing list. The prompt's small-system section adds the
  own-unknowns case.
- **Gold 016:** the user's method, verified by the user.
- **Detector `system-in-own-unknowns`:** fires on three or more unknowns, or
  fewer equations than unknowns.
- **Server backstop `src/lib/linear-system-plan.ts`:** chained into
  `desmosNativePlan`.
  - It builds the regression and an explanation whenever the equations parse
    and the requested value is exactly fixed.
  - It fires for three or more unknowns, or fewer equations than unknowns.
  - Two equations in two unknowns stay with graphing.
  - The model's math way stays listed as the alternative.
- **Benchmark case 087**, with the same structure and different numbers
  (answer 7).

## Verification

- **Offline:** TypeScript, ESLint, the production build, case validation (87
  cases plus 16 gold), and all 404 offline tests passed. That is 9 new tests:
  parser, Rule 2, lesson 9, the backstop, detectors, and gold 016.
- **Real Desmos, headless Chrome, no AI calls**
  (`scripts/check-desmos-preflight.mts --cases`):
  - the user's two lines run clean and line 2 shows 8;
  - the 3×3 fixture shows 9;
  - all 81 benchmark reference plans run clean, including 087.
  - The sandbox's proxy blocked Chrome from fetching Desmos, so the script
    served a curl-fetched `calculator.js` through `DESMOS_SCRIPT_FILE`.
- **One live solve of the user's screenshot** (real OpenAI calls):
  - The model's first candidates call already proposed the exact bracket
    regression, citing strategies 73 and 79, with elimination as the math way.
  - The default was Bracket regression, Desmos way, "2 rows · regression · no
    algebra", answer 8. Elimination was listed second as the math way.
  - That first call hit the 60 s timeout in this environment (217 s elapsed)
    and the automatic retry finished in about 14 s.
- **Caching:** the library, prompt and gold changes give a new
  `promptConfigVersion`, so cached solves regenerate the next time they're
  solved. History entries keep the method they were saved with.
