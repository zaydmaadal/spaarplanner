import { timingSafeEqual } from "node:crypto";
import { runPaydayCron } from "@/data/cron/payday";
import { createAdminSupabase } from "@/data/supabase/admin";
import { serverEnv } from "@/lib/env";
import { sendPush } from "@/lib/push";

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Reading the header also makes the handler dynamic (Cache Components).
export async function GET(request: Request) {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const wanted = Buffer.from(`Bearer ${serverEnv().cronSecret}`);
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runPaydayCron(new Date(), { db: createAdminSupabase(), send: sendPush }));
}
