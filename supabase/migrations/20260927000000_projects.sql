-- Phase 1: projects schema (read-only for the public site)
-- Run in Supabase Dashboard -> SQL Editor, then run supabase/seed.sql.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.project_status as enum ('active', 'in_development', 'completed', 'archived');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  tagline          text not null,
  summary          text not null,
  project_type     text not null,
  niche            text,
  year             smallint not null check (year between 2000 and 2100),
  client           text,
  role             text,
  status           public.project_status not null default 'active',
  website_url      text check (website_url is null or website_url ~ '^https://'),
  cover_image_path text,
  cover_image_alt  text,
  overview         text,
  problem          text,
  solution         text,
  dev_role         text,
  monetization     text,
  tech_intro       text,
  project_summary  text,
  is_featured      boolean not null default false,
  is_published     boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.project_features (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  image_path  text,
  image_alt   text,
  sort_order  integer not null default 0
);

create table public.project_images (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  image_path  text not null,
  alt         text not null,
  sort_order  integer not null default 0
);

create table public.project_tech_breakdown (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  label       text not null,
  description text not null,
  sort_order  integer not null default 0
);

create table public.technologies (
  id        uuid primary key default gen_random_uuid(),
  name      text not null unique,
  slug      text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  icon_path text
);

create table public.project_technologies (
  project_id    uuid not null references public.projects(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete restrict,
  sort_order    integer not null default 0,
  primary key (project_id, technology_id)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index projects_published_sort_idx on public.projects (is_published, sort_order);
create index project_features_project_idx on public.project_features (project_id, sort_order);
create index project_images_project_idx on public.project_images (project_id, sort_order);
create index project_tech_breakdown_project_idx on public.project_tech_breakdown (project_id, sort_order);
create index project_technologies_technology_idx on public.project_technologies (technology_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: public can read published content only; no writes.
-- ---------------------------------------------------------------------------
alter table public.projects               enable row level security;
alter table public.project_features       enable row level security;
alter table public.project_images         enable row level security;
alter table public.project_tech_breakdown enable row level security;
alter table public.technologies           enable row level security;
alter table public.project_technologies   enable row level security;

create policy "Public can read published projects"
  on public.projects for select
  to anon, authenticated
  using (is_published);

create policy "Public can read features of published projects"
  on public.project_features for select
  to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.is_published));

create policy "Public can read images of published projects"
  on public.project_images for select
  to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.is_published));

create policy "Public can read tech breakdown of published projects"
  on public.project_tech_breakdown for select
  to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.is_published));

create policy "Public can read technologies of published projects"
  on public.project_technologies for select
  to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.is_published));

create policy "Public can read technologies"
  on public.technologies for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Storage: public-read buckets (no upload policies for anon)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('project-images', 'project-images', true),
  ('tech-icons', 'tech-icons', true)
on conflict (id) do update set public = excluded.public;
