begin;
select plan(53);

-- Two users; the trigger creates their profile and plan.
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@u.zaydmaadal.site'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@u.zaydmaadal.site');

-- Tables exist and RLS is on.
select has_table('public', t, 'table ' || t) from unnest(array[
  'profiles', 'plans', 'income_sources', 'budget_lines', 'goals', 'transactions',
  'checklist_items', 'push_subscriptions', 'notification_log', 'admin_audit']) as t;
select is((select relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname = t),
  true, 'RLS enabled on ' || t) from unnest(array[
  'profiles', 'plans', 'income_sources', 'budget_lines', 'goals', 'transactions',
  'checklist_items', 'push_subscriptions', 'notification_log', 'admin_audit']) as t;

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
from unnest(array['anon', 'authenticated']) as r, unnest(array['private.handle_new_user()', 'private.touch_updated_at()']) as f;

-- payday_rule must name a known type.
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{}')$$,
  '23514', null, 'a payday_rule without a type is rejected');
select throws_ok($$insert into income_sources (user_id, name, kind, frequency, amount_cents, payday_rule) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'x', 'salary', 'monthly', 1, '{"type": "bogus"}')$$,
  '23514', null, 'a payday_rule with an unknown type is rejected');

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

-- Prefs size.
select throws_ok($$update profiles set prefs = jsonb_build_object('x', repeat('a', 9000)) where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23514', null, 'prefs of 8 kB or more are rejected');
select lives_ok($$update profiles set prefs = '{"palette":"salie","theme":"dark"}' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'normal prefs are accepted');

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

-- service_role reads everything.
set local role service_role;
select lives_ok($$select count(*) from push_subscriptions$$, 'service_role can read push_subscriptions');
reset role;

-- Deleting the auth user removes all their rows.
delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is((select count(*) from profiles where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from plans where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from goals where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from transactions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  + (select count(*) from push_subscriptions where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0::bigint, 'deleting a user cascades to all their rows');

select * from finish();
rollback;
