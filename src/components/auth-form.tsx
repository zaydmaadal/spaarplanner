import type { InputHTMLAttributes, ReactNode } from "react";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

export function Field({
  label,
  hint,
  error,
  name,
  ...input
}: { label: string; hint?: string; error?: string; name: string } & InputHTMLAttributes<HTMLInputElement>) {
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${name}-hint`} className="text-sm text-foreground/70">
          {hint}
        </p>
      )}
      <input
        id={name}
        name={name}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`h-11 rounded-md border border-foreground/60 bg-background px-3 ${focusRing}`}
        {...input}
      />
      {error && (
        <p id={`${name}-error`} role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormError({ children }: { children?: string }) {
  return children ? (
    <p role="alert" className="text-sm text-red-700 dark:text-red-400">
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
