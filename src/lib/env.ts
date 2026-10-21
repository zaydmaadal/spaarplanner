import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_AUTH_EMAIL_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(1),
});

const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_SUBJECT: z.string().min(1),
  CRON_SECRET: z.string().min(32),
});

type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  authEmailDomain: string;
  vapidPublicKey: string;
};

let publicCache: PublicEnv | undefined;
function loadPublic(): PublicEnv {
  if (!publicCache) {
    // Literal process.env.NEXT_PUBLIC_* reads: Next only inlines those into the browser bundle.
    const parsed = publicSchema.safeParse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_AUTH_EMAIL_DOMAIN: process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    });
    if (!parsed.success) throw new Error(`Invalid public environment: ${z.prettifyError(parsed.error)}`);
    const e = parsed.data;
    publicCache = {
      supabaseUrl: e.NEXT_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      authEmailDomain: e.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN,
      vapidPublicKey: e.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    };
  }
  return publicCache;
}

// Getters validate on first access, so `next build` in CI works without a Supabase project.
// Plain enumerable getters (not a Proxy) so Object.keys and spread work.
export const publicEnv: PublicEnv = {
  get supabaseUrl() {
    return loadPublic().supabaseUrl;
  },
  get supabasePublishableKey() {
    return loadPublic().supabasePublishableKey;
  },
  get authEmailDomain() {
    return loadPublic().authEmailDomain;
  },
  get vapidPublicKey() {
    return loadPublic().vapidPublicKey;
  },
};

// Called from next.config.ts on Vercel so a missing public variable fails the build.
export function validatePublicEnv(): void {
  loadPublic();
}

export function signupConfig(): { mode: "open" | "invite" | "closed"; inviteCode: string | null; hourlyCap: number } {
  const mode = z.enum(["open", "invite", "closed"]).parse(process.env.SIGNUP_MODE || "closed");
  const inviteCode = process.env.INVITE_CODE || null;
  if (mode === "invite" && !inviteCode) throw new Error("INVITE_CODE is required when SIGNUP_MODE=invite");
  // Invalid throws (like SIGNUP_MODE) so a typo can never switch the cap off; CI e2e raises it.
  const hourlyCap = z.coerce.number().int().positive().default(5).parse(process.env.SIGNUP_HOURLY_CAP || undefined);
  return { mode, inviteCode, hourlyCap };
}

// Read on its own (not through serverEnv) so proxy.ts needs no other secret to hide /beheer from non-admins.
export function adminUserIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

type ServerEnv = {
  supabaseSecretKey: string;
  vapidPrivateKey: string;
  vapidSubject: string;
  cronSecret: string;
  adminUserIds: string[];
};

let serverCache: ServerEnv | undefined;
export function serverEnv(): ServerEnv {
  if (!serverCache) {
    const parsed = serverSchema.safeParse(process.env);
    if (!parsed.success) throw new Error(`Invalid server environment: ${z.prettifyError(parsed.error)}`);
    const e = parsed.data;
    serverCache = {
      supabaseSecretKey: e.SUPABASE_SECRET_KEY,
      vapidPrivateKey: e.VAPID_PRIVATE_KEY,
      vapidSubject: e.VAPID_SUBJECT,
      cronSecret: e.CRON_SECRET,
      adminUserIds: adminUserIds(),
    };
  }
  return serverCache;
}
