import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

// The dark brand block: the mark, the name and one promise on soft ripples (the contour). Not a heading: the page has its own h1.
export function AuthHero({ className, tagline = "Zie vandaag nog wanneer je spaardoelen klaar zijn." }: { className?: string; tagline?: string }) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-hero-bg text-hero-ink", className)}>
      <div aria-hidden className="contour absolute inset-0 -z-10" />
      <div className="rise flex items-center gap-3">
        <LogoMark className="size-10 ring-1 ring-hero-line lg:size-12" />
        <span className="font-display text-xl font-bold lg:text-2xl">Spaarplanner</span>
      </div>
      <p className="rise mt-6 max-w-md font-display text-3xl leading-tight font-bold text-balance lg:mt-10 lg:text-5xl" style={{ "--i": 1 } as React.CSSProperties}>
        {tagline}
      </p>
      <p className="rise mt-3 max-w-sm text-hero-muted lg:mt-4 lg:text-lg" style={{ "--i": 2 } as React.CSSProperties}>
        Verdeel wat je maandelijks spaart over potjes en volg je route.
      </p>
    </div>
  );
}

// Login and register. Phone: the hero on top and the form in a card that overlaps it. From 1024 px: hero and form side by
// side, each as tall as the window and no taller (they scroll apart only when the window is lower than the form).
export function AuthShell({ children, tagline }: { children: React.ReactNode; tagline?: string }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <AuthHero tagline={tagline} className="px-6 pt-[calc(env(safe-area-inset-top)+2rem)] pb-14 lg:flex lg:flex-col lg:justify-center lg:px-14 lg:py-10 xl:px-24" />
      <main className="flex flex-col justify-center px-4 pb-8 lg:px-12 lg:py-10">
        <div
          className="rise relative -mt-8 flex w-full max-w-sm flex-col gap-5 self-center rounded-card border bg-surface p-5 shadow-card lg:mt-0 lg:max-w-md lg:gap-4 lg:rounded-hero lg:p-8"
          style={{ "--i": 2 } as React.CSSProperties}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
