begin;
select plan(15);

-- Two users, each with one goal and one deposit; b also has a push subscription.
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@u.zaydmaadal.site'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@u.zaydmaadal.site');
update profiles set display_name = 'B' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
insert into goals (id, user_id, kind, name, target_cents, priority) values
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'trip', 'Reis A', 100000, 1),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'trip', 'Reis B', 100000, 1);
insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 1500, '2026-10-21', gen_random_uuid()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 700, '2026-10-21', gen_random_uuid());
insert into push_subscriptions (user_id, endpoint, p256dh, auth) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'https://fcm.googleapis.com/fcm/send/b', 'p', 'a');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

select is((select count(*) from goals where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'a cannot see the goals of b');
select is((select count(*) from goals where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 1::bigint, 'a sees their own goal');
select is((select count(*) from push_subscriptions), 0::bigint, 'a cannot see the push subscription of b');
select throws_ok($$insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 100, '2026-10-21', gen_random_uuid())$$,
  '23503', null, 'a cannot book on the goal of b');
select throws_ok($$insert into transactions (user_id, goal_id, amount_cents, occurred_on, client_ref) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 100, '2026-10-21', gen_random_uuid())$$,
  '42501', null, 'a cannot insert a transaction as b');
select throws_ok($$insert into goals (user_id, kind, name, target_cents, priority) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'trip', 'x', 1, 2)$$,
  '42501', null, 'a cannot insert a goal as b');
select throws_ok($$update profiles set username = 'x' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '42501', null, 'a cannot change their username');
select lives_ok($$update profiles set display_name = 'A' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'a can change their display name');
select throws_ok($$select * from admin_audit$$, '42501', null, 'a cannot read admin_audit');
select throws_ok($$select * from notification_log$$, '42501', null, 'a cannot read notification_log');
select is((select balance_cents from goal_balances where goal_id = '11111111-1111-1111-1111-111111111111'), 1500::bigint, 'a sees their own balance');
select is((select count(*) from goal_balances where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 0::bigint, 'a does not see the balance of b');

-- Writes against rows of b match nothing; check that b is untouched.
update goals set name = 'hacked' where id = '22222222-2222-2222-2222-222222222222';
delete from goals where id = '22222222-2222-2222-2222-222222222222';
update profiles set display_name = 'hacked' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
reset role;
select is((select name from goals where id = '22222222-2222-2222-2222-222222222222'), 'Reis B', 'a cannot update or delete the goal of b');
select is((select display_name from profiles where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'B', 'a cannot update the profile of b');

set local role anon;
select throws_ok($$select * from goals$$, '42501', null, 'anon cannot read goals');
reset role;

select * from finish();
rollback;
