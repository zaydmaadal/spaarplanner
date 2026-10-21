import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/data/database.types";
import { publicEnv } from "@/lib/env";

export function createBrowserSupabase(): SupabaseClient<Database> {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
}
