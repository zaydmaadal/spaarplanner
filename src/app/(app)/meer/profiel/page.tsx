import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { Step1 } from "@/components/onboarding/step-1";
import { loadScreenData } from "@/data/load";

export const metadata: Metadata = { title: "Profiel" };

// Spec 8.7: the form of onboarding step 1 on its own page; its title is the h1.
export default async function ProfilePage() {
  const { data } = await loadScreenData();
  return (
    <>
      <Step1 mode="edit" displayName={data.profile.displayName} />
      <BottomNav active="meer" />
    </>
  );
}
