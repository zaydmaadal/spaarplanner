"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reorderGoalsAction } from "@/data/actions/goals";
import { moved } from "./helpers";

// The order of the list is the priority of the goals (spec 8.4). `ids` is the whole list in its current order.
export function ReorderButtons({ ids, id, name }: { ids: string[]; id: string; name: string }) {
  const [pending, startTransition] = useTransition();
  const place = ids.indexOf(id);
  const move = (by: -1 | 1) =>
    startTransition(async () => {
      const result = await reorderGoalsAction(moved(ids, id, by));
      if (!result.ok) toast.error(result.error);
    });
  return (
    <div className="flex shrink-0">
      <Button type="button" variant="ghost" size="icon" aria-label={`Zet ${name} hoger`} disabled={pending || place <= 0} onClick={() => move(-1)}>
        <ChevronUp aria-hidden />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label={`Zet ${name} lager`} disabled={pending || place < 0 || place === ids.length - 1} onClick={() => move(1)}>
        <ChevronDown aria-hidden />
      </Button>
    </div>
  );
}
