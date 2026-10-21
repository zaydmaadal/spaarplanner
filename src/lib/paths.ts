const PUBLIC_EXACT = ["/inloggen", "/registreren", "/privacy", "/manifest.webmanifest"];
const PUBLIC_PREFIX = ["/api/cron/", "/icons/", "/_next/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}

// Where the proxy must send this request, or null to let it through.
export function redirectTarget(
  pathname: string,
  // Record, not { must_change_password?: boolean }: Supabase's UserAppMetadata is not assignable to a weak type.
  claims: { app_metadata?: Record<string, unknown> } | null,
): string | null {
  if (isPublicPath(pathname)) return null;
  if (!claims) return "/inloggen";
  return claims.app_metadata?.must_change_password && pathname !== "/wachtwoord-wijzigen"
    ? "/wachtwoord-wijzigen"
    : null;
}

export const isAdminPath = (pathname: string) => pathname === "/beheer" || pathname.startsWith("/beheer/");

// /beheer exists only for admins: everyone else must get the same 404 as a path that does not exist.
// adminIds never holds "", so a missing sub is never an admin.
export function hideAdminPath(pathname: string, sub: string | undefined, adminIds: string[]): boolean {
  return isAdminPath(pathname) && !adminIds.includes(sub ?? "");
}
