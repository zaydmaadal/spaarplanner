import type { Metadata } from "next";
import Link from "next/link";
import { signupConfig } from "@/lib/env";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Account maken" };

export default function RegistrerenPage() {
  const { mode } = signupConfig();
  return (
    <>
      <h1 className="text-2xl font-semibold">Account maken</h1>
      {mode === "closed" ? <p>Registreren is nu gesloten.</p> : <RegisterForm askInviteCode={mode === "invite"} />}
      <p>
        Heb je al een account?{" "}
        <Link href="/inloggen" className="font-medium underline">
          Inloggen
        </Link>
      </p>
    </>
  );
}
