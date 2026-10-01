-- Document archive: 50 MB per file (the Supabase Free plan maximum). Safe to re-run.
-- Run in Supabase Dashboard -> SQL Editor after 20261005000000_documents.sql.

update storage.buckets set file_size_limit = 50 * 1024 * 1024 where id = 'documents';

alter table public.documents drop constraint if exists documents_size_bytes_check;
alter table public.documents add constraint documents_size_bytes_check check (size_bytes > 0 and size_bytes <= 52428800);
