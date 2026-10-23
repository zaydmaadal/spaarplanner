"use client";

import { useEffect, useRef } from "react";
import { formatEUR } from "@/domain/money";
import { cn } from "@/lib/utils";

// The final amount is in the HTML; once mounted it counts up from 70% in 600 ms (not with reduced motion).
export function CountUp({ cents, className }: { cents: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const t = Math.min(1, (now - start) / 600);
      el.textContent = formatEUR(Math.round(cents * (0.7 + 0.3 * (1 - (1 - t) ** 3))));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [cents]);
  return (
    <span ref={ref} className={cn("font-display font-semibold whitespace-nowrap tabular-nums", className)}>
      {formatEUR(cents)}
    </span>
  );
}
