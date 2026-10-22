import type { Metadata } from "next";
import { requireAdmin } from "@/data/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Beheer" };

export default async function BeheerPage() {
  await requireAdmin();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Wachtwoord resetten</h1>
      <ResetPasswordForm />
    </main>
  );
}
