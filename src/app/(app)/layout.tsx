import { NavProgress } from "@/components/nav-progress";
import { SidebarNav } from "@/components/sidebar-nav";
import { requireOnboarded } from "@/data/supabase/server";

// Onboarding (/onboarding) and /wachtwoord-wijzigen live outside this group on purpose: requireOnboarded() redirects to them.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireOnboarded();
  // Below 1024 px every page renders its own floating BottomNav, so the bottom padding clears it and the home indicator.
  // From 1024 px the sidebar takes its place and the content gets up to 1100 px.
  return (
    <div className="flex flex-1 flex-col lg:pl-60">
      <SidebarNav />
      <NavProgress />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-5 pb-[calc(6.5rem+env(safe-area-inset-bottom))] min-[400px]:px-5 md:max-w-2xl md:px-8 lg:max-w-275 lg:px-10 lg:pt-10 lg:pb-12">
        {children}
      </main>
    </div>
  );
}
