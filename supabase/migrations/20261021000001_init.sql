-- Phase 1 schema (spec section 6). Every table: RLS on, no access for anon,
-- own rows only for authenticated, everything for service_role (server only).

create schema if not exists private;
-- Nothing in private is callable through the API: the schema has no usage grant and the explicit revoke
-- after handle_new_user covers every function. The next line only records intent: schema defaults are
-- added to the global ones, so it cannot remove the implicit PUBLIC execute on its own.
alter default privileges in schema private revoke execute on functions from public;

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9]([a-z0-9._-]{0,18}[a-z0-9])?$' and username !~ '\.\.'), -- spec 7
  display_name text check (char_length(display_name) <= 80),
  locale text not null default 'nl-BE' check (char_length(locale) <= 80),
  currency text not null default 'EUR' check (char_length(currency) <= 80),
  timezone text not null default 'Europe/Brussels' check (char_length(timezone) <= 80),
  onboarding_step smallint not null default 0 check (onboarding_step between 0 and 8),
  onboarding_completed_at timestamptz,
  prefs jsonb not null default '{}' check (
    jsonb_typeof(prefs) = 'object'
    and pg_column_size(prefs) < 8192
    and char_length(prefs ->> 'context_note') <= 2000
    and coalesce(prefs ->> 'palette', 'oceaan') in ('oceaan', 'salie', 'grafiet')
    and coalesce(prefs ->> 'theme', 'system') in ('light', 'dark', 'system')
  ),
  created_at timestamptz not null default now()
);

-- plans ---------------------------------------------------------------------
create table public.plans (
  user_id uuid primary key references auth.users (id) on delete cascade,
  monthly_savings_cents bigint check (monthly_savings_cents between -100000000000 and 100000000000),
  emergency_share_pct smallint not null default 100 check (emergency_share_pct between 0 and 100),
  income_mode text not null default 'careful' check (income_mode in ('careful', 'normal')),
  include_one_off_income boolean not null default false,
  updated_at timestamptz not null default now()
);

-- clock_timestamp(), not now(): now() is frozen inside a transaction.
create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end $$;

create trigger plans_touch_updated_at before update on public.plans
  for each row execute function private.touch_updated_at();

-- income_sources ------------------------------------------------------------
create table public.income_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  kind text not null check (kind in ('salary', 'side', 'student', 'benefit', 'allowance', 'other')),
  frequency text not null check (frequency in ('monthly', 'weekly', 'biweekly', 'yearly', 'once')),
  amount_cents bigint not null check (amount_cents between -100000000000 and 100000000000),
  amount_low_cents bigint check (amount_low_cents between -100000000000 and 100000000000),
  variability text not null default 'fixed' check (variability in ('fixed', 'variable')),
  month smallint check (month between 1 and 12),
  date date,
  payday_rule jsonb not null default '{"type": "irregular"}' check (
    jsonb_typeof(payday_rule) = 'object'
    and payday_rule ? 'type'
    and payday_rule ->> 'type' in ('day_of_month', 'last_working_day', 'weekday', 'irregular')
    and pg_column_size(payday_rule) < 512
  ),
  is_estimate boolean not null default false,
  active boolean not null default true
);
create index on public.income_sources (user_id);

-- budget_lines --------------------------------------------------------------
create table public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('fixed', 'living', 'free')),
  category text not null check (char_length(category) <= 80),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  amount_cents bigint not null check (amount_cents between -100000000000 and 100000000000),
  is_estimate boolean not null default false,
  sort integer not null default 0
);
create index on public.budget_lines (user_id);

-- goals ---------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('emergency', 'savings', 'trip', 'purchase', 'other')),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  target_cents bigint not null check (target_cents > 0 and target_cents <= 100000000000),
  target_is_estimate boolean not null default false,
  deadline date,
  priority smallint not null check (priority >= 1),
  weight smallint not null default 1 check (weight >= 1),
  is_main boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  color_token text check (char_length(color_token) <= 80),
  created_at timestamptz not null default now(),
  unique (id, user_id)
);
create index on public.goals (user_id);
create unique index goals_one_emergency on public.goals (user_id) where kind = 'emergency';
create unique index goals_one_main on public.goals (user_id) where is_main;

