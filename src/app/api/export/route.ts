import { readAll } from "@/data/read-all";
import { createServerSupabase } from "@/data/supabase/server";

// Spec 7: the own rows of the 8 user tables as one JSON download. Row level security does the scoping, so nothing from the
// request is used to pick rows. Of the push subscriptions only the bookkeeping is exported, not the keys (p256dh, auth) or the endpoint.
// A failed read throws: Next answers 500 and logs it, and nothing half-finished is sent.
export async function GET() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) return Response.json({ error: "Niet ingelogd." }, { status: 401 });

  const [profiles, plans, income_sources, budget_lines, goals, transactions, checklist_items, push_subscriptions] = await Promise.all([
    readAll((a, b) => supabase.from("profiles").select("*").order("id").range(a, b)),
    readAll((a, b) => supabase.from("plans").select("*").order("user_id").range(a, b)),
    readAll((a, b) => supabase.from("income_sources").select("*").order("id").range(a, b)),
    readAll((a, b) => supabase.from("budget_lines").select("*").order("id").range(a, b)),
    readAll((a, b) => supabase.from("goals").select("*").order("id").range(a, b)),
    readAll((a, b) => supabase.from("transactions").select("*").order("id").range(a, b)),
    readAll((a, b) => supabase.from("checklist_items").select("*").order("id").range(a, b)),
    readAll((a, b) => supabase.from("push_subscriptions").select("id, user_agent, created_at, last_success_at, failure_count").order("id").range(a, b)),
  ]);

  return new Response(
    JSON.stringify({ exported_at: new Date().toISOString(), profiles, plans, income_sources, budget_lines, goals, transactions, checklist_items, push_subscriptions }, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="spaarplanner-export.json"',
        "Cache-Control": "no-store",
      },
    },
  );
}
