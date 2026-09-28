-- Phase 3: testimonials + experiences (public read of published rows, admin-only writes)
-- Run in Supabase Dashboard -> SQL Editor after the Phase 1 and Phase 2 migrations.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null check (char_length(quote) between 1 and 1000),
  author_name  text not null check (char_length(author_name) between 1 and 80),
  author_role  text check (char_length(author_role) <= 120),
  avatar_path  text,
  rating       smallint check (rating between 1 and 5),
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.experiences (
  id           uuid primary key default gen_random_uuid(),
  role         text not null check (char_length(role) between 1 and 120),
  company      text not null check (char_length(company) between 1 and 120),
  company_url  text check (company_url is null or company_url ~ '^https://'),
  logo_path    text,
  location     text check (char_length(location) <= 120),
  start_year   smallint not null check (start_year between 1970 and 2100),
  start_month  smallint check (start_month between 1 and 12),
  end_year     smallint check (end_year between 1970 and 2100),
  end_month    smallint check (end_month between 1 and 12),
  is_current   boolean not null default false,
  description  text check (char_length(description) <= 2000),
  skills       text[] not null default '{}' check (cardinality(skills) <= 20),
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint experiences_end_required check (is_current or end_year is not null),
  constraint experiences_end_after_start check (
    end_year is null
    or end_year > start_year
    or (end_year = start_year and coalesce(end_month, 12) >= coalesce(start_month, 1))
  )
);

create index testimonials_published_sort_idx on public.testimonials (is_published, sort_order);
create index experiences_published_sort_idx on public.experiences (is_published, sort_order);

create trigger testimonials_set_updated_at
before update on public.testimonials
for each row execute function public.set_updated_at();

create trigger experiences_set_updated_at
before update on public.experiences
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.testimonials enable row level security;
alter table public.experiences  enable row level security;

create policy "Public can read published testimonials"
  on public.testimonials for select to anon, authenticated using (is_published);

create policy "Public can read published experiences"
  on public.experiences for select to anon, authenticated using (is_published);

do $$
declare
  t text;
begin
  foreach t in array array['testimonials', 'experiences']
  loop
    execute format('create policy "Admins can read all %1$s" on public.%1$I for select to authenticated using (public.is_admin())', t);
    execute format('create policy "Admins can insert %1$s" on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "Admins can update %1$s" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "Admins can delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: site-images bucket (avatars/, logos/) with admin-only writes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 2 * 1024 * 1024,
        array['image/png', 'image/jpeg', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can upload site images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and public.is_admin());

create policy "Admins can update site images"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-images' and public.is_admin())
  with check (bucket_id = 'site-images' and public.is_admin());

create policy "Admins can delete site images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-images' and public.is_admin());

create policy "Admins can list site images"
  on storage.objects for select to authenticated
  using (bucket_id = 'site-images' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Generic reorder for simple content tables (strict allowlist, quoted identifier)
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

  if p_table not in ('testimonials', 'experiences') then
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
