import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Previously shared image URLs should still resolve after the asset rename.
  async redirects() {
    return ["logo-source.png", "starlit-coast.png", "share-v1.png"].map((asset) => ({
      source: `/images/desmo-${asset}`,
      destination: `/images/solveplot-${asset}`,
      permanent: true,
    }));
  },
  outputFileTracingIncludes: {
    "/api/solve": [
      "./src/content/desmos-tricks.md",
      "./src/content/training-batches/*.json",
    ],
  },
};

export default nextConfig;
