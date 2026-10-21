import { useId, type InputHTMLAttributes, type ReactNode } from "react";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function Field({
  label,
  hint,
  error,
  name,
  ...input
}: { label: string; hint?: string; error?: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  // Next keeps the previous page mounted but hidden, so ids derived from `name` would collide across pages.
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-foreground/70">
          {hint}
        </p>
      )}
      <input
        id={id}
        name={name}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`h-11 rounded-md border border-foreground/60 bg-background px-3 ${focusRing}`}
        {...input}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children?: string }) {
  return children ? (
    <p role="alert" className="text-sm text-error">
      {children}
    </p>
  ) : null;
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`h-11 rounded-md bg-foreground px-4 font-medium text-background disabled:opacity-60 ${focusRing}`}
    >
      {children}
    </button>
  );
}
