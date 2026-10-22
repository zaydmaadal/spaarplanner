import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { fieldErrorsFrom, type ActionResult } from "@/data/schemas";

export const SOMETHING_WRONG = "Er ging iets mis. Probeer het opnieuw.";
const CAP_REACHED = "Je hebt het maximum bereikt. Verwijder eerst iets.";

type Failure = Extract<ActionResult, { ok: false }>;

export const fail = (error: string): Failure => ({ ok: false, error });

export const invalid = (error: z.ZodError): Failure => ({
  ok: false,
  error: "Controleer je gegevens.",
  fieldErrors: fieldErrorsFrom(error),
});

// The row cap trigger (migration init.sql) raises check_violation (23514) with "row limit reached for <table>";
// any other CHECK also has code 23514, so the message tells them apart.
export const isRowCap = (error: { code?: string; message?: string }) =>
  error.code === "23514" && !!error.message?.startsWith("row limit reached for");

export const dbFailure = (error: { code?: string; message?: string }): Failure =>
  fail(isRowCap(error) ? CAP_REACHED : SOMETHING_WRONG);

// Every screen sits under the root layout, so one call refreshes whatever showed the changed data.
export function done<T = void>(data?: T): ActionResult<T> {
  revalidatePath("/", "layout");
  return { ok: true, data: data as T };
}
