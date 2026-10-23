import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { BottomNav } from "@/components/bottom-nav";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Feedback geven" };

export default function FeedbackPage() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <BackLink href="/meer" parent="Profiel" />
        <header className="flex max-w-xl flex-col gap-1">
          <h1 className="font-display text-3xl font-bold">Feedback geven</h1>
          <p className="text-ink-2">Mis je iets, of werkt iets niet? Laat het ons weten. We lezen elk bericht.</p>
        </header>
        <FeedbackForm />
      </div>
      <BottomNav active="meer" />
    </>
  );
}
