-- Phase 8: private document archive (dashboard only).
-- Run in Supabase Dashboard -> SQL Editor after the Phase 7 migration. Safe to re-run the bucket part.

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 150),
  description text check (char_length(description) <= 2000),
  category    text not null default 'other' check (category in ('career', 'academic', 'achievements', 'projects', 'programs', 'business', 'personal', 'other')),
  tags        text[] not null default '{}' check (cardinality(tags) <= 10),
  file_path   text not null unique check (file_path ~ '^files/[0-9a-f-]{36}\.[a-z]{2,4}$'),
  file_name   text not null check (char_length(file_name) between 1 and 180),
  format      text not null check (format in ('pdf', 'png', 'jpg', 'webp', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'txt', 'csv', 'md', 'zip')),
  size_bytes  integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  issued_on   date,
  expires_on  date,
  is_favorite boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint documents_dates_order check (issued_on is null or expires_on is null or expires_on >= issued_on)
);
create index if not exists documents_category_idx on public.documents (category, created_at desc);
create index if not exists documents_expires_idx on public.documents (expires_on) where expires_on is not null;

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: admin only
-- ---------------------------------------------------------------------------
alter table public.documents enable row level security;

drop policy if exists "Admins can read documents" on public.documents;
drop policy if exists "Admins can insert documents" on public.documents;
drop policy if exists "Admins can update documents" on public.documents;
drop policy if exists "Admins can delete documents" on public.documents;
create policy "Admins can read documents" on public.documents for select to authenticated using (public.is_admin());
create policy "Admins can insert documents" on public.documents for insert to authenticated with check (public.is_admin());
create policy "Admins can update documents" on public.documents for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete documents" on public.documents for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Private bucket (10 MB per file). The browser always sends the type the server chose.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10 * 1024 * 1024, array[
  'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword', 'application/vnd.ms-excel',
  'text/plain', 'text/csv', 'text/markdown', 'application/zip'
])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read documents files" on storage.objects;
drop policy if exists "Admins can upload documents files" on storage.objects;
drop policy if exists "Admins can update documents files" on storage.objects;
drop policy if exists "Admins can delete documents files" on storage.objects;
create policy "Admins can read documents files" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_admin());
create policy "Admins can upload documents files" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_admin());
create policy "Admins can update documents files" on storage.objects for update to authenticated
  using (bucket_id = 'documents' and public.is_admin()) with check (bucket_id = 'documents' and public.is_admin());
create policy "Admins can delete documents files" on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin());
