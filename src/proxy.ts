import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/data/database.types";
import { adminUserIds, publicEnv } from "@/lib/env";
import { hideAdminPath, redirectTarget } from "@/lib/paths";

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    // React needs eval in development only (Next CSP guide).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' ${new URL(publicEnv.supabaseUrl).origin}`,
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");

  // Next reads the nonce from the request's CSP header while rendering.
  const requestInit = () => {
    const headers = new Headers(request.headers);
    headers.set("x-nonce", nonce);
    headers.set("Content-Security-Policy", csp);
    return { request: { headers } };
  };
  const next = () => NextResponse.next(requestInit());

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
  const target = redirectTarget(request.nextUrl.pathname, data?.claims ?? null);

  // A redirect or rewrite must carry the refreshed auth cookies, or the session is lost.
  const replaceResponse = (r: NextResponse) => {
    response.headers.getSetCookie().forEach((c) => r.headers.append("set-cookie", c));
    Object.entries(authHeaders).forEach(([k, v]) => r.headers.set(k, v));
    return r;
  };

  let result = response;
  if (target) {
    // 303 so a redirected POST (server action) is retried as GET; 307 keeps GET/HEAD as they are.
    const status = request.method === "GET" || request.method === "HEAD" ? 307 : 303;
    result = replaceResponse(NextResponse.redirect(new URL(target, request.url), status));
  } else if (hideAdminPath(request.nextUrl.pathname, data?.claims.sub, adminUserIds())) {
    // The page's own notFound() comes too late: the layout has started streaming a 200 by then.
    // Rewriting to a path that does not exist gives the same 404 as any unknown URL.
    result = replaceResponse(NextResponse.rewrite(new URL("/niet-gevonden-beheer", request.url), requestInit()));
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
