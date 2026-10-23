-- Payday rule "last <weekday> of the month": widens income_sources.payday_rule with type 'last_weekday'.
alter table public.income_sources drop constraint income_sources_payday_rule_check;
alter table public.income_sources add constraint income_sources_payday_rule_check check (
  jsonb_typeof(payday_rule) = 'object'
  and payday_rule ? 'type'
  and payday_rule ->> 'type' in ('day_of_month', 'last_working_day', 'weekday', 'last_weekday', 'irregular')
  and pg_column_size(payday_rule) < 512
  -- coalesce: a missing field makes the CASE null, and a null CHECK passes.
  and coalesce(case payday_rule ->> 'type'
    when 'day_of_month' then jsonb_typeof(payday_rule -> 'day') = 'number'
      and payday_rule ->> 'day' ~ '^([1-9]|[12][0-9]|3[01])$'
      and payday_rule ->> 'weekend' in ('before', 'after')
    when 'weekday', 'last_weekday' then jsonb_typeof(payday_rule -> 'weekday') = 'number'
      and payday_rule ->> 'weekday' ~ '^[1-7]$'
    else true
  end, false)
);
