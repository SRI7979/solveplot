import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    const privatePaths = ["api", "auth", "login", "learn", "history", "tricks", "settings", "profile"];
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    return [
      ...privatePaths.map((path) => ({ source: `/${path}/:path*`, headers: noindex })),
      // /solve is a public entrance. Nested URLs and requests carrying an auth
      // cookie are personal variants, so they must not enter search results.
      { source: "/solve/:path+", headers: noindex },
      { source: "/solve", has: [{ type: "header" as const, key: "cookie", value: ".*\\bsb-[^=;\\s]+-auth-token(?:\\.\\d+)?=.*" }], headers: noindex },
      // The canonical custom domain is the only production host intended for search.
      { source: "/:path*", has: [{ type: "host" as const, value: ".*\\.vercel\\.app" }], headers: noindex },
      ...(process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production"
        ? [{ source: "/:path*", headers: noindex }]
        : []),
    ];
  },
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
      "./src/content/gold-solutions/*.json",
      "./src/content/training-batches/*.json",
    ],
  },
  // Research captures and local recovery files are never runtime dependencies.
  // Keep them out of function bundles even when building this working checkout.
  outputFileTracingExcludes: {
    "/*": [
      "./.solveplot-debug/**/*",
      "./.desmo-debug/**/*",
      "./evals/private/**/*",
      "./evals/results/**/*",
      "./evals/reports/**/*",
      "./prototypes/**/*",
      "./.env*",
      "./.vercel/**/*",
    ],
  },
};

export default nextConfig;
