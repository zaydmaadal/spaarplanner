import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/data/database.types";
import { publicEnv } from "@/lib/env";
import { isPublicPath } from "@/lib/paths";

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    // React needs eval in development only (Next CSP guide).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' ${publicEnv.supabaseUrl}`,
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self'",
  ].join("; ");

  // Next reads the nonce from the request's CSP header while rendering.
  const next = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return NextResponse.next({ request: { headers } });
  };

  let response = next();
  let authHeaders: Record<string, string> = {};
  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        authHeaders = headers;
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Do not run code between createServerClient and getClaims: it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const { pathname } = request.nextUrl;
  const target =
    !data && !isPublicPath(pathname)
      ? "/inloggen"
      : data?.claims.app_metadata?.must_change_password && pathname !== "/wachtwoord-wijzigen"
        ? "/wachtwoord-wijzigen"
        : null;

  let result = response;
  if (target) {
    // A redirect must carry the refreshed auth cookies, or the session is lost.
    result = NextResponse.redirect(new URL(target, request.url));
    response.headers.getSetCookie().forEach((c) => result.headers.append("set-cookie", c));
    Object.entries(authHeaders).forEach(([k, v]) => result.headers.set(k, v));
  }

  result.headers.set("Content-Security-Policy", csp);
  result.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  result.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  result.headers.set("X-Content-Type-Options", "nosniff");
  return result;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
