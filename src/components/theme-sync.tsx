"use client";

import { useEffect } from "react";
import { LOOK_COOKIE, LOOK_COOKIE_MAX_AGE, lookCookieValue, type Palette, type Theme } from "@/lib/prefs";

// Remembers the look in a plain cookie (not sensitive), so the login page shows the palette and theme of the last user.
export function rememberLook(look: { palette: Palette; theme: Theme }) {
  document.cookie = `${LOOK_COOKIE}=${lookCookieValue(look)}; path=/; max-age=${LOOK_COOKIE_MAX_AGE}; samesite=lax`;
}

// The root layout survives client navigation, so after a login its <html> still has the logged-out look until the
// layout renders again (router.refresh). This puts the stored palette and theme on <html> whenever they change,
// and in the cookie, which also covers the moment of signing in.
export function ThemeSync({ palette, theme }: { palette: Palette; theme: Theme }) {
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    document.documentElement.dataset.theme = theme;
    rememberLook({ palette, theme });
  }, [palette, theme]);
  return null;
}
