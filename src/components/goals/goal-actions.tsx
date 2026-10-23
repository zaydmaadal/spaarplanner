"use client";

import { Archive, Pencil, Star, Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type MouseEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { archiveGoalAction, deleteGoalAction, setMainGoalAction, unarchiveGoalAction } from "@/data/actions/goals";
import { formatEUR } from "@/domain/money";
import type { Cents } from "@/domain/types";

const UNDO_MS = 8000; // spec 8.4
const FAILED = "Dat lukte niet. Probeer het opnieuw.";
const ARCHIVE_EXPLAINED = "Verbergt het doel, je geschiedenis blijft. Terugzetten kan bij Afgerond.";

// An icon button of the secondary row. The name is the aria-label and the tooltip; from sm up the short label shows too.
const iconButton = "sm:w-auto sm:px-4";
function Label({ icon: Icon, children }: { icon: LucideIcon; children: string }) {
  return (
    <>
      <Icon aria-hidden />
      <span className="sr-only sm:not-sr-only">{children}</span>
    </>
  );
}

// A confirm dialog: `run` returns the failure to show in the dialog, or null when it worked (the caller then moves on).
function Confirm({
  trigger,
  title,
  description,
  confirm,
  destructive,
  run,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirm: string;
  destructive?: boolean;
  run: () => Promise<string | null>;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const go = () =>
    startTransition(async () => {
      // A dropped connection throws, and a throw in a transition would show the error card of the whole screen.
      const failure = await run().catch(() => FAILED);
      if (failure) setError(failure);
      else setOpen(false);
    });
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setError(null);
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="leading-snug">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm font-semibold text-error">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Annuleren
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} onClick={go} disabled={pending}>
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The secondary actions of the goal screen, next to the primary Storten and Opnemen: edit, make main, archive, delete.
// The emergency fund can be edited only: the plan reserves a share for it, so it is neither archived nor deleted.
export function GoalActions({ id, name, balanceCents, isMain, isEmergency }: { id: string; name: string; balanceCents: Cents; isMain: boolean; isEmergency: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // The button goes away once this is the main goal: the focus goes to the page title (found before, while the button is still in the page).
  const setMain = (event: MouseEvent<HTMLElement>) => {
    const title = event.currentTarget.closest(":has(h1)")?.querySelector("h1");
    startTransition(async () => {
      const result = await setMainGoalAction(id).catch(() => null);
      if (!result) return void toast.error(FAILED);
      if (result.ok) {
        toast.success("Dit is nu je hoofddoel.");
        title?.focus({ preventScroll: true });
      } else toast.error(result.error);
    });
  };

  // Archiving takes the main flag off; undoing gives it back.
  async function undo() {
    try {
      const back = await unarchiveGoalAction(id);
      const result = back.ok && isMain ? await setMainGoalAction(id) : back;
      if (result.ok) toast.success("Doel teruggezet.");
      else toast.error(result.error);
    } catch {
      toast.error(FAILED); // the toast's own action has no caller to catch this
    }
  }

  const archive = async () => {
    const result = await archiveGoalAction(id);
    if (!result.ok) return result.error;
    toast("Doel gearchiveerd", { description: "Terugzetten kan bij Afgerond.", duration: UNDO_MS, action: { label: "Ongedaan maken", onClick: undo } });
    router.push("/doelen");
    return null;
  };

  const remove = async () => {
    const result = await deleteGoalAction(id);
    if (!result.ok) return result.error;
    toast.success("Doel verwijderd.");
    router.push("/doelen");
    return null;
  };

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Meer acties" className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="icon" className={iconButton}>
          <Link href={`/doelen/${id}/aanpassen`} aria-label="Aanpassen" title="Aanpassen">
            <Label icon={Pencil}>Aanpassen</Label>
          </Link>
        </Button>
        {!isMain && (
          <Button type="button" variant="outline" size="icon" className={iconButton} onClick={setMain} disabled={pending} aria-label="Als hoofddoel instellen" title="Als hoofddoel instellen">
            <Label icon={Star}>Hoofddoel</Label>
          </Button>
        )}
        {!isEmergency && (
          <>
            <Confirm
              trigger={
                <Button type="button" variant="outline" size="icon" className={iconButton} aria-label="Archiveren" title={ARCHIVE_EXPLAINED}>
                  <Label icon={Archive}>Archiveren</Label>
                </Button>
              }
              title={`${name} archiveren?`}
              description={balanceCents > 0 ? `${ARCHIVE_EXPLAINED} Haal eerst het geld uit deze pot of verplaats het.` : ARCHIVE_EXPLAINED}
              confirm="Archiveren"
              run={archive}
            />
            <Confirm
              trigger={
                <Button type="button" variant="outline" size="icon" className={`${iconButton} text-error`} aria-label="Verwijderen" title="Verwijderen">
                  <Label icon={Trash2}>Verwijderen</Label>
                </Button>
              }
              title={`${name} verwijderen?`}
              description={`Het doel en al zijn stortingen en opnames verdwijnen${balanceCents > 0 ? `, ook de ${formatEUR(balanceCents)} die erin zit` : ""}. Dit kan je niet ongedaan maken.`}
              confirm="Verwijderen"
              destructive
              run={remove}
            />
          </>
        )}
      </div>
      {isEmergency && <p className="text-sm text-ink-2">Je noodfonds kan je niet archiveren of verwijderen: je plan houdt er altijd een deel voor apart.</p>}
    </div>
  );
}
