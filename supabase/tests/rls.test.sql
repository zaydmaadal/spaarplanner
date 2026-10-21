begin;
select plan(58);

-- Users a and b; the trigger gives each a profile and a plan. Every other user table gets one row per user.
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@u.zaydmaadal.site'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@u.zaydmaadal.site');
update profiles set display_name = 'B' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
insert into income_sources (user_id, name, kind, frequency, amount_cents)
  select u, 'Loon', 'salary', 'monthly', 100000 from unnest(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[]) u;
insert into budget_lines (user_id, kind, category, name, amount_cents)
  select u, 'fixed', 'wonen', 'Huur', 50000 from unnest(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[]) u;
insert into goals (id, user_id, kind, name, target_cents, priority) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trip', 'Reis A', 100000, 1),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'trip', 'Reis B', 100000, 1);
insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1500, '2026-10-21', gen_random_uuid()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 700, '2026-10-21', gen_random_uuid());
insert into checklist_items (user_id, title)
  select u, 'Titel' from unnest(array['aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb']::uuid[]) u;
insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://fcm.googleapis.com/fcm/send/a', 'p', 'a', 'agent'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://fcm.googleapis.com/fcm/send/b', 'p', 'a', 'agent');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- a sees nothing of b.
select is(c, 0::bigint, 'a cannot see the rows of b in ' || t) from (
  select 'profiles' as t, count(*) as c from profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  union all select 'plans', count(*) from plans where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  union all select 'income_sources', count(*) from income_sources where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  union all select 'budget_lines', count(*) from budget_lines where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  union all select 'goals', count(*) from goals where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  union all select 'transactions', count(*) from transactions where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  union all select 'checklist_items', count(*) from checklist_items where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  union all select 'push_subscriptions', count(*) from push_subscriptions where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') s;

-- a does see their own rows (so the zeros above are not an empty-table artefact).
select is(c, 1::bigint, 'a sees their own row in ' || t) from (
  select 'profiles' as t, count(*) as c from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  union all select 'plans', count(*) from plans where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  union all select 'income_sources', count(*) from income_sources where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  union all select 'budget_lines', count(*) from budget_lines where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  union all select 'goals', count(*) from goals where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  union all select 'transactions', count(*) from transactions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  union all select 'checklist_items', count(*) from checklist_items where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  union all select 'push_subscriptions', count(*) from push_subscriptions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') s;

-- Updates and deletes against the rows of b match nothing (checked below, after reset role).
select lives_ok($$
  update profiles set display_name = 'hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  update plans set emergency_share_pct = 0 where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  update income_sources set name = 'hacked' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  update budget_lines set name = 'hacked' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  update goals set name = 'hacked' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  update transactions set amount_cents = 1 where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  update checklist_items set title = 'hacked' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  update push_subscriptions set user_agent = 'hacked' where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  delete from income_sources where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  delete from budget_lines where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  delete from transactions where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  delete from goals where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  delete from checklist_items where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  delete from push_subscriptions where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
$$, 'a can run updates and deletes against the rows of b (they match nothing)');
select throws_ok($$delete from profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$, '42501', null, 'a cannot delete from profiles');
select throws_ok($$delete from plans where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$, '42501', null, 'a cannot delete from plans');

-- Inserting a row for b is refused on every table (profiles and plans have no insert grant at all).
select throws_ok($$insert into profiles (id, username) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x')$$, '42501', null, 'a cannot insert a profile for b');
select throws_ok($$insert into plans (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$, '42501', null, 'a cannot insert a plan for b');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'salary', 'monthly', 1)$$, '42501', null, 'a cannot insert an income source for b');
select throws_ok($$insert into budget_lines (user_id, kind, category, name, amount_cents) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fixed', 'x', 'x', 1)$$, '42501', null, 'a cannot insert a budget line for b');
select throws_ok($$insert into goals (user_id, kind, name, target_cents, priority) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'trip', 'x', 1, 2)$$, '42501', null, 'a cannot insert a goal for b');
select throws_ok($$insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 100, '2026-10-21', gen_random_uuid())$$, '42501', null, 'a cannot insert a transaction for b');
select throws_ok($$insert into checklist_items (user_id, title) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x')$$, '42501', null, 'a cannot insert a checklist item for b');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://fcm.googleapis.com/fcm/send/x', 'p', 'a')$$, '42501', null, 'a cannot insert a push subscription for b');

-- The rest of what a may and may not do.
select throws_ok($$insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 100, '2026-10-21', gen_random_uuid())$$,
  '23503', null, 'a cannot book on the goal of b');
select throws_ok($$update profiles set username = 'x' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, '42501', null, 'a cannot change their username');
select lives_ok($$update profiles set display_name = 'A' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'a can change their display name');
select lives_ok($$update plans set emergency_share_pct = 50 where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'a can update their own plan');
select cmp_ok((select updated_at from plans where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), '>', now(), 'updating the plan fires the updated_at trigger');
select throws_ok($$select * from admin_audit$$, '42501', null, 'a cannot read admin_audit');
select throws_ok($$select * from notification_log$$, '42501', null, 'a cannot read notification_log');
select is((select balance_cents from goal_balances where goal_id = '11111111-1111-1111-1111-111111111111'), 1500::bigint, 'a sees their own balance');
select is((select count(*) from goal_balances where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'a does not see the balance of b');

-- The row cap also holds for the API role (the trigger function is security definer, so it counts under RLS too).
select lives_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://fcm.googleapis.com/fcm/send/a' || n, 'p', 'a' from generate_series(2, 10) n$$,
  'a can store 10 push subscriptions');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://fcm.googleapis.com/fcm/send/a11', 'p', 'a')$$,
  '23514', 'row limit reached for push_subscriptions', 'a cannot store an 11th push subscription');

-- b is untouched.
reset role;
select is(c, 1::bigint, 'the row of b in ' || t || ' is untouched') from (
  select 'profiles' as t, count(*) as c from profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and display_name = 'B'
  union all select 'plans', count(*) from plans where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and emergency_share_pct = 100
  union all select 'income_sources', count(*) from income_sources where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and name = 'Loon'
  union all select 'budget_lines', count(*) from budget_lines where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and name = 'Huur'
  union all select 'goals', count(*) from goals where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and name = 'Reis B'
  union all select 'transactions', count(*) from transactions where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and amount_cents = 700
  union all select 'checklist_items', count(*) from checklist_items where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and title = 'Titel'
  union all select 'push_subscriptions', count(*) from push_subscriptions where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' and user_agent = 'agent') s;

-- anon has no privilege of any kind (table or column level) on the tables and the view.
select ok(not (has_table_privilege('anon', 'public.' || t, 'select,insert,update,delete,truncate,references,trigger')
  or has_any_column_privilege('anon', 'public.' || t, 'select,insert,update,references')), 'anon has no privileges on ' || t)
from unnest(array['profiles', 'plans', 'income_sources', 'budget_lines', 'goals', 'transactions',
  'checklist_items', 'push_subscriptions', 'notification_log', 'admin_audit', 'goal_balances']) as t;

-- And it really is refused.
set local role anon;
select throws_ok($$select * from goals$$, '42501', null, 'anon cannot read goals');
reset role;

select * from finish();
rollback;
