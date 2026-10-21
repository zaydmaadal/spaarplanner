import type { Metadata } from "next";
import { logoutAction } from "@/data/actions/auth";
import { requireUserId } from "@/data/supabase/server";
import { ChangePasswordForm } from "./change-password-form";

export const metadata: Metadata = { title: "Wachtwoord wijzigen" };

export default async function WachtwoordWijzigenPage() {
  await requireUserId();
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Wachtwoord wijzigen</h1>
      <ChangePasswordForm />
      <form action={logoutAction}>
        <button
          type="submit"
          className="h-11 font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          Uitloggen
        </button>
      </form>
    </main>
  );
}
