"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The thin bar along the top while a screen loads. The screens block until they are ready (no loading.tsx: its fallback
// made React hold the real screen back for up to 300 ms), so this is the feedback on a slow connection. The bar fades
// in after 200 ms (.load-bar), so a fast switch shows nothing. It starts on a click on any link inside the app and ends
// when the path changes.
export function NavProgress() {
  const path = usePathname();
  const [seen, setSeen] = useState(path);
  const [from, setFrom] = useState<string | null>(null);
  if (seen !== path) {
    setSeen(path);
    setFrom(null);
  }

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onClick = (e: MouseEvent) => {
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || a.target || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      if (a.origin !== location.origin || a.pathname === location.pathname) return;
      setFrom(location.pathname);
      clearTimeout(timer);
      timer = setTimeout(() => setFrom(null), 10_000); // a navigation that never arrives must not leave the bar running
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clearTimeout(timer);
    };
  }, []);

  if (from !== path) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden">
      <span className="sr-only">Even laden</span>
      <div aria-hidden className="load-bar h-full w-2/5 rounded-full bg-action" />
    </div>
  );
}
