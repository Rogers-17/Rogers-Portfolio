-- Phase 2: admin access (allowlist + RLS write policies + storage policies + save RPCs)
-- Run in Supabase Dashboard -> SQL Editor after 20260927000000_projects.sql.

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- ---------------------------------------------------------------------------
create table public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "Admins can read their own admin row"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

-- No insert/update/delete policies: admins are added from the SQL editor only.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin policies on content tables (combined with the public read policies)
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'projects', 'project_features', 'project_images',
    'project_tech_breakdown', 'technologies', 'project_technologies'
  ]
  loop
    execute format('create policy "Admins can read all %1$s" on public.%1$I for select to authenticated using (public.is_admin())', t);
    execute format('create policy "Admins can insert %1$s" on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "Admins can update %1$s" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "Admins can delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: admin-only writes, bucket limits
-- ---------------------------------------------------------------------------
create policy "Admins can upload portfolio images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id in ('project-images', 'tech-icons') and public.is_admin());

create policy "Admins can update portfolio images"
  on storage.objects for update
  to authenticated
  using (bucket_id in ('project-images', 'tech-icons') and public.is_admin())
  with check (bucket_id in ('project-images', 'tech-icons') and public.is_admin());

create policy "Admins can delete portfolio images"
  on storage.objects for delete
  to authenticated
  using (bucket_id in ('project-images', 'tech-icons') and public.is_admin());

-- Needed so the storage API can find objects when removing them.
create policy "Admins can list portfolio images"
  on storage.objects for select
  to authenticated
  using (bucket_id in ('project-images', 'tech-icons') and public.is_admin());

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif']
where id = 'project-images';

update storage.buckets
set file_size_limit = 1024 * 1024,
    allowed_mime_types = array['image/svg+xml', 'image/png', 'image/webp']
where id = 'tech-icons';

-- ---------------------------------------------------------------------------
-- Atomic project save: upsert project + replace all children in one transaction.
-- security invoker => RLS still applies; the explicit check gives a clear error.
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_project(p_id uuid, payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := p_id;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  if v_id is null then
    insert into public.projects (
      slug, name, tagline, summary, project_type, niche, year, client, role, status,
      website_url, cover_image_path, cover_image_alt, overview, problem, solution,
      dev_role, monetization, tech_intro, project_summary, is_published, is_featured, sort_order
    )
    values (
      payload->>'slug', payload->>'name', payload->>'tagline', payload->>'summary',
      payload->>'project_type', payload->>'niche', (payload->>'year')::smallint,
      payload->>'client', payload->>'role', (payload->>'status')::public.project_status,
      payload->>'website_url', payload->>'cover_image_path', payload->>'cover_image_alt',
      payload->>'overview', payload->>'problem', payload->>'solution', payload->>'dev_role',
      payload->>'monetization', payload->>'tech_intro', payload->>'project_summary',
      (payload->>'is_published')::boolean, (payload->>'is_featured')::boolean,
      coalesce((select max(sort_order) + 1 from public.projects), 1)
    )
    returning id into v_id;
  else
    update public.projects set
      slug             = payload->>'slug',
      name             = payload->>'name',
      tagline          = payload->>'tagline',
      summary          = payload->>'summary',
      project_type     = payload->>'project_type',
      niche            = payload->>'niche',
      year             = (payload->>'year')::smallint,
      client           = payload->>'client',
      role             = payload->>'role',
      status           = (payload->>'status')::public.project_status,
      website_url      = payload->>'website_url',
      cover_image_path = payload->>'cover_image_path',
      cover_image_alt  = payload->>'cover_image_alt',
      overview         = payload->>'overview',
      problem          = payload->>'problem',
      solution         = payload->>'solution',
      dev_role         = payload->>'dev_role',
      monetization     = payload->>'monetization',
      tech_intro       = payload->>'tech_intro',
      project_summary  = payload->>'project_summary',
      is_published     = (payload->>'is_published')::boolean,
      is_featured      = (payload->>'is_featured')::boolean
    where id = v_id;

    if not found then
      raise exception 'Project not found' using errcode = 'no_data_found';
    end if;
  end if;

  delete from public.project_features       where project_id = v_id;
  delete from public.project_images         where project_id = v_id;
  delete from public.project_tech_breakdown where project_id = v_id;
  delete from public.project_technologies   where project_id = v_id;

  insert into public.project_features (project_id, title, description, image_path, image_alt, sort_order)
  select v_id, f.value->>'title', f.value->>'description', f.value->>'image_path', f.value->>'image_alt', f.ordinality
  from jsonb_array_elements(coalesce(payload->'features', '[]'::jsonb)) with ordinality as f(value, ordinality);

  insert into public.project_images (project_id, image_path, alt, sort_order)
  select v_id, g.value->>'image_path', g.value->>'alt', g.ordinality
  from jsonb_array_elements(coalesce(payload->'gallery', '[]'::jsonb)) with ordinality as g(value, ordinality);

  insert into public.project_tech_breakdown (project_id, label, description, sort_order)
  select v_id, b.value->>'label', b.value->>'description', b.ordinality
  from jsonb_array_elements(coalesce(payload->'tech_breakdown', '[]'::jsonb)) with ordinality as b(value, ordinality);

  insert into public.project_technologies (project_id, technology_id, sort_order)
  select v_id, (t.value #>> '{}')::uuid, t.ordinality
  from jsonb_array_elements(coalesce(payload->'technology_ids', '[]'::jsonb)) with ordinality as t(value, ordinality);

  return v_id;
end;
$$;

revoke all on function public.admin_save_project(uuid, jsonb) from public;
grant execute on function public.admin_save_project(uuid, jsonb) to authenticated;

create or replace function public.admin_reorder_projects(ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;

  update public.projects p
  set sort_order = o.position
  from unnest(ids) with ordinality as o(id, position)
  where p.id = o.id;
end;
$$;

revoke all on function public.admin_reorder_projects(uuid[]) from public;
grant execute on function public.admin_reorder_projects(uuid[]) to authenticated;
