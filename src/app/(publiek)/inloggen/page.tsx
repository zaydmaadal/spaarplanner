import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default function InloggenPage() {
  return (
    <AuthShell>
      <h1 className="font-display text-3xl font-bold">Inloggen</h1>
      <LoginForm />
      <p>
        Nog geen account?{" "}
        <Link href="/registreren" className="font-semibold text-accent-ink underline underline-offset-4">
          Account maken
        </Link>
      </p>
    </AuthShell>
  );
}
