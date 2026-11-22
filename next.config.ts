import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // keep the bottom-left corner free for the Spotify card
  devIndicators: { position: "top-left" },
  // Spotify OAuth only accepts the loopback IP, so the dev server must serve 127.0.0.1 too
  allowedDevOrigins: ["127.0.0.1"],
  partialPrefetching: true,
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
