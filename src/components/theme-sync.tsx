"use client";

import { useEffect } from "react";
import type { Palette, Theme } from "@/lib/prefs";

// The root layout survives client navigation, so after a login its <html> still has the logged-out defaults until the
// layout renders again (router.refresh). This puts the stored palette and theme on <html> whenever they change.
export function ThemeSync({ palette, theme }: { palette: Palette; theme: Theme }) {
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    document.documentElement.dataset.theme = theme;
  }, [palette, theme]);
  return null;
}
