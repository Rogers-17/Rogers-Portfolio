-- Phase 4: About page, Gallery page, Start-a-project form settings + project requests (inquiries).
-- Run in Supabase Dashboard -> SQL Editor after the Phase 1-3 migrations, then run
-- supabase/seed_about_gallery_project_form.sql.

-- ---------------------------------------------------------------------------
-- Singleton page rows (exactly one row each, id = 1)
-- ---------------------------------------------------------------------------
create table public.about_page (
  id                   smallint primary key default 1 check (id = 1),
  badge                text not null check (char_length(badge) between 1 and 40),
  title                text not null check (char_length(title) between 1 and 80),
  highlight            text not null check (char_length(highlight) between 1 and 80),
  intro                text not null check (char_length(intro) between 1 and 4000),
  photo_primary_path   text,
  photo_secondary_path text,
  photo_alt            text not null check (char_length(photo_alt) between 1 and 200),
  background_path      text,
  early_eyebrow        text not null check (char_length(early_eyebrow) between 1 and 60),
  early_title          text not null check (char_length(early_title) between 1 and 60),
  early_body           text not null check (char_length(early_body) between 1 and 6000),
  journey_eyebrow      text not null check (char_length(journey_eyebrow) between 1 and 60),
  journey_title        text not null check (char_length(journey_title) between 1 and 60),
  journey_body         text not null check (char_length(journey_body) between 1 and 6000),
  journey_image_path   text,
  journey_image_alt    text not null check (char_length(journey_image_alt) between 1 and 200),
  cta_title            text not null check (char_length(cta_title) between 1 and 80),
  cta_label            text not null check (char_length(cta_label) between 1 and 40),
  updated_at           timestamptz not null default now()
);

create table public.gallery_page (
  id         smallint primary key default 1 check (id = 1),
  badge      text not null check (char_length(badge) between 1 and 40),
  title      text not null check (char_length(title) between 1 and 80),
  highlight  text not null check (char_length(highlight) between 1 and 80),
  quote      text not null check (char_length(quote) between 1 and 2000),
  signature  text check (char_length(signature) <= 60),
  hero_path  text,
  hero_alt   text not null check (char_length(hero_alt) between 1 and 200),
  cta_title  text not null check (char_length(cta_title) between 1 and 80),
  cta_label  text not null check (char_length(cta_label) between 1 and 40),
  updated_at timestamptz not null default now()
);

