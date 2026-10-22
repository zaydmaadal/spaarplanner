import { redirect } from "next/navigation";
import { requireOnboarded } from "@/data/supabase/server";

// Entry point after login: /inloggen without a session, /onboarding/<step> until onboarding is done, else /overzicht.
export default async function Home() {
  await requireOnboarded();
  redirect("/overzicht");
}
