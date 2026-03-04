-- Profile Media, Voice, and Stories (run after supabase_migration.sql).
-- Profiles are identified by (tree_id, profile_id) where profile_id is the client-generated id (e.g. profile-1).
--
-- Storage: In Supabase Dashboard → Storage, create a bucket named "profile-assets".
-- Set it to Public so file URLs work without signed tokens, or use RLS/signed URLs in the app.

-- Profile media (photos/videos)
create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  profile_id text not null,
  file_path text not null,
  file_type text not null check (file_type in ('image', 'video')),
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_media_tree_profile on public.profile_media (tree_id, profile_id);

alter table public.profile_media enable row level security;

create policy "Allow service role full access to profile_media"
  on public.profile_media for all
  using (true)
  with check (true);

-- Profile voice (audio)
create table if not exists public.profile_voice (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  profile_id text not null,
  file_path text not null,
  duration_seconds numeric(10, 2),
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_voice_tree_profile on public.profile_voice (tree_id, profile_id);

alter table public.profile_voice enable row level security;

create policy "Allow service role full access to profile_voice"
  on public.profile_voice for all
  using (true)
  with check (true);

-- Profile stories
create table if not exists public.profile_stories (
  id uuid primary key default gen_random_uuid(),
  tree_id uuid not null references public.trees(id) on delete cascade,
  profile_id text not null,
  title text not null,
  date_created date not null default current_date,
  main_text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_stories_tree_profile on public.profile_stories (tree_id, profile_id);

alter table public.profile_stories enable row level security;

create policy "Allow service role full access to profile_stories"
  on public.profile_stories for all
  using (true)
  with check (true);
