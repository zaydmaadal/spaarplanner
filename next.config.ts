import type { NextConfig } from "next";
import { validatePublicEnv } from "./src/lib/env";

// Fail the Vercel build on a missing public variable; CI builds without a Supabase project.
if (process.env.VERCEL) validatePublicEnv();

const nextConfig: NextConfig = {
  /* config options here */
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

export default nextConfig;
