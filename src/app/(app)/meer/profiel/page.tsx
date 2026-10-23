import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { BottomNav } from "@/components/bottom-nav";
import { Step1 } from "@/components/onboarding/step-1";
import { loadScreenData } from "@/data/load";

export const metadata: Metadata = { title: "Profiel" };

// Spec 8.7: the form of onboarding step 1 on its own page; its title is the h1.
export default async function ProfilePage() {
  const { data } = await loadScreenData();
  return (
    <>
      <div className="flex flex-col gap-4">
        <BackLink href="/meer" parent="Meer" />
        <Step1 mode="edit" displayName={data.profile.displayName} />
      </div>
      <BottomNav active="meer" />
    </>
  );
}
