import { createServerSupabase } from "@/data/supabase/server";

// Rows the API returns per request at most (max_rows in supabase/config.toml).
const PAGE = 1000;

async function read<T>(query: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const { data, error } = await query;
  if (error || !data) throw error ?? new Error("Missing rows");
  return data;
}

// Spec 7: the own rows of the 8 user tables as one JSON download. Row level security does the scoping, so nothing from the
// request is used to pick rows. Of the push subscriptions only the bookkeeping is exported, not the keys (p256dh, auth) or the endpoint.
// A failed read throws: Next answers 500 and logs it, and nothing half-finished is sent.
export async function GET() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims.sub) return Response.json({ error: "Niet ingelogd." }, { status: 401 });

  // A user can have 20.000 transactions: read them page by page, in a fixed order.
  const transactions = async () => {
    const all = [];
    for (let from = 0; ; from += PAGE) {
      const rows = await read(supabase.from("transactions").select("*").order("created_at").order("id").range(from, from + PAGE - 1));
      all.push(...rows);
      if (rows.length < PAGE) return all;
    }
  };
  const [profiles, plans, income_sources, budget_lines, goals, transactionRows, checklist_items, push_subscriptions] = await Promise.all([
    read(supabase.from("profiles").select("*")),
    read(supabase.from("plans").select("*")),
    read(supabase.from("income_sources").select("*")),
    read(supabase.from("budget_lines").select("*")),
    read(supabase.from("goals").select("*")),
    transactions(),
    read(supabase.from("checklist_items").select("*")),
    read(supabase.from("push_subscriptions").select("id, user_agent, created_at, last_success_at, failure_count")),
  ]);

  return new Response(
    JSON.stringify({ exported_at: new Date().toISOString(), profiles, plans, income_sources, budget_lines, goals, transactions: transactionRows, checklist_items, push_subscriptions }, null, 2),
    {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="spaarplanner-export.json"',
        "Cache-Control": "no-store",
      },
    },
  );
}
