import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  // Previously shared image URLs should still resolve after the asset rename.
  async redirects() {
    return [
      ...["logo-source.png", "starlit-coast.png"].map((asset) => ({
        source: `/images/desmo-${asset}`,
        destination: `/images/solveplot-${asset}`,
        permanent: true,
      })),
      ...["desmo-share-v1.png", "solveplot-share-v1.png"].map((asset) => ({
        source: `/images/${asset}`,
        destination: "/images/solveplot-share-v2.png",
        permanent: true,
      })),
    ];
  },
  outputFileTracingIncludes: {
    "/api/solve": [
      "./src/content/desmos-tricks.md",
      "./src/content/training-batches/*.json",
    ],
  },
};

export default nextConfig;
