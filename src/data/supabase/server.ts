import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Database } from "@/data/database.types";
import { adminUserIds, publicEnv } from "@/lib/env";

export async function createServerSupabase(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
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

export async function requireUserId(): Promise<string> {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) redirect("/inloggen");
  return data.claims.sub;
}

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
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("onboarding_step, onboarding_completed_at")
    .eq("id", userId)
    .single();
  // Step 0 means "not started"; the first screen is /onboarding/1.
  if (!data?.onboarding_completed_at) redirect(`/onboarding/${Math.max(1, data?.onboarding_step ?? 0)}`);
  return userId;
}
