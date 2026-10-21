import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Inloggen" };

export default function InloggenPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Inloggen</h1>
      <LoginForm />
      <p>
        Nog geen account?{" "}
        <Link href="/registreren" className="font-medium underline">
          Account maken
        </Link>
      </p>
    </>
  );
}
