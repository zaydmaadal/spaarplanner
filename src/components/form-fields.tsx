"use client";

import { CalendarDays, Check, Plus, Trash2 } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Labels are always visible; hint and error are tied to the control with aria-describedby. Ids come from useId,
// because Next keeps the previous page mounted but hidden.
type Base = { label: string; hint?: string; error?: string };
type Aria = { id: string; "aria-describedby"?: string; "aria-invalid"?: true };

function Frame({ label, hint, error, children }: Base & { children: (aria: Aria) => ReactNode }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-semibold">
        {label}
      </Label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

type Controlled = { value: string; onChange: (value: string) => void };
type Extra<T extends "input" | "select" | "textarea"> = Omit<ComponentProps<T>, "id" | "value" | "onChange" | "className">;

export function TextField({ label, hint, error, value, onChange, ...input }: Base & Controlled & Extra<"input">) {
  return (
    <Frame label={label} hint={hint} error={error}>
      {(aria) => <Input {...input} {...aria} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Frame>
  );
}

// A month ("2027-03") as <input type="month">, made to look like a date field on every browser: calendar icon in front and
// a placeholder (the native ones show none when empty). Native month inputs overflow narrow cards on iOS without min-w-0.
export function MonthField({ label, hint, error, value, onChange, ...input }: Base & Controlled & Extra<"input">) {
  return (
    <Frame label={label} hint={hint} error={error}>
      {(aria) => (
        <div className="relative">
          <CalendarDays aria-hidden className="pointer-events-none absolute inset-y-0 left-3 my-auto size-5 text-ink-2" />
          {!value && (
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-11 flex items-center text-ink-2">
              Kies een maand
            </span>
          )}
          <Input
            {...input}
            {...aria}
            type="month"
            className={cn("block min-w-0 max-w-full appearance-none pl-11", !value && "not-focus:text-transparent")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </Frame>
  );
}

// A fixed euro sign in front; comma and dot are both fine (parseEuroInput). `onRemove` adds a "Verwijderen" button, for a
// stored amount that is not a row of a list (those have their own, see Item).
export function MoneyField({ label, hint, error, value, onChange, onRemove, ...input }: Base & Controlled & Extra<"input"> & { onRemove?: () => void }) {
  return (
    <Frame label={label} hint={hint} error={error}>
      {(aria) => (
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-2">
              €
            </span>
            <Input {...input} {...aria} inputMode="decimal" autoComplete="off" className="pl-8 tabular-nums" value={value} onChange={(e) => onChange(e.target.value)} />
          </div>
          {onRemove && (
            <Button type="button" variant="ghost" onClick={onRemove} aria-label={`${label} verwijderen`}>
              Verwijderen
            </Button>
          )}
        </div>
      )}
    </Frame>
  );
}

const control =
  "w-full rounded-md border border-input bg-surface px-3 text-base shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring aria-invalid:border-destructive";

export function SelectField({
  label,
  hint,
  error,
  value,
  onChange,
  options,
  ...select
}: Base & Controlled & Extra<"select"> & { options: { value: string; label: string }[] }) {
  return (
    <Frame label={label} hint={hint} error={error}>
      {(aria) => (
        <select {...select} {...aria} className={cn(control, "h-11")} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Frame>
  );
}

export function TextareaField({ label, hint, error, value, onChange, ...area }: Base & Controlled & Extra<"textarea">) {
  return (
    <Frame label={label} hint={hint} error={error}>
      {(aria) => <textarea {...area} {...aria} className={cn(control, "min-h-28 py-2")} value={value} onChange={(e) => onChange(e.target.value)} />}
    </Frame>
  );
}

export function CheckField({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onChange(value === true)} aria-describedby={hint ? `${id}-hint` : undefined} className="mt-2.5" />
      <div className="flex flex-col gap-0.5 py-2.5">
        <Label htmlFor={id} className="text-base leading-snug">
          {label}
        </Label>
        {hint && (
          <p id={`${id}-hint`} className="text-sm text-ink-2">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

const pill = "inline-flex min-h-11 items-center gap-1.5 rounded-full border-2 px-4 text-sm font-semibold";
const pillState = (on: boolean) => (on ? "border-ink bg-tint text-ink" : "border-hairline bg-surface text-ink");

// One choice out of a few. The selected one also gets a check mark, so colour is never the only signal.
export function Choice<T extends string>({
  legend,
  value,
  options,
  onChange,
  error,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  error?: string;
}) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1.5" aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o.value} className={cn(pill, "cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink", pillState(value === o.value))}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {value === o.value && <Check aria-hidden className="size-4" />}
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </fieldset>
  );
}

// Buttons that switch an item on or off, e.g. the usual fixed costs. `on` tells which are on; `more` adds one last
// button that is not a switch, for "something else".
export function Toggles({
  legend,
  items,
  on,
  onToggle,
  more,
}: {
  legend: string;
  items: { id: string; label: string; hint?: string }[];
  on: (id: string) => boolean;
  onToggle: (id: string) => void;
  more?: { label: string; onClick: () => void };
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <button key={item.id} type="button" aria-pressed={on(item.id)} onClick={() => onToggle(item.id)} className={cn(pill, "cursor-pointer", pillState(on(item.id)))}>
            {on(item.id) && <Check aria-hidden className="size-4" />}
            {item.label}
            {item.hint && <span className="font-normal text-ink-2">{item.hint}</span>}
          </button>
        ))}
        {more && (
          <button type="button" onClick={more.onClick} className={cn(pill, "cursor-pointer", pillState(false))}>
            <Plus aria-hidden className="size-4" />
            {more.label}
          </button>
        )}
      </div>
    </fieldset>
  );
}

// One row of a list form (an extra income, a cost, a goal) with its own remove button.
export function Item({ title, onRemove, children }: { title: string; onRemove: () => void; children: ReactNode }) {
  return (
    <div role="group" aria-label={title} className="flex flex-col gap-4 border-t border-hairline pt-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold">{title}</p>
        <Button type="button" variant="outline" onClick={onRemove} aria-label={`${title} verwijderen`}>
          <Trash2 aria-hidden />
          Verwijder
        </Button>
      </div>
      {children}
    </div>
  );
}
