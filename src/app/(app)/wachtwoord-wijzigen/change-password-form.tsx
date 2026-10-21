"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/auth-form";
import { changePasswordAction } from "@/data/actions/auth";

type State = { error: string; fieldErrors?: Record<string, string> } | null;

export function ChangePasswordForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (_prev: State, formData: FormData): Promise<State> => {
    const result = await changePasswordAction({ password: String(formData.get("password")) });
    if (!result.ok) return result;
    router.replace("/");
    return null;
  }, null);

  return (
    <form action={action} className="flex flex-col gap-4">
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
