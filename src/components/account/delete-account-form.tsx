"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { FormError } from "@/components/auth-form";
import { TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { deleteAccountAction } from "@/data/actions/account";

type State = { error: string; fieldErrors?: Record<string, string> } | null;

// Two steps in one form: the first "Account wissen" (a plain button, so focus stays on it) only asks "Weet je het
// zeker?", only the second button submits. Enter in the password field before that gets to the question, not past it.
// The password is state, not an uncontrolled field: React resets those after every form action.
export function DeleteAccountForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(async (): Promise<State> => {
    if (!confirming) {
      setConfirming(true);
      return null;
    }
    const result = await deleteAccountAction({ password });
    if (!result.ok) return result;
    router.replace("/inloggen");
    return null;
  }, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <TextField
        label="Wachtwoord"
        hint="Vul je wachtwoord in om te bevestigen."
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={setPassword}
        error={state?.fieldErrors?.password}
      />
      <FormError>{state?.fieldErrors ? undefined : state?.error}</FormError>
      {confirming && (
        <p role="alert" className="font-semibold">
          Weet je het zeker? Dit kan niet ongedaan worden gemaakt.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        {confirming ? (
          <Button type="submit" variant="destructive" disabled={pending}>
            Ja, wis mijn account
          </Button>
        ) : (
          <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
            Account wissen
          </Button>
        )}
        {confirming && (
          <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
            Annuleren
          </Button>
        )}
      </div>
    </form>
  );
}
