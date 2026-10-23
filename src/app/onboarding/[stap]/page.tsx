import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthHero } from "@/components/auth-shell";
import { STEPS } from "@/components/onboarding/progress";
import { Step1 } from "@/components/onboarding/step-1";
import { Step2 } from "@/components/onboarding/step-2";
import { Step3 } from "@/components/onboarding/step-3";
import { Step4 } from "@/components/onboarding/step-4";
import { Step5 } from "@/components/onboarding/step-5";
import { Step6 } from "@/components/onboarding/step-6";
import { Step7 } from "@/components/onboarding/step-7";
import { Step8 } from "@/components/onboarding/step-8";
import { loadUserData } from "@/data/load";
import { createServerSupabase, readProfile, requireUserId } from "@/data/supabase/server";
import { todayInTimeZone } from "@/domain/dates";
import { parsePrefs, parseStep8Prefs } from "@/lib/prefs";

// The route announcer reads the title, so each step names itself.
export async function generateMetadata({ params }: PageProps<"/onboarding/[stap]">): Promise<Metadata> {
  const { stap } = await params;
  return { title: /^[1-8]$/.test(stap) ? `Stap ${stap} van ${STEPS}: Aan de slag` : "Aan de slag" };
}

const cents = (v: unknown) => (typeof v === "number" ? v : null);

// Outside the (app) group on purpose: its layout sends users who have not finished here, so it would loop.
export default async function OnboardingPage({ params }: PageProps<"/onboarding/[stap]">) {
  const userId = await requireUserId();
  const profile = await readProfile(userId);
  if (!profile) throw new Error("Missing profile");
  if (profile.onboarding_completed_at) redirect("/");
  const { stap } = await params;
  if (!/^[1-8]$/.test(stap)) redirect(`/onboarding/${Math.max(1, profile.onboarding_step)}`);
  const step = Number(stap);

  const today = todayInTimeZone(profile.timezone, new Date());
  const data = await loadUserData(today);
  const raw = typeof profile.prefs === "object" && profile.prefs !== null && !Array.isArray(profile.prefs) ? profile.prefs : {};
  const answers = { startBalanceCents: cents(raw.start_balance_cents), emergencyTargetCents: cents(raw.emergency_target_cents) };
  const mode = "onboarding";

  let content;
  if (step === 1) content = <Step1 mode={mode} displayName={data.profile.displayName} />;
  else if (step === 2) content = <Step2 mode={mode} incomes={data.incomes} ziekenfonds={data.profile.prefs.ziekenfonds} />;
  else if (step === 3) content = <Step3 mode={mode} incomes={data.incomes} />;
  else if (step === 4) content = <Step4 mode={mode} lines={data.lines} />;
  else if (step === 5) content = <Step5 mode={mode} incomes={data.incomes} lines={data.lines} plan={data.plan} />;
  else if (step === 6) content = <Step6 mode={mode} lines={data.lines} {...answers} />;
  else if (step === 7) {
    // "Stage vinden" is a checklist item, so ask whether it exists already instead of adding it twice.
    const supabase = await createServerSupabase();
    const { data: stage } = await supabase.from("checklist_items").select("id").eq("source", "user").eq("title", "Stage vinden").limit(1);
    content = (
      <Step7
        mode={mode}
        today={today}
        incomes={data.incomes}
        lines={data.lines}
        plan={data.plan}
        goals={data.goals.filter((g) => g.kind !== "emergency" && !g.archived)}
        {...answers}
        stageAdded={(stage?.length ?? 0) > 0}
      />
    );
  } else {
    content = (
      <Step8
        mode={mode}
        palette={parsePrefs(profile.prefs).palette}
        {...parseStep8Prefs(profile.prefs)}
        {...answers}
        emergencySharePct={data.plan.emergencySharePct}
      />
    );
  }
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 min-[400px]:px-5 md:max-w-xl lg:max-w-2xl lg:justify-center lg:py-12">
      {step === 1 && <AuthHero className="mb-5 rounded-hero p-6 lg:p-10" tagline="Welkom. Zo bouwen we samen je spaarplan." />}
      {content}
    </main>
  );
}
