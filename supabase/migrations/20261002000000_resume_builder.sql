-- Phase 6: private Resume Builder (resumes, cover letters, settings, AI usage log).
-- Everything here is admin-only: there are no public policies at all.
-- Run in Supabase Dashboard -> SQL Editor after the Phase 1-5 migrations.

create table public.resumes (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 120),
  target_role     text check (char_length(target_role) <= 120),
  template        text not null default 'professional' check (template in ('professional', 'classic', 'timeline', 'sidebar')),
  design          jsonb not null default '{}'::jsonb check (jsonb_typeof(design) = 'object'),
  data            jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 300000),
  job_description text check (char_length(job_description) <= 20000),
  job_company     text check (char_length(job_company) <= 120),
  tailor_keywords jsonb not null default '[]'::jsonb check (jsonb_typeof(tailor_keywords) = 'array'),
  is_archived     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table public.cover_letters (
  id          uuid primary key default gen_random_uuid(),
  resume_id   uuid references public.resumes(id) on delete set null,
  title       text not null check (char_length(title) between 1 and 120),
  company     text check (char_length(company) <= 120),
  job_title   text check (char_length(job_title) <= 120),
  recipient   text check (char_length(recipient) <= 300),
  letter_date date,
  body        text not null default '' check (char_length(body) <= 10000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.resume_settings (
  id               smallint primary key default 1 check (id = 1),
  ai_model         text not null default 'anthropic/claude-haiku-4.5' check (ai_model ~ '^[a-z0-9._-]+/[a-z0-9._:-]+$' and char_length(ai_model) <= 100),
  daily_ai_limit   integer not null default 150 check (daily_ai_limit between 1 and 2000),
  default_template text not null default 'professional' check (default_template in ('professional', 'classic', 'timeline', 'sidebar')),
  updated_at       timestamptz not null default now()
);

create table public.ai_requests (
  id                bigint generated always as identity primary key,
  action            text not null check (char_length(action) <= 40),
  model             text not null check (char_length(model) <= 100),
  prompt_tokens     integer,
  completion_tokens integer,
  cost_usd          numeric(12, 6),
  ok                boolean not null,
  created_at        timestamptz not null default now()
);

create index resumes_updated_idx on public.resumes (is_archived, updated_at desc);
create index cover_letters_updated_idx on public.cover_letters (updated_at desc);
create index ai_requests_created_idx on public.ai_requests (created_at desc);

create trigger resumes_set_updated_at before update on public.resumes for each row execute function public.set_updated_at();
create trigger cover_letters_set_updated_at before update on public.cover_letters for each row execute function public.set_updated_at();
create trigger resume_settings_set_updated_at before update on public.resume_settings for each row execute function public.set_updated_at();

insert into public.resume_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security: admin only
-- ---------------------------------------------------------------------------
alter table public.resumes         enable row level security;
alter table public.cover_letters   enable row level security;
alter table public.resume_settings enable row level security;
alter table public.ai_requests     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['resumes', 'cover_letters', 'ai_requests']
  loop
    execute format('create policy "Admins can read %1$s" on public.%1$I for select to authenticated using (public.is_admin())', t);
    execute format('create policy "Admins can insert %1$s" on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "Admins can update %1$s" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "Admins can delete %1$s" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end;
$$;

create policy "Admins can read resume settings" on public.resume_settings for select to authenticated using (public.is_admin());
create policy "Admins can update resume settings" on public.resume_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Private storage bucket for resume photos (signed URLs only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resume-assets', 'resume-assets', false, 10 * 1024 * 1024, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Admins can read resume assets" on storage.objects for select to authenticated
  using (bucket_id = 'resume-assets' and public.is_admin());
create policy "Admins can upload resume assets" on storage.objects for insert to authenticated
  with check (bucket_id = 'resume-assets' and public.is_admin());
create policy "Admins can update resume assets" on storage.objects for update to authenticated
  using (bucket_id = 'resume-assets' and public.is_admin()) with check (bucket_id = 'resume-assets' and public.is_admin());
create policy "Admins can delete resume assets" on storage.objects for delete to authenticated
  using (bucket_id = 'resume-assets' and public.is_admin());
