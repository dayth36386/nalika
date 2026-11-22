import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// semantic-release writes the release version into package.json during CI, right before the build.
const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as { version: string };

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: version },
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
