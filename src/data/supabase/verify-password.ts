import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";

// For actions that ask for the password again. Only invalid credentials count as "wrong": a rate limit or an outage must not look like one.
export async function verifyPassword(email: string, password: string): Promise<"ok" | "wrong" | "error"> {
  // A fresh client that stores nothing, so the cookie session of this user is left alone.
  const { error } = await createClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).auth.signInWithPassword({ email, password });
  return !error ? "ok" : error.code === "invalid_credentials" ? "wrong" : "error";
}
