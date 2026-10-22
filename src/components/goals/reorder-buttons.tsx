"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useRef, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reorderGoalsAction } from "@/data/actions/goals";
import { moved } from "./helpers";

// The order of the list is the priority of the goals (spec 8.4). `ids` is the whole list in its current order.
export function ReorderButtons({ ids, id, name }: { ids: string[]; id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const place = ids.indexOf(id);
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);
  const pressed = useRef<-1 | 1 | null>(null); // the arrow that was pressed, until the new order is on screen

  // The arrows are disabled while saving, which drops the focus: put it back on the same arrow, or on the other one when
  // the card reached the top or the bottom.
  useEffect(() => {
    if (pending || !pressed.current) return;
    const [same, other] = pressed.current === -1 ? [up.current, down.current] : [down.current, up.current];
    (same?.disabled ? other : same)?.focus();
    pressed.current = null;
  }, [pending]);

  const move = (by: -1 | 1) => {
    pressed.current = by;
    startTransition(async () => {
      // A dropped connection throws, and a throw in a transition would show the error card of the whole screen.
      const result = await reorderGoalsAction(moved(ids, id, by)).catch(() => null);
      if (!result) toast.error("Dat lukte niet. Probeer het opnieuw.");
      else if (!result.ok) toast.error(result.error);
    });
  };
  return (
    <div className="flex shrink-0">
      <Button ref={up} type="button" variant="ghost" size="icon" aria-label={`Zet ${name} hoger`} disabled={pending || place <= 0} onClick={() => move(-1)}>
        <ChevronUp aria-hidden />
      </Button>
      <Button ref={down} type="button" variant="ghost" size="icon" aria-label={`Zet ${name} lager`} disabled={pending || place < 0 || place === ids.length - 1} onClick={() => move(1)}>
        <ChevronDown aria-hidden />
      </Button>
    </div>
  );
}
