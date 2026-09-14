-- Enkelsida AI - project persistence
--
-- Paste this into the Supabase SQL Editor and run it once.
--
-- Then, in the Storage tab, create a bucket named `previews` and leave it
-- PRIVATE. No storage policies are needed: only the server touches the bucket,
-- and it uses the service role key, which bypasses RLS. The /preview route
-- proxies the bytes so nothing is publicly reachable.

create extension if not exists "pgcrypto";

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Untitled',
  files jsonb not null default '{}'::jsonb,
  plan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;

-- These policies protect direct/anon access to the table (e.g. from the
-- publishable key). The server always uses the service-role client, which
-- bypasses RLS entirely - so every route handler that takes a project id
-- must independently verify auth.uid()/owner_id itself (see
-- lib/projects/authorize.ts) rather than relying on these policies.
create policy "owners read"   on public.projects for select using (auth.uid() = owner_id);
create policy "owners insert" on public.projects for insert with check (auth.uid() = owner_id);
create policy "owners update" on public.projects for update using (auth.uid() = owner_id);
create policy "owners delete" on public.projects for delete using (auth.uid() = owner_id);

create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end
$$;

create trigger projects_touch_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();
