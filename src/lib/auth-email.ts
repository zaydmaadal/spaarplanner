import { publicEnv } from "@/lib/env";

// Users log in with a username; Supabase Auth needs an email, so we derive a synthetic one.
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase()}@${publicEnv.authEmailDomain}`;
}
