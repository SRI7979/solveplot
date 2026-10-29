/** Local UI review only. Never grants an identity or access to protected APIs. */
export function isLocalLearnReview(env: { NODE_ENV?: string; SOLVEPLOT_LEARN_REVIEW?: string } = process.env) {
  return env.NODE_ENV === "development" && env.SOLVEPLOT_LEARN_REVIEW === "1";
}
