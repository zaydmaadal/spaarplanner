"use client";

import { Check } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Choice, TextareaField, TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { sendFeedbackAction } from "@/data/actions/feedback";
import type { FEEDBACK_KINDS } from "@/data/schemas";

type Kind = (typeof FEEDBACK_KINDS)[number];

export function FeedbackForm() {
  const [kind, setKind] = useState<Kind>("feedback");
  const [message, setMessage] = useState("");
  const [page, setPage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setErrors({});
    setError(null);
    startTransition(async () => {
      // A dropped connection throws; catching it keeps what the user typed.
      const result = await sendFeedbackAction({ kind, message, page }).catch(() => null);
      if (!result) return setError("Versturen lukte niet. Probeer het opnieuw.");
      if (result.ok) {
        toast.success("Bedankt voor je bericht.");
        return setSent(true);
      }
      setErrors(result.fieldErrors ?? {});
      setError(result.fieldErrors ? null : result.error);
    });
  }

  if (sent) {
    return (
      <div role="status" className="rise flex max-w-xl flex-col items-start gap-3 rounded-card bg-surface p-4 shadow-card lg:p-5">
        <span className="grid size-10 place-items-center rounded-full bg-tint">
          <Check aria-hidden className="size-5" />
        </span>
        <p className="font-display text-xl font-semibold">Bedankt, we hebben je bericht ontvangen.</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setMessage("");
            setPage("");
            setSent(false);
          }}
        >
          Nog iets sturen
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rise flex max-w-xl flex-col gap-4 rounded-card bg-surface p-4 shadow-card lg:p-5">
      <Choice
        legend="Waar gaat het over?"
        value={kind}
        onChange={setKind}
        options={[
          { value: "feedback", label: "Feedback" },
          { value: "bug", label: "Bug" },
        ]}
      />
      <TextareaField
        label={kind === "bug" ? "Wat ging er mis?" : "Wat wil je ons laten weten?"}
        hint={kind === "bug" ? "Wat deed je, en wat gebeurde er?" : "Een idee, een compliment of iets dat beter kan."}
        value={message}
        onChange={setMessage}
        error={errors.message}
        maxLength={2000}
        rows={6}
      />
      <TextField label="Op welke pagina" hint="Optioneel. Bijvoorbeeld Doelen of Storten." value={page} onChange={setPage} error={errors.page} maxLength={200} autoComplete="off" />
      {error && (
        <p role="alert" className="text-sm font-semibold text-error">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={pending} className="self-start">
        Versturen
      </Button>
    </form>
  );
}
