begin;
select plan(5);

insert into auth.users (id, email) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@u.zaydmaadal.site');

select lives_ok($$update profiles set prefs = '{"palette":"nachtblauw"}' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'nachtblauw is accepted');
select lives_ok($$update profiles set prefs = '{"palette":"zand","theme":"dark"}' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'zand is accepted');
select lives_ok($$update profiles set prefs = '{"palette":"zonsopgang"}' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'the earlier palettes are still accepted');
select lives_ok($$update profiles set prefs = '{}' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$, 'prefs without a palette are accepted');
select throws_ok($$update profiles set prefs = '{"palette":"neon"}' where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  '23514', null, 'an unknown palette is rejected');

select * from finish();
rollback;
