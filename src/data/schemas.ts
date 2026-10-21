import { z } from "zod";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Spec 7: 3-20 characters, a-z 0-9 . _ -, starts and ends alphanumeric, no "..".
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?!.*\.\.)[a-z0-9][a-z0-9._-]{1,18}[a-z0-9]$/,
    "Gebruik 3 tot 20 tekens: letters, cijfers, punt, underscore of streepje. Begin en eindig met een letter of cijfer, en zet geen twee punten achter elkaar.",
  );

// 72: Supabase Auth refuses longer passwords (bcrypt limit).
export const passwordSchema = z
  .string()
  .min(10, "Kies een wachtwoord van minstens 10 tekens.")
  .max(72, "Kies een wachtwoord van hoogstens 72 tekens.");

// First message per field, for ActionResult.fieldErrors.
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path[0])] ??= issue.message;
  return out;
}
