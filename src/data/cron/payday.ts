import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/data/database.types";
import { toIncome } from "@/data/mappers";
import { readAll } from "@/data/read-all";
import { addDays, toYearMonth, todayInTimeZone } from "@/domain/dates";
import { paydayInMonth, primaryPaydayRule } from "@/domain/payday";
import type { sendPush } from "@/lib/push";

export type CronDeps = { db: SupabaseClient<Database>; send: typeof sendPush };

const PAYLOAD = { title: "Loondag!", body: "Vul in wat je opzijzette.", url: "/storten" };
const MAX_FAILURES = 5;
const CHUNK = 100; // user ids per query: 100 uuids keep the request URL far below the proxy limit

const check = ({ error }: { error: unknown }) => {
  if (error) throw error;
};

// Spec 9. Runs with the admin client and no session, so it reads the tables itself instead of loadUserData.
export async function runPaydayCron(now: Date, { db, send }: CronDeps) {
  check(await db.from("profiles").select("id", { count: "exact", head: true })); // keeps the free project awake

  const subs = await readAll((a, b) => db.from("push_subscriptions").select("*").order("id").range(a, b));
  const ids = [...new Set(subs.map((s) => s.user_id))];
  const incomes = new Map<string, ReturnType<typeof toIncome>[]>();
  const timezones = new Map<string, string>();
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    for (const row of await readAll((a, b) => db.from("income_sources").select("*").in("user_id", chunk).eq("active", true).order("id").range(a, b)))
      incomes.set(row.user_id, [...(incomes.get(row.user_id) ?? []), toIncome(row)]);
    for (const row of await readAll((a, b) => db.from("profiles").select("id, timezone").in("id", chunk).order("id").range(a, b)))
      timezones.set(row.id, row.timezone);
  }

  const result = { users: ids.length, claimed: 0, sent: 0, removed: 0 };
  for (const userId of ids) {
    try {
      const rule = primaryPaydayRule(incomes.get(userId) ?? []);
      const today = todayInTimeZone(timezones.get(userId) ?? "", now); // an unknown zone falls back to Brussels
      // Yesterday is the catch-up for one failed run; it is judged in its own month, so a payday on the last day still counts.
      const payday = rule && [today, addDays(today, -1)].find((d) => paydayInMonth(rule, toYearMonth(d)) === d);
      if (!payday) continue;

      // Claim first: the unique (user_id, kind, for_date) makes the insert fail silently the second time, so nobody gets two.
      const claim = await db
        .from("notification_log")
        .upsert({ user_id: userId, kind: "payday", for_date: payday }, { onConflict: "user_id,kind,for_date", ignoreDuplicates: true })
        .select("id");
      check(claim);
      if (!claim.data?.length) continue;
      result.claimed++;

      for (const sub of subs.filter((s) => s.user_id === userId)) {
        const outcome = await send(sub, PAYLOAD);
        const failures = sub.failure_count + 1;
        if (outcome === "ok") {
          result.sent++;
          check(await db.from("push_subscriptions").update({ last_success_at: now.toISOString(), failure_count: 0 }).eq("id", sub.id));
        } else if (outcome === "gone" || failures >= MAX_FAILURES) {
          result.removed++;
          check(await db.from("push_subscriptions").delete().eq("id", sub.id));
        } else {
          check(await db.from("push_subscriptions").update({ failure_count: failures }).eq("id", sub.id));
        }
      }
    } catch (e) {
      console.error("payday cron: user failed", userId, e); // one bad user never stops the run
    }
  }
  return result;
}
