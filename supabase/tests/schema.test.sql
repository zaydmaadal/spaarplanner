begin;
select plan(91);

-- Two users; the trigger creates their profile and plan.
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@u.zaydmaadal.site'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@u.zaydmaadal.site');

-- Tables exist and RLS is on.
select has_table('public', t, 'table ' || t) from unnest(array[
  'profiles', 'plans', 'income_sources', 'budget_lines', 'goals', 'transactions',
  'checklist_items', 'push_subscriptions', 'notification_log', 'admin_audit', 'feedback']) as t;
select is((select relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname = t),
  true, 'RLS enabled on ' || t) from unnest(array[
  'profiles', 'plans', 'income_sources', 'budget_lines', 'goals', 'transactions',
  'checklist_items', 'push_subscriptions', 'notification_log', 'admin_audit', 'feedback']) as t;

-- Sign-up trigger and view.
select is((select username from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'a', 'trigger creates the profile with username a');
select is((select count(*) from plans where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint, 'trigger creates the plan');
select is((select prosecdef from pg_proc where oid = 'private.handle_new_user'::regproc), true, 'handle_new_user is security definer');
select is((select proconfig from pg_proc where oid = 'private.handle_new_user'::regproc), array['search_path=""'], 'handle_new_user has an empty search_path');
select is((select reloptions from pg_class where relnamespace = 'public'::regnamespace and relname = 'goal_balances'), array['security_invoker=true'], 'goal_balances is security_invoker');

update plans set emergency_share_pct = 50 where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select cmp_ok((select updated_at from plans where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), '>', now(), 'updating a plan bumps updated_at');

-- Username rule (spec 7): 1 to 20 of a-z 0-9 . _ -, starts and ends alphanumeric, no two dots in a row.
select throws_ok($$insert into auth.users (id, email) values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'x..y@u.zaydmaadal.site')$$,
  '23514', null, 'a username with two dots in a row is rejected');
select throws_ok($$update profiles set username = 'Zayd' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  '23514', null, 'an uppercase username is rejected');
select throws_ok($$update profiles set username = repeat('a', 21) where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  '23514', null, 'a username over 20 characters is rejected');

-- private functions cannot be called by the API roles.
select ok(not has_function_privilege(r, f, 'execute'), r || ' cannot execute ' || f)
from unnest(array['anon', 'authenticated']) as r, unnest(array['private.handle_new_user()', 'private.touch_updated_at()', 'private.enforce_row_cap()']) as f;

-- payday_rule must name a known type.
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{}')$$,
  '23514', null, 'a payday_rule without a type is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "bogus"}')$$,
  '23514', null, 'a payday_rule with an unknown type is rejected');

-- payday_rule must carry the fields of its type; a missing field must not slip through as NULL.
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "day_of_month", "day": 32, "weekend": "before"}')$$,
  '23514', null, 'a day_of_month rule with day 32 is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "day_of_month", "day": "15", "weekend": "before"}')$$,
  '23514', null, 'a day_of_month rule with a text day is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "day_of_month", "day": 15, "weekend": "sideways"}')$$,
  '23514', null, 'a day_of_month rule with an unknown weekend value is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "day_of_month", "day": 15}')$$,
  '23514', null, 'a day_of_month rule without weekend is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'weekly', 1, '{"type": "weekday", "weekday": 8}')$$,
  '23514', null, 'a weekday rule with weekday 8 is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'weekly', 1, '{"type": "weekday"}')$$,
  '23514', null, 'a weekday rule without weekday is rejected');
-- last_weekday (migration 20261023000001): a weekday 1 to 7 is required.
select lives_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "last_weekday", "weekday": 4}')$$,
  'a last_weekday rule with weekday 4 is accepted');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "last_weekday", "weekday": 8}')$$,
  '23514', null, 'a last_weekday rule with weekday 8 is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "last_weekday"}')$$,
  '23514', null, 'a last_weekday rule without weekday is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'yearly', 1, '{"type": "irregular"}')$$,
  '23514', null, 'a yearly income without month is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'once', 1, '{"type": "irregular"}')$$,
  '23514', null, 'a one-off income without date is rejected');
