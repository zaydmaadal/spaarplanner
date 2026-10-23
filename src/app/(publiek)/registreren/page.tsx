import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { signupConfig } from "@/lib/env";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Account maken" };

export default function RegistrerenPage() {
  const { mode } = signupConfig();
  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold">Account maken</h1>
      {mode === "closed" ? <p>Registreren is nu gesloten.</p> : <RegisterForm askInviteCode={mode === "invite"} />}
      <p>
        Heb je al een account?{" "}
        <Link href="/inloggen" className="font-semibold text-accent-ink underline underline-offset-4">
          Inloggen
        </Link>
      </p>
    </AuthShell>
  );
}
