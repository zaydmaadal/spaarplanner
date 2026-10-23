"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { reorderGoalsAction } from "@/data/actions/goals";
import type { GoalView } from "@/domain/dashboard";
import { cn } from "@/lib/utils";
import { GoalCard } from "./goal-card";

function Item({ goal, horizonYears }: { goal: GoalView; horizonYears: number }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: goal.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("relative list-none", isDragging && "z-10 opacity-90 shadow-lg")}>
      <GoalCard
        goal={goal}
        horizonYears={horizonYears}
        handle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            aria-label={`Versleep ${goal.name}`}
            className="relative z-10 -mr-2 -mt-2 flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-ink-2 hover:bg-tint focus-visible:outline-2 focus-visible:outline-ink"
          >
            <GripVertical aria-hidden className="size-5" />
          </button>
        }
      />
    </li>
  );
}

const DUTCH = {
  screenReaderInstructions: {
    draggable: "Druk op spatie om dit doel op te pakken. Verplaats met de pijltjestoetsen en druk nog eens op spatie om het neer te zetten. Escape annuleert.",
  },
  announcements: {
    onDragStart: () => "Doel opgepakt.",
    onDragOver: ({ over }: { over: { id: string | number } | null }) => (over ? "Doel verplaatst." : undefined),
    onDragEnd: () => "Doel neergezet.",
    onDragCancel: () => "Verplaatsen geannuleerd.",
  },
};

// The order of the list is the priority of the goals (spec 8.4). Drag the handle, or focus it and use space, the arrow
// keys and space again. The page keys this list on the stored order, so it starts again from the props when that changes.
export function SortableGoals({ goals, horizonYears }: { goals: GoalView[]; horizonYears: number }) {
  const [order, setOrder] = useState(() => goals.map((g) => g.id));
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const dndId = useId();
  const byId = new Map(goals.map((g) => [g.id, g]));

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const before = order;
    const next = arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id)));
    setOrder(next);
    startTransition(async () => {
      // A dropped connection throws, and a throw in a transition would show the error card of the whole screen.
      const result = await reorderGoalsAction(next).catch(() => null);
      if (result?.ok) return;
      setOrder(before);
      toast.error(result ? result.error : "Dat lukte niet. Probeer het opnieuw.");
    });
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} accessibility={DUTCH}>
      <SortableContext items={order} strategy={rectSortingStrategy}>
        <ul className="grid gap-3 lg:grid-cols-2">
          {order.map((id) => (
            <Item key={id} goal={byId.get(id)!} horizonYears={horizonYears} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