select lives_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, month, date, payday_rule) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a', 'salary', 'monthly', 1, null, null, '{"type": "day_of_month", "day": 31, "weekend": "after"}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'b', 'salary', 'weekly', 1, null, null, '{"type": "weekday", "weekday": 7}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'c', 'salary', 'monthly', 1, null, null, '{"type": "last_working_day"}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'd', 'salary', 'yearly', 1, 12, null, '{"type": "irregular"}'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'e', 'side', 'once', 1, null, '2026-12-24', '{"type": "irregular"}')$$,
  'valid payday rules, a yearly income with month and a one-off income with date are accepted');

-- Goals.
insert into goals (id, user_id, kind, name, target_cents, priority, is_main) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'emergency', 'Noodfonds', 100000, 1, true);
select throws_ok($$insert into goals (user_id, kind, name, target_cents, priority) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'emergency', 'Tweede', 1, 2)$$,
  '23505', null, 'a second emergency goal is rejected');
select throws_ok($$insert into goals (user_id, kind, name, target_cents, priority, is_main) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trip', 'Reis', 1, 2, true)$$,
  '23505', null, 'a second main goal is rejected');
select throws_ok($$insert into goals (user_id, kind, name, target_cents, priority) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bogus', 'x', 1, 2)$$,
  '23514', null, 'an unknown goal kind is rejected');
select throws_ok($$insert into goals (user_id, kind, name, target_cents, priority) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trip', 'x', 0, 2)$$,
  '23514', null, 'a goal target of 0 is rejected');
select throws_ok($$insert into goals (user_id, kind, name, target_cents, priority) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trip', repeat('x', 81), 1, 2)$$,
  '23514', null, 'a goal name over 80 characters is rejected');

-- Feedback: kind is feedback or bug, the message is 1 to 2000 characters.
select lives_ok($$insert into feedback (user_id, kind, message, page) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bug', 'Het werkt niet', '/doelen')$$, 'a feedback row is accepted');
select throws_ok($$insert into feedback (user_id, kind, message) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'idee', 'x')$$,
  '23514', null, 'an unknown feedback kind is rejected');
select throws_ok($$insert into feedback (user_id, kind, message) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bug', '   ')$$,
  '23514', null, 'an empty feedback message is rejected');
select throws_ok($$insert into feedback (user_id, kind, message) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bug', repeat('x', 2001))$$,
  '23514', null, 'a feedback message over 2000 characters is rejected');

-- Prefs size.
select throws_ok($$update profiles set prefs = jsonb_build_object('x', repeat('a', 9000)) where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23514', null, 'prefs of 8 kB or more are rejected');
select lives_ok($$update profiles set prefs = '{"palette":"kersen","theme":"dark"}' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'normal prefs are accepted');
select throws_ok($$update profiles set prefs = '{"palette":"oceaan"}' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23514', null, 'a palette of phase 1 is rejected after the palettes migration');

-- Transactions.
select throws_ok($$insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 100000000001, '2026-10-21', gen_random_uuid())$$,
  '23514', null, 'an amount over 100000000000 is rejected');
insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 5000, '2026-10-21', 'cccccccc-cccc-cccc-cccc-cccccccccccc');
select throws_ok($$insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 5000, '2026-10-21', 'cccccccc-cccc-cccc-cccc-cccccccccccc')$$,
  '23505', null, 'a duplicate (user_id, client_ref) is rejected');

-- Push subscriptions.
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'http://example.com/x', 'p', 'a')$$,
  '23514', null, 'an http endpoint is rejected');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://fcm.googleapis.com.evil.com/x', 'p', 'a')$$,
  '23514', null, 'a look-alike push host is rejected');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'http://fcm.googleapis.com/fcm/send/abc', 'p', 'a')$$,
  '23514', null, 'a known push host over http is rejected');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://evil.com/https://fcm.googleapis.com/x', 'p', 'a')$$,
  '23514', null, 'a push host that is not at the start is rejected');
select lives_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://fcm.googleapis.com/fcm/send/abc', 'p', 'a')$$,
  'a known push host is accepted');

