import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { BottomNav } from "@/components/bottom-nav";
import { Step8 } from "@/components/onboarding/step-8";
import { readProfile, requireUserId } from "@/data/supabase/server";
import { parsePrefs, parseStep8Prefs } from "@/lib/prefs";

export const metadata: Metadata = { title: "Wat de app over je weet" };

// Spec 8.7: the answers of onboarding step 8 without the palette, which is under Uiterlijk on Meer. The last three props
// belong to finishing the onboarding, which edit mode never does.
export default async function ContextPage() {
  const prefs = (await readProfile(await requireUserId()))?.prefs;
  return (
    <>
      <div className="flex flex-col gap-4">
        <BackLink href="/meer" parent="Meer" />
        <Step8 mode="edit" palette={parsePrefs(prefs).palette} {...parseStep8Prefs(prefs)} startBalanceCents={null} emergencyTargetCents={null} emergencySharePct={100} />
      </div>
      <BottomNav active="meer" />
    </>
  );
}
