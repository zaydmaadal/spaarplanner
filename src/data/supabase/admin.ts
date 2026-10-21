import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/data/database.types";
import { publicEnv, serverEnv } from "@/lib/env";

export function createAdminSupabase(): SupabaseClient<Database> {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv().supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
