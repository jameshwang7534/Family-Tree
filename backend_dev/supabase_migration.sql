-- Run this in Supabase Dashboard → SQL Editor to create the required tables.

-- Users table (auth profiles; passwords are bcrypt-hashed in the backend)
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null,
  first_name text not null,
  last_name text not null,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Allow service role full access to users"
  on public.users for all
  using (true)
  with check (true);

-- Trees table
create table if not exists public.trees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  icon_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.trees enable row level security;

create policy "Allow service role full access to trees"
  on public.trees for all
  using (true)
  with check (true);
