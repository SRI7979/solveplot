/** Public-facing brand copy. OAuth's displayed name is configured separately
 * in Google Auth Platform and must be verified after a rename. */
export const BRAND = {
  name: "SolvePlot",
  wordmark: "SolvePlot",
  domain: "solveplot.com",
  // Exact official profile URLs confirmed by the owner on October 29, 2026.
  socialProfiles: [
    { label: "Instagram", href: "https://www.instagram.com/solveplot/" },
    { label: "YouTube", href: "https://www.youtube.com/channel/UCoKUGCYBftdoaTkxzgyPK_Q" },
    { label: "TikTok", href: "https://www.tiktok.com/@solveplot" },
  ],
  contact: {
    href: `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@solveplot.com"}`,
    label: "Contact support",
  },
} as const;