create table public.project_form_settings (
  id              smallint primary key default 1 check (id = 1),
  whatsapp_number text check (whatsapp_number ~ '^[0-9]{7,15}$'),
  contact_email   text check (char_length(contact_email) <= 254 and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone   text check (contact_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  countries       text[] not null default '{}' check (cardinality(countries) <= 4),
  project_types   text[] not null default '{}' check (cardinality(project_types) <= 12),
  budgets         text[] not null default '{}' check (cardinality(budgets) <= 12),
  steps           jsonb not null default '{}'::jsonb check (jsonb_typeof(steps) = 'object'),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lists
-- ---------------------------------------------------------------------------
create table public.about_facts (
  id           uuid primary key default gen_random_uuid(),
  icon         text not null check (icon in ('calendar', 'graduation', 'briefcase', 'users', 'heart', 'map-pin', 'star', 'book', 'code', 'camera', 'trophy', 'home')),
  title        text not null check (char_length(title) between 1 and 60),
  body         text not null check (char_length(body) between 1 and 2000),
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.gallery_photos (
  id           uuid primary key default gen_random_uuid(),
  image_path   text not null,
  width        integer not null check (width between 1 and 10000),
  height       integer not null check (height between 1 and 10000),
  alt          text not null check (char_length(alt) between 1 and 200),
  caption      text check (char_length(caption) <= 200),
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.project_requests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 60),
  location      text not null check (char_length(location) between 2 and 60),
  project_type  text not null check (char_length(project_type) between 1 and 60),
  business_name text not null check (char_length(business_name) between 1 and 80),
  deadline_date date,
  deadline_time time,
  is_flexible   boolean not null default false,
  budget        text not null check (char_length(budget) between 1 and 60),
  details       text not null check (char_length(details) between 20 and 2000),
  channel       text not null check (channel in ('whatsapp', 'email', 'callback')),
  visitor_phone text check (visitor_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  status        text not null default 'new' check (status in ('new', 'contacted', 'won', 'lost', 'archived')),
  notes         text check (char_length(notes) <= 4000),
  ip_hash       text not null check (char_length(ip_hash) = 64),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint project_requests_deadline_required check (is_flexible or deadline_date is not null),
  constraint project_requests_phone_required check (channel <> 'callback' or visitor_phone is not null)
);

create index about_facts_published_sort_idx on public.about_facts (is_published, sort_order);
create index gallery_photos_published_sort_idx on public.gallery_photos (is_published, sort_order);
create index project_requests_created_idx on public.project_requests (created_at desc);
create index project_requests_status_idx on public.project_requests (status, created_at desc);
create index project_requests_ip_idx on public.project_requests (ip_hash, created_at desc);

do $$
declare
  t text;
begin
  foreach t in array array['about_page', 'gallery_page', 'project_form_settings', 'about_facts', 'gallery_photos', 'project_requests']
  loop
    execute format('create trigger %1$s_set_updated_at before update on public.%1$I for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.about_page            enable row level security;
alter table public.gallery_page          enable row level security;
alter table public.project_form_settings enable row level security;
alter table public.about_facts           enable row level security;
alter table public.gallery_photos        enable row level security;
alter table public.project_requests      enable row level security;

-- Public reads: page singletons, form settings (shown on the page anyway), published list rows.
create policy "Public can read about page" on public.about_page for select to anon, authenticated using (true);
create policy "Public can read gallery page" on public.gallery_page for select to anon, authenticated using (true);
create policy "Public can read project form settings" on public.project_form_settings for select to anon, authenticated using (true);
create policy "Public can read published about facts" on public.about_facts for select to anon, authenticated using (is_published);
create policy "Public can read published gallery photos" on public.gallery_photos for select to anon, authenticated using (is_published);

-- Singletons: admins may only update (no insert/delete), so there is always exactly one row.
do $$
declare
  t text;
begin
  foreach t in array array['about_page', 'gallery_page', 'project_form_settings']
  loop
    execute format('create policy "Admins can update %1$s" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;

  foreach t in array array['about_facts', 'gallery_photos']
  loop
    execute format('create policy "Admins can read all %1$s" on public.%1$I for select to authenticated using (public.is_admin())', t);
    execute format('create policy "Admins can insert %1$s" on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "Admins can update %1$s" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "Admins can delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

-- Project requests: no public access at all. Visitors can only insert through
-- submit_project_request() below; admins read, update and delete.
create policy "Admins can read project requests" on public.project_requests for select to authenticated using (public.is_admin());
create policy "Admins can update project requests" on public.project_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete project requests" on public.project_requests for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public submission with rate limiting (5 per IP per hour, 50 site-wide per hour)
-- ---------------------------------------------------------------------------
create or replace function public.submit_project_request(payload jsonb, p_ip_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if p_ip_hash is null or char_length(p_ip_hash) <> 64 then
    raise exception 'invalid_ip_hash' using errcode = 'invalid_parameter_value';
  end if;

  if (select count(*) from public.project_requests
       where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.project_requests
          where created_at > now() - interval '1 hour') >= 50 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.project_requests (
    name, location, project_type, business_name, deadline_date, deadline_time, is_flexible,
    budget, details, channel, visitor_phone, status, ip_hash
  ) values (
    payload->>'name',
    payload->>'location',
    payload->>'project_type',
    payload->>'business_name',
    nullif(payload->>'deadline_date', '')::date,
    nullif(payload->>'deadline_time', '')::time,
    coalesce((payload->>'is_flexible')::boolean, false),
    payload->>'budget',
    payload->>'details',
    payload->>'channel',
    nullif(payload->>'visitor_phone', ''),
    'new',
    p_ip_hash
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_project_request(jsonb, text) from public;
grant execute on function public.submit_project_request(jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Extend the generic reorder allowlist
-- ---------------------------------------------------------------------------
create or replace function public.admin_reorder_rows(p_table text, ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  if p_table not in ('testimonials', 'experiences', 'about_facts', 'gallery_photos') then
    raise exception 'Table not allowed' using errcode = 'invalid_parameter_value';
  end if;

  execute format(
    'update public.%I t set sort_order = o.position
       from unnest($1) with ordinality as o(id, position)
      where t.id = o.id',
    p_table
  ) using ids;
end;
$$;

revoke all on function public.admin_reorder_rows(text, uuid[]) from public;
grant execute on function public.admin_reorder_rows(text, uuid[]) to authenticated;
