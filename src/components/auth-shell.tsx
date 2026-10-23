import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

// The dark brand block: a sun with ripples (the contour), the name and one promise. Not a heading: the page has its own h1.
export function AuthHero({ className, tagline = "Zie vandaag nog wanneer je spaardoelen klaar zijn." }: { className?: string; tagline?: string }) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-hero-bg text-hero-ink", className)}>
      <div aria-hidden className="contour absolute inset-0 -z-10" />
      <div aria-hidden className="absolute -top-10 -right-10 -z-10 size-28 rounded-full bg-hero-accent" />
      <div className="rise flex items-center gap-2.5">
        <LogoMark className="ring-1 ring-hero-line" />
        <span className="font-display text-xl font-bold">Spaarplanner</span>
      </div>
      <p className="rise mt-6 max-w-md font-display text-3xl leading-tight font-bold text-balance lg:text-5xl" style={{ "--i": 1 } as React.CSSProperties}>
        {tagline}
      </p>
      <p className="rise mt-3 max-w-sm text-hero-muted" style={{ "--i": 2 } as React.CSSProperties}>
        Verdeel wat je maandelijks spaart over potjes en volg je route.
      </p>
    </div>
  );
}

// Login and register: hero on top (left from 1024 px), the form in a card that overlaps it.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,34rem)]">
      <AuthHero className="px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-14 lg:flex lg:flex-col lg:justify-center lg:px-16 lg:py-10" />
      <main className="flex flex-col justify-center px-4 pb-8 lg:px-12">
        <div className="rise relative -mt-8 flex w-full max-w-sm flex-col gap-5 self-center rounded-card border bg-surface p-5 shadow-card lg:mt-0 lg:max-w-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none" style={{ "--i": 2 } as React.CSSProperties}>
          {children}
        </div>
      </main>
    </div>
  );
}
