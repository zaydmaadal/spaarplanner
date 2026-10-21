"use client";

import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Field, FormError, SubmitButton } from "@/components/auth-form";
import { createBrowserSupabase } from "@/data/supabase/browser";
import { usernameToEmail } from "@/lib/auth-email";

type State = { error: string; username: string } | null;

export function LoginForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(async (_prev: State, formData: FormData): Promise<State> => {
    const username = String(formData.get("username")).trim();
    const { error } = await createBrowserSupabase().auth.signInWithPassword({
      email: usernameToEmail(username),
      password: String(formData.get("password")),
    });
    if (!error) {
      router.replace("/");
      return null;
    }
    // 400 is a wrong username or password; anything else (rate limit, network) is not the user's typo.
    return {
      username,
      error:
        error.status === 400
          ? "Je gebruikersnaam of wachtwoord klopt niet."
          : "Inloggen lukt nu niet. Probeer het zo opnieuw.",
    };
  }, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <Field
        label="Gebruikersnaam"
        name="username"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        defaultValue={state?.username}
      />
      <Field label="Wachtwoord" name="password" type="password" autoComplete="current-password" />
      <FormError>{state?.error}</FormError>
      <SubmitButton pending={pending}>Inloggen</SubmitButton>
    </form>
  );
}
