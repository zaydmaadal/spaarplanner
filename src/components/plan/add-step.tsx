"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { TextField } from "@/components/form-fields";
import { Button } from "@/components/ui/button";
import { addChecklistItemAction } from "@/data/actions/checklist";

// A step of your own. It lands under "Later": the action takes a title only.
export function AddStep() {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Vul een titel in.");
    startTransition(async () => {
      const result = await addChecklistItemAction(title).catch(() => null); // a dropped connection throws
      if (!result) return setError("Opslaan lukte niet. Probeer het opnieuw.");
      if (!result.ok) return setError(result.error);
      setError(undefined);
      setTitle("");
      toast.success("Stap toegevoegd.");
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 border-t border-hairline pt-4">
      <TextField label="Wat wil je nog doen?" hint="De stap komt onder Later." value={title} onChange={setTitle} error={error} maxLength={200} autoComplete="off" />
      <Button type="submit" variant="outline" disabled={pending} className="self-start">
        Eigen stap toevoegen
      </Button>
    </form>
  );
}
