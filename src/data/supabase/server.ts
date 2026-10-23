import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import type { Database } from "@/data/database.types";
import { adminUserIds, publicEnv } from "@/lib/env";
import { LOOK_COOKIE, parseLookCookie, parsePrefs } from "@/lib/prefs";

// Never call this inside "use cache" or "use cache: private": connection() throws there. Use React cache() for sharing.
export async function createServerSupabase(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  // The auth client reads the clock (Date.now) right after it is created, which Next flags as unstable
  // in the stages that run before the request-time render. Wait for that stage first.
  await connection();
  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot set cookies; proxy.ts refreshes the session.
        }
      },
    },
  });
}

// One getClaims and one profile select per request, shared by the root layout, the (app) layout and the page.
// React cache() is per request and a pass-through outside a render (actions run uncached, so a write is never read stale).
const readClaims = cache(async () => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
});

export const readProfile = cache(async (userId: string) => {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return data;
});

export async function requireClaims() {
  const claims = await readClaims();
  if (!claims?.sub) redirect("/inloggen");
  return claims;
}

export const requireUserId = async (): Promise<string> => (await requireClaims()).sub;

// Non-admins get a 404, so the page does not reveal that it exists. Lives here, not in a "use server"
// file, so it is never a callable action endpoint.
export async function requireAdmin(): Promise<string> {
  const userId = await requireUserId();
  if (!adminUserIds().includes(userId)) notFound();
  return userId;
}

// For pages that need a finished onboarding; Task 13's (app)/layout.tsx calls it too.
export async function requireOnboarded(): Promise<string> {
  const userId = await requireUserId();
  const data = await readProfile(userId);
  // Step 0 means "not started"; the first screen is /onboarding/1.
  if (!data?.onboarding_completed_at) redirect(`/onboarding/${Math.max(1, data?.onboarding_step ?? 0)}`);
  return userId;
}

// For the root layout: palette and theme of the signed-in user, or without a session the look cookie. Never redirects.
export async function readPrefs() {
  const claims = await readClaims();
  if (!claims?.sub) return parseLookCookie((await cookies()).get(LOOK_COOKIE)?.value);
  return parsePrefs((await readProfile(claims.sub))?.prefs);
}