-- transactions --------------------------------------------------------------
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid not null,
  amount_cents bigint not null check (amount_cents between -100000000000 and 100000000000),
  occurred_on date not null,
  note text check (char_length(note) <= 200),
  source text not null default 'manual' check (source in ('manual', 'start', 'import', 'ai')),
  created_at timestamptz not null default now(),
  client_ref uuid not null,
  unique (user_id, client_ref), -- makes a double submit idempotent; also the user_id index
  -- (goal_id, user_id) keeps anyone from booking on the goal of another user
  foreign key (goal_id, user_id) references public.goals (id, user_id) on delete cascade
);
create index on public.transactions (goal_id, user_id);

-- checklist_items -----------------------------------------------------------
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rule_key text check (char_length(rule_key) <= 80),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text check (char_length(body) <= 1000),
  urgency text not null default 'later' check (urgency in ('week', 'month', 'later')),
  due_on date,
  certainty_level smallint check (certainty_level between 1 and 5),
  certainty_reason text check (char_length(certainty_reason) <= 1000),
  source text not null default 'user' check (source in ('rule', 'user', 'ai')),
  done_at timestamptz,
  dismissed_at timestamptz,
  unique (user_id, rule_key) -- also the user_id index
);

-- push_subscriptions --------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (
    char_length(endpoint) <= 1000
    and endpoint ~ '^https://(fcm\.googleapis\.com|[a-z0-9.-]+\.push\.apple\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.notify\.windows\.com)/'
  ),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 200),
  user_agent text check (char_length(user_agent) <= 500),
  created_at timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0)
);
create index on public.push_subscriptions (user_id);

-- notification_log (written by the cron only) -------------------------------
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('payday')),
  for_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, kind, for_date) -- also the user_id index
);

-- admin_audit (service_role only; rows outlive the users they mention) ------
create table public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  target_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) <= 80),
  created_at timestamptz not null default now()
);
create index on public.admin_audit (admin_id);
create index on public.admin_audit (target_user_id);

-- balance per goal = sum of its transactions --------------------------------
create view public.goal_balances with (security_invoker = true) as
select g.id as goal_id, g.user_id, coalesce(sum(t.amount_cents), 0)::bigint as balance_cents
from public.goals g
left join public.transactions t on t.goal_id = g.id and t.user_id = g.user_id
group by g.id, g.user_id;

-- access --------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profiles', 'plans', 'income_sources', 'budget_lines', 'goals', 'transactions',
    'checklist_items', 'push_subscriptions', 'notification_log', 'admin_audit'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

revoke all on public.goal_balances from anon, authenticated;
grant select on public.goal_balances to authenticated;
grant all on public.goal_balances to service_role;

-- Own rows only. profiles and plans are created by the sign-up trigger, so no insert or delete.
grant select, update (display_name, locale, currency, timezone, onboarding_step, onboarding_completed_at, prefs)
  on public.profiles to authenticated;
grant select, update on public.plans to authenticated;
grant select, insert, update, delete on public.income_sources, public.budget_lines, public.goals,
  public.transactions, public.checklist_items, public.push_subscriptions to authenticated;

create policy "own row" on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "own rows" on public.plans for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.income_sources for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.budget_lines for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.transactions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.checklist_items for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "own rows" on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- No grants for authenticated, so these policies never match; they only state the intent.
create policy "service role only" on public.notification_log for all to authenticated using (false);
create policy "service role only" on public.admin_audit for all to authenticated using (false);

-- sign-up trigger -----------------------------------------------------------
create function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username) values (new.id, split_part(new.email, '@', 1));
  insert into public.plans (user_id) values (new.id);
  return new;
end $$;

revoke all on all functions in schema private from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();
