import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // One self-contained server (see Dockerfile). Cache Components is left off: all data access is
  // client-side through ports, over HTTP route handlers.
  output: "standalone",
  serverExternalPackages: ["pg", "@electric-sql/pglite"],
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.polyhaven.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
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
