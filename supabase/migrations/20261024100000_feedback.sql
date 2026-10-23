-- Feedback and bug reports from users. A user inserts and reads only their own rows; the admin page reads all of
-- them and marks them handled through the service role, so authenticated gets no update or delete.
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('feedback', 'bug')),
  message text not null check (char_length(btrim(message)) between 1 and 2000),
  page text check (char_length(page) <= 200),
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.feedback (user_id);
create index on public.feedback (created_at desc);

alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
grant all on public.feedback to service_role;
grant select, insert on public.feedback to authenticated;

create policy "own rows" on public.feedback for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "insert own rows" on public.feedback for insert to authenticated
  with check ((select auth.uid()) = user_id);

create trigger feedback_row_cap before insert on public.feedback
  for each row execute function private.enforce_row_cap(200);
