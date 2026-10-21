import { requireOnboarded } from "@/data/supabase/server";

// Onboarding (/onboarding) and /wachtwoord-wijzigen live outside this group on purpose: requireOnboarded() redirects to them.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  // Bottom padding leaves room for the fixed BottomNav.
  return <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-6 pb-28 min-[400px]:px-5">{children}</main>;
}
