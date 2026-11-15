import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Runtime renders (any ticker, research API) read the committed snapshot from disk.
  outputFileTracingIncludes: {
    "/*": ["./data/**/*"],
  },
  outputFileTracingExcludes: {
    "/*": ["./data/cache/**/*"],
  },
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
