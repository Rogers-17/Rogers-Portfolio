-- Phase 7: resume version history, private share links, job application tracker.
-- Run in Supabase Dashboard -> SQL Editor after the Phase 6 migrations.

-- ---------------------------------------------------------------------------
-- Versions
-- ---------------------------------------------------------------------------
create table public.resume_versions (
  id           uuid primary key default gen_random_uuid(),
  resume_id    uuid not null references public.resumes(id) on delete cascade,
  name         text check (char_length(name) between 1 and 80),   -- null = automatic snapshot
  title        text not null check (char_length(title) between 1 and 120),
  template     text not null check (template in ('professional', 'classic', 'timeline', 'sidebar')),
  design       jsonb not null check (jsonb_typeof(design) = 'object'),
  data         jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 300000),
  content_hash text not null check (char_length(content_hash) = 64),
  created_at   timestamptz not null default now()
);
create index resume_versions_resume_idx on public.resume_versions (resume_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Share links (only a SHA-256 hash of the token is stored)
-- ---------------------------------------------------------------------------
create table public.resume_shares (
  id             uuid primary key default gen_random_uuid(),
  resume_id      uuid not null references public.resumes(id) on delete cascade,
  version_id     uuid not null references public.resume_versions(id) on delete cascade,
  token_hash     text not null unique check (char_length(token_hash) = 64),
  label          text check (char_length(label) <= 80),
  allow_download boolean not null default true,
  expires_at     timestamptz,
  revoked_at     timestamptz,
  photo_data     text check (photo_data is null or (photo_data like 'data:image/jpeg;base64,%' and char_length(photo_data) <= 420000)),
  view_count     integer not null default 0,
  last_viewed_at timestamptz,
  created_at     timestamptz not null default now()
);
create index resume_shares_resume_idx on public.resume_shares (resume_id, created_at desc);

-- Views are counted once per visitor per hour; lookups are rate-limited per visitor.
create table public.resume_share_views (
  share_id    uuid not null references public.resume_shares(id) on delete cascade,
  viewer_hash text not null,
  viewed_at   timestamptz not null default now()
);
create index resume_share_views_idx on public.resume_share_views (share_id, viewer_hash, viewed_at desc);

create table public.resume_share_lookups (
  viewer_hash text not null,
  looked_at   timestamptz not null default now()
);
create index resume_share_lookups_idx on public.resume_share_lookups (viewer_hash, looked_at desc);

-- ---------------------------------------------------------------------------
-- Job applications
-- ---------------------------------------------------------------------------
create table public.job_applications (
  id                uuid primary key default gen_random_uuid(),
  company           text not null check (char_length(company) between 1 and 120),
  role              text not null check (char_length(role) between 1 and 120),
  job_url           text check (job_url is null or (job_url ~ '^https?://' and char_length(job_url) <= 500)),
  location          text check (char_length(location) <= 120),
  salary            text check (char_length(salary) <= 80),
  source            text check (char_length(source) <= 80),
  status            text not null default 'saved' check (status in ('saved', 'applied', 'interview', 'offer', 'rejected')),
  sort_order        integer not null default 0,
  applied_on        date,
  follow_up_on      date,
  resume_id         uuid references public.resumes(id) on delete set null,
  cover_letter_id   uuid references public.cover_letters(id) on delete set null,
  priority          smallint not null default 0 check (priority between 0 and 3),
  notes             text check (char_length(notes) <= 5000),
  is_archived       boolean not null default false,
  status_changed_at timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index job_applications_board_idx on public.job_applications (is_archived, status, sort_order);
create index job_applications_follow_up_idx on public.job_applications (follow_up_on) where not is_archived;

create trigger job_applications_set_updated_at before update on public.job_applications
for each row execute function public.set_updated_at();

create or replace function public.job_applications_status_changed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    new.status_changed_at = now();
  end if;
  return new;
end;
$$;

create trigger job_applications_status_changed before update on public.job_applications
for each row execute function public.job_applications_status_changed();

-- ---------------------------------------------------------------------------
-- Row Level Security: admin only (anonymous access goes through the RPC below)
-- ---------------------------------------------------------------------------
alter table public.resume_versions      enable row level security;
alter table public.resume_shares        enable row level security;
alter table public.resume_share_views   enable row level security;
alter table public.resume_share_lookups enable row level security;
alter table public.job_applications     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['resume_versions', 'resume_shares', 'job_applications']
  loop
    execute format('create policy "Admins can read %1$s" on public.%1$I for select to authenticated using (public.is_admin())', t);
    execute format('create policy "Admins can insert %1$s" on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "Admins can update %1$s" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "Admins can delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

create policy "Admins can read share views" on public.resume_share_views for select to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public share lookup: returns only the frozen snapshot for a valid link.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_resume_share(p_token_hash text, p_viewer_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  share public.resume_shares%rowtype;
  version public.resume_versions%rowtype;
begin
  if p_token_hash is null or char_length(p_token_hash) <> 64 or p_viewer_hash is null or char_length(p_viewer_hash) <> 64 then
    return null;
  end if;

  -- Rate limit: 120 lookups per visitor per hour (valid or not).
  delete from public.resume_share_lookups where looked_at < now() - interval '1 day';
  if (select count(*) from public.resume_share_lookups where viewer_hash = p_viewer_hash and looked_at > now() - interval '1 hour') >= 120 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.resume_share_lookups (viewer_hash) values (p_viewer_hash);

  select * into share from public.resume_shares
   where token_hash = p_token_hash
     and revoked_at is null
     and (expires_at is null or expires_at > now());
  if not found then
    return null;
  end if;

  select * into version from public.resume_versions where id = share.version_id;
  if not found then
    return null;
  end if;

  if not exists (
    select 1 from public.resume_share_views
     where share_id = share.id and viewer_hash = p_viewer_hash and viewed_at > now() - interval '1 hour'
  ) then
    insert into public.resume_share_views (share_id, viewer_hash) values (share.id, p_viewer_hash);
    update public.resume_shares set view_count = view_count + 1, last_viewed_at = now() where id = share.id;
  end if;

  return jsonb_build_object(
    'title', version.title,
    'template', version.template,
    'design', version.design,
    'data', version.data,
    'allow_download', share.allow_download,
    'photo_data', share.photo_data
  );
end;
$$;

revoke all on function public.resolve_resume_share(text, text) from public;
grant execute on function public.resolve_resume_share(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Move a job card: new status + the full order of the target column, atomically.
-- ---------------------------------------------------------------------------
create or replace function public.admin_move_application(p_id uuid, p_status text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = 'insufficient_privilege';
  end if;
  if p_status not in ('saved', 'applied', 'interview', 'offer', 'rejected') then
    raise exception 'Invalid status' using errcode = 'invalid_parameter_value';
  end if;

  update public.job_applications set status = p_status where id = p_id;

  update public.job_applications a set sort_order = o.position
    from unnest(p_ids) with ordinality as o(id, position)
   where a.id = o.id and a.status = p_status;
end;
$$;

revoke all on function public.admin_move_application(uuid, text, uuid[]) from public;
grant execute on function public.admin_move_application(uuid, text, uuid[]) to authenticated;
