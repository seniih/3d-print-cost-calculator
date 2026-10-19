import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Produces a small self-contained server for the Docker image.
  output: "standalone",
  // Keep the PDF libraries as plain Node modules; bundled, their text shaping misbehaves.
  serverExternalPackages: ["pdf-lib", "@pdf-lib/fontkit"],
  // The quote PDF reads its fonts from disk at request time.
  outputFileTracingIncludes: { "/api/quote/**": ["./assets/fonts/**"] },
  cacheComponents: true,
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

export default withNextIntl(nextConfig);
