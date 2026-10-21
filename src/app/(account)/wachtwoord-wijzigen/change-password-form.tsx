"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/auth-form";
import { changePasswordAction } from "@/data/actions/auth";

type State = { error: string; fieldErrors?: Record<string, string> } | null;

// forced: right after an admin reset the temporary password is not asked again.
export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (_prev: State, formData: FormData): Promise<State> => {
    const result = await changePasswordAction({
      password: String(formData.get("password")),
      currentPassword: forced ? undefined : String(formData.get("currentPassword")),
    });
    if (!result.ok) return result;
    router.replace("/");
    return null;
  }, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      {!forced && (
        <Field
          label="Huidig wachtwoord"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          error={state?.fieldErrors?.currentPassword}
        />
      )}
      <Field
        label="Nieuw wachtwoord"
        name="password"
        type="password"
        hint="Minstens 10 tekens."
        autoComplete="new-password"
        error={state?.fieldErrors?.password}
      />
      <FormError>{state?.fieldErrors ? undefined : state?.error}</FormError>
      <SubmitButton pending={pending}>Wachtwoord opslaan</SubmitButton>
    </form>
  );
}
