"use client";

import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/auth-form";
import { resetPasswordAction } from "@/data/actions/admin";

type State = { error: string } | { tempPassword: string } | null;

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(async (_prev: State, formData: FormData): Promise<State> => {
    const result = await resetPasswordAction({ username: String(formData.get("username")) });
    return result.ok ? result.data : result;
  }, null);

  return (
    <>
      <form action={action} className="flex flex-col gap-4">
        <Field label="Gebruikersnaam" name="username" autoComplete="off" autoCapitalize="none" spellCheck={false} />
        <FormError>{state && "error" in state ? state.error : undefined}</FormError>
        <SubmitButton pending={pending}>Wachtwoord resetten</SubmitButton>
      </form>
      {state && "tempPassword" in state && (
        <div role="status" className="flex flex-col gap-2 rounded-md border border-foreground/60 p-4">
          <p className="font-medium">Tijdelijk wachtwoord</p>
          <code className="font-mono text-lg break-all select-all">{state.tempPassword}</code>
          <p className="text-sm text-foreground/70">
            Geef dit wachtwoord persoonlijk door. Bij het inloggen moet de gebruiker het meteen wijzigen.
          </p>
        </div>
      )}
    </>
  );
}
