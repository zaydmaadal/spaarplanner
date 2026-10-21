import type { Metadata } from "next";
import { BottomNav } from "@/components/bottom-nav";
import { DeleteAccountForm } from "@/components/account/delete-account-form";

export const metadata: Metadata = { title: "Account wissen" };

// Spec 7: the password again, then the account and every table go. The export link is a plain link, not next/link (which would prefetch the download) and without a download attribute (the response forces the download).
export default function AccountPage() {
  return (
    <>
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-2xl font-semibold">Account wissen</h1>
        <p>Je account en al je gegevens worden gewist. Dit kan niet ongedaan worden gemaakt.</p>
        <p>
          Wil je je gegevens eerst bewaren?{" "}
          <a href="/api/export" className="font-semibold underline underline-offset-4">
            Download ze dan eerst
          </a>
          .
        </p>
        <DeleteAccountForm />
      </div>
      <BottomNav active="meer" />
    </>
  );
}
