/** Public-facing brand copy. OAuth's displayed name is configured separately
 * in Google Auth Platform and must be verified after a rename. */
export const BRAND = {
  name: "SolvePlot",
  wordmark: "SolvePlot",
  domain: "solveplot.com",
  contact: {
    href: `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@solveplot.com"}`,
    label: "Contact support",
  },
} as const;
