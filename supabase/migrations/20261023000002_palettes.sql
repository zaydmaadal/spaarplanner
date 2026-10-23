-- Palettes of the redesign: oceaan, salie and grafiet become lagune, smaragd and zonsopgang; kersen is new.
-- The init migration stays as it is; the CHECK of profiles.prefs is replaced here with the new ids.
alter table public.profiles drop constraint profiles_prefs_check;

update public.profiles
set prefs = jsonb_set(prefs, '{palette}', to_jsonb(case prefs ->> 'palette'
  when 'oceaan' then 'lagune'
  when 'salie' then 'smaragd'
  else 'zonsopgang' end))
where prefs ? 'palette' and prefs ->> 'palette' not in ('zonsopgang', 'smaragd', 'lagune', 'kersen');

alter table public.profiles add constraint profiles_prefs_check check (
  jsonb_typeof(prefs) = 'object'
  and pg_column_size(prefs) < 8192
  and char_length(prefs ->> 'context_note') <= 2000
  and coalesce(prefs ->> 'palette', 'zonsopgang') in ('zonsopgang', 'smaragd', 'lagune', 'kersen')
  and coalesce(prefs ->> 'theme', 'system') in ('light', 'dark', 'system')
);
