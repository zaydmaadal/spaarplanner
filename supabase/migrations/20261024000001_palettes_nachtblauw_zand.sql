-- Feedback round 2: nachtblauw (the new default) and zand join the palettes. Only the CHECK on profiles.prefs is
-- widened; stored palettes stay as they are, and a profile without a palette now reads as nachtblauw.
alter table public.profiles drop constraint profiles_prefs_check;

alter table public.profiles add constraint profiles_prefs_check check (
  jsonb_typeof(prefs) = 'object'
  and pg_column_size(prefs) < 8192
  and char_length(prefs ->> 'context_note') <= 2000
  and coalesce(prefs ->> 'palette', 'nachtblauw') in ('nachtblauw', 'zand', 'zonsopgang', 'smaragd', 'lagune', 'kersen')
  and coalesce(prefs ->> 'theme', 'system') in ('light', 'dark', 'system')
);
