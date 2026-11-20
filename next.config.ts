import type { NextConfig } from "next";

// STATIC_DEMO=1 builds the serverless GitHub Pages variant (see scripts/build-pages.sh).
const staticDemo = process.env.STATIC_DEMO === "1";
const basePath = staticDemo ? process.env.PAGES_BASE_PATH ?? "" : "";

const nextConfig: NextConfig = {
  ...(staticDemo ? { output: "export" as const, basePath, trailingSlash: true } : {}),
  env: {
    NEXT_PUBLIC_STATIC_DEMO: staticDemo ? "1" : "",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  // Card PNG routes read font files with fs at runtime; make sure Vercel bundles them.
  outputFileTracingIncludes: {
    "/api/runs/[id]/cards/[n]": ["./src/assets/fonts/*.otf"],
  },
  serverExternalPackages: ["xlsx"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
