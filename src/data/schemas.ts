import { z } from "zod";
import { parseEuroInput } from "@/domain/money";
import { PALETTES, THEMES } from "@/lib/prefs";

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

// 72 bytes (not characters): Supabase Auth refuses longer passwords (bcrypt limit), and "é" is 2 bytes.
export const passwordSchema = z
  .string()
  .min(10, "Kies een wachtwoord van minstens 10 tekens.")
  .refine((v) => new TextEncoder().encode(v).length <= 72, "Kies een wachtwoord van hoogstens 72 tekens.");

// First message per field, for ActionResult.fieldErrors. A nested field (prefs.contextNote) is keyed by its own name.
export function fieldErrorsFrom(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) out[String(issue.path.at(-1))] ??= issue.message;
  return out;
}

// Entities (spec 6). The limits are the CHECKs of the migration, so the database never has to say no.
const MAX_CENTS = 100_000_000_000;

// Amounts come in as text from the form (Dutch notation) and leave as whole cents. Negative amounts do not exist:
// a withdrawal is a direction, not a sign.
export const moneySchema = z.string().transform((text, ctx) => {
  const cents = parseEuroInput(text);
  if (cents === null || cents > MAX_CENTS) {
    ctx.issues.push({ code: "custom", message: "Vul een bedrag in, bijvoorbeeld 12,50.", input: text });
    return z.NEVER;
  }
  return cents;
});
const positiveMoney = moneySchema.refine((cents) => cents > 0, "Vul een bedrag in dat groter is dan 0.");

const name = z.string().trim().min(1, "Vul een naam in.").max(80, "Kies een naam van hoogstens 80 tekens.");
const uuid = z.uuid();

const paydayRuleSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("day_of_month"), day: z.number().int().min(1).max(31), weekend: z.enum(["before", "after"]) }),
  z.object({ type: z.literal("last_working_day") }),
  z.object({ type: z.literal("weekday"), weekday: z.number().int().min(1).max(7) }),
  z.object({ type: z.literal("irregular") }),
]);

export const incomeSchema = z
  .object({
    id: uuid.optional(),
    name,
    kind: z.enum(["salary", "side", "student", "benefit", "allowance", "other"]),
    frequency: z.enum(["monthly", "weekly", "biweekly", "yearly", "once"]),
    amount: moneySchema,
    amountLow: moneySchema.nullish(),
    variability: z.enum(["fixed", "variable"]).default("fixed"),
    month: z.number().int().min(1).max(12).nullish(),
    date: z.iso.date().nullish(),
    paydayRule: paydayRuleSchema,
    isEstimate: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .refine((v) => v.frequency !== "yearly" || v.month, { message: "Kies de maand waarin je dit inkomen krijgt.", path: ["month"] })
  .refine((v) => v.frequency !== "once" || v.date, { message: "Kies de datum waarop je dit inkomen krijgt.", path: ["date"] });

export const budgetLineSchema = z.object({
  id: uuid.optional(),
  kind: z.enum(["fixed", "living", "free"]),
  category: z.string().trim().max(80, "Kies een categorie van hoogstens 80 tekens."),
  name,
  amount: moneySchema,
  isEstimate: z.boolean().default(false),
});

// The emergency fund is created when onboarding finishes, so it is not a kind to pick here. On an update the kind is
// ignored (a goal keeps its kind). The deadline is a month, as <input type="month"> gives it.
export const goalSchema = z.object({
  id: uuid.optional(),
  kind: z.enum(["savings", "trip", "purchase", "other"]).default("other"),
  name,
  target: positiveMoney,
  targetIsEstimate: z.boolean().default(false),
  deadline: z.string().regex(/^(19|20|21)\d\d-(0[1-9]|1[0-2])$/, "Kies een maand en een jaar.").nullish(),
  weight: z.number().int().min(1, "Het gewicht is minstens 1.").max(32767).default(1),
});

export const transactionSchema = z.object({
  goalId: uuid,
  amount: positiveMoney,
  direction: z.enum(["in", "out"]),
  occurredOn: z.iso.date(),
  note: z.string().trim().max(200, "Een notitie mag hoogstens 200 tekens hebben.").optional(),
  clientRef: uuid,
});
export type TransactionInput = z.input<typeof transactionSchema>;

// Every field is optional and only what is given gets written. The savings amount is only ever one the user typed:
// null means "follows my room", and a left-out field leaves the stored value alone (a proposal is computed on render).
export const planSchema = z.object({
  monthlySavings: moneySchema.nullable().optional(),
  emergencySharePct: z.number().int().min(0).max(100).optional(),
  incomeMode: z.enum(["careful", "normal"]).optional(),
  includeOneOffIncome: z.boolean().optional(),
});

export const profileSchema = z.object({
  displayName: z.string().trim().max(80, "Kies een naam van hoogstens 80 tekens.").optional(),
  prefs: z
    .object({
      palette: z.enum(PALETTES).optional(),
      theme: z.enum(THEMES).optional(),
      firstJob: z.boolean().optional(),
      noInterestSavings: z.boolean().optional(),
      showBasmala: z.boolean().optional(),
      contextNote: z.string().max(2000, "Je notitie mag hoogstens 2.000 tekens hebben.").optional(),
    })
    .optional(),
});

export const idSchema = uuid;
