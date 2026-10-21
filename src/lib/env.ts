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
  ADMIN_USER_IDS: z.string().default(""),
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

// Validated on first property access, so `next build` in CI works without a Supabase project.
export const publicEnv = new Proxy({} as PublicEnv, {
  get: (_, key) => loadPublic()[key as keyof PublicEnv],
});

export function signupConfig(): { mode: "open" | "invite" | "closed"; inviteCode: string | null } {
  const mode = z.enum(["open", "invite", "closed"]).parse(process.env.SIGNUP_MODE || "closed");
  const inviteCode = process.env.INVITE_CODE || null;
  if (mode === "invite" && !inviteCode) throw new Error("INVITE_CODE is required when SIGNUP_MODE=invite");
  return { mode, inviteCode };
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
      adminUserIds: e.ADMIN_USER_IDS.split(",").map((s) => s.trim()).filter(Boolean),
    };
  }
  return serverCache;
}
