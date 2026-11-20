import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
