const PUBLIC_EXACT = ["/inloggen", "/registreren", "/privacy", "/manifest.webmanifest"];
const PUBLIC_PREFIX = ["/api/cron/", "/icons/", "/_next/"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.includes(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}