-- user_agent: 500 characters is the limit.
select lives_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://fcm.googleapis.com/fcm/send/ua500', 'p', 'a', repeat('x', 500))$$,
  'a user_agent of 500 characters is accepted');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://fcm.googleapis.com/fcm/send/ua501', 'p', 'a', repeat('x', 501))$$,
  '23514', null, 'a user_agent of 501 characters is rejected');

-- Uniqueness: one log row per user, kind and day; one checklist item per user and rule.
insert into notification_log (user_id, kind, for_date) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'payday', '2026-10-25');
select throws_ok($$insert into notification_log (user_id, kind, for_date) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'payday', '2026-10-25')$$,
  '23505', null, 'a duplicate (user_id, kind, for_date) in notification_log is rejected');
insert into checklist_items (user_id, rule_key, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'open-savings-account', 'Spaarrekening openen');
select throws_ok($$insert into checklist_items (user_id, rule_key, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'open-savings-account', 'Nog eens')$$,
  '23505', null, 'a duplicate (user_id, rule_key) in checklist_items is rejected');
select lives_ok($$insert into checklist_items (user_id, title) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Eigen taak'), ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Nog een taak')$$,
  'items without a rule_key are not limited by the unique rule');

-- Row caps per user (spec 6): the cap-th row is accepted, the next one is not, other users are unaffected.
select lives_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://fcm.googleapis.com/fcm/send/b' || n, 'p', 'a' from generate_series(1, 10) n$$,
  'a user can store 10 push subscriptions');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://fcm.googleapis.com/fcm/send/b11', 'p', 'a')$$,
  '23514', 'row limit reached for push_subscriptions', 'an 11th push subscription is rejected');
select lives_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'https://fcm.googleapis.com/fcm/send/a-other', 'p', 'a')$$,
  'a user at the cap does not limit another user');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'salary', 'monthly', 1 from generate_series(1, 21)$$,
  '23514', 'row limit reached for income_sources', 'one statement cannot go past the cap either');
select lives_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'salary', 'monthly', 1 from generate_series(1, 20)$$,
  'a user can store 20 income sources');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x', 'salary', 'monthly', 1)$$,
  '23514', 'row limit reached for income_sources', 'a 21st income source is rejected');
select lives_ok($$insert into goals (user_id, kind, name, target_cents, priority)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'other', 'x', 1, 1 from generate_series(1, 50)$$,
  'a user can store 50 goals');
select throws_ok($$insert into goals (user_id, kind, name, target_cents, priority) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'other', 'x', 1, 1)$$,
  '23514', 'row limit reached for goals', 'a 51st goal is rejected');
select lives_ok($$insert into budget_lines (user_id, kind, category, name, amount_cents)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fixed', 'x', 'x', 1 from generate_series(1, 100)$$,
  'a user can store 100 budget lines');
select throws_ok($$insert into budget_lines (user_id, kind, category, name, amount_cents) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fixed', 'x', 'x', 1)$$,
  '23514', 'row limit reached for budget_lines', 'a 101st budget line is rejected');
select lives_ok($$insert into checklist_items (user_id, title)
  select 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x' from generate_series(1, 500)$$,
  'a user can store 500 checklist items');
select throws_ok($$insert into checklist_items (user_id, title) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'x')$$,
  '23514', 'row limit reached for checklist_items', 'a 501st checklist item is rejected');
-- 20000 rows would slow the suite down: check that the trigger is there with its cap instead.
select has_trigger('public', 'transactions', 'transactions_row_cap', 'transactions has a row cap trigger');
select is((select split_part(encode(tgargs, 'escape'), E'\\000', 1) from pg_trigger where tgrelid = 'public.transactions'::regclass and tgname = 'transactions_row_cap'),
  '20000', 'the transactions cap is 20000');

-- service_role reads everything.
set local role service_role;
select lives_ok($$select count(*) from push_subscriptions$$, 'service_role can read push_subscriptions');
reset role;

-- Deleting the auth user removes all their rows.
insert into budget_lines (user_id, kind, category, name, amount_cents) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'fixed', 'wonen', 'Huur', 50000);
delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is((select count(*) from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from plans where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from income_sources where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from budget_lines where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from goals where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from transactions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from checklist_items where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from push_subscriptions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from notification_log where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint, 'deleting a user cascades to all their rows');

select * from finish();
rollback;
