"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ReactNode } from "react";

// Wraps a password input: the render prop gets the input type, the eye button sits inside the input on the right.
// Give the input `pr-12` so the text does not run under the button.
export function PasswordToggle({ children }: { children: (type: "text" | "password") => ReactNode }) {
  const [shown, setShown] = useState(false);
  const Icon = shown ? EyeOff : Eye;
  return (
    <div className="relative">
      {children(shown ? "text" : "password")}
      <button
        type="button"
        aria-pressed={shown}
        aria-label={shown ? "Verberg wachtwoord" : "Toon wachtwoord"}
        onClick={() => setShown(!shown)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-md text-ink-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
      >
        <Icon aria-hidden className="size-5" />
      </button>
    </div>
  );
}
