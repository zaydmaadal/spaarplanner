"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/auth-form";
import { registerAction } from "@/data/actions/auth";
import { createBrowserSupabase } from "@/data/supabase/browser";
import { usernameToEmail } from "@/lib/auth-email";

type State = { error: string; fieldErrors?: Record<string, string>; username: string } | null;

export function RegisterForm({ askInviteCode }: { askInviteCode: boolean }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (_prev: State, formData: FormData): Promise<State> => {
    const username = String(formData.get("username")).trim();
    const password = String(formData.get("password"));
    const result = await registerAction({
      username,
      password,
      inviteCode: askInviteCode ? String(formData.get("inviteCode")) : undefined,
    });
    if (!result.ok) return { error: result.error, fieldErrors: result.fieldErrors, username };

    // Spec 7: the browser logs in after the server created the account.
    const { error } = await createBrowserSupabase().auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    router.replace(error ? "/inloggen" : "/");
    return null;
  }, null);

  const fieldErrors = state?.fieldErrors;
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Gebruikersnaam"
        name="username"
        hint="3 tot 20 tekens: letters, cijfers, punt, underscore of streepje."
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        defaultValue={state?.username}
        error={fieldErrors?.username}
      />
      <Field
        label="Wachtwoord"
        name="password"
        type="password"
        hint="Minstens 8 tekens."
        autoComplete="new-password"
        error={fieldErrors?.password}
      />
      {askInviteCode && <Field label="Uitnodigingscode" name="inviteCode" autoComplete="off" />}
      {/* Field errors already show above; only a form-level message (closed, wrong code, rate cap) goes here. */}
      <FormError>{fieldErrors ? undefined : state?.error}</FormError>
      <SubmitButton pending={pending}>Account maken</SubmitButton>
    </form>
  );
}
