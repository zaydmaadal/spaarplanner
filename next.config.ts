import type { NextConfig } from "next";
import { validatePublicEnv } from "./src/lib/env";

// Fail the Vercel build on a missing public variable; CI builds without a Supabase project.
if (process.env.VERCEL) validatePublicEnv();

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Back and forth between tabs reuses a page for 30 s. Every mutation calls revalidatePath('/', 'layout') from a
  // server action, which clears the whole client cache, so a save is never followed by a stale page.
  experimental: { staleTimes: { dynamic: 30 } },
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
