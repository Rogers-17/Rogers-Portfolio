-- Document share links open a viewing page; downloading is a separate, optional step.
-- Views and downloads are counted separately. Run after 20261008000000_document_shares.sql,
-- and before deploying the code that calls the three-argument lookup. Safe to re-run.

alter table public.document_shares add column if not exists download_count integer not null default 0;

drop function if exists public.resolve_document_share(text, text);

create or replace function public.resolve_document_share(p_token_hash text, p_viewer_hash text, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
  result jsonb;
begin
  if p_token_hash is null or char_length(p_token_hash) <> 64 or p_viewer_hash is null or char_length(p_viewer_hash) <> 64 then
    return null;
  end if;
  if p_kind is null or p_kind not in ('view', 'download') then
    return null;
  end if;

  -- Rate limit: 120 lookups per visitor per hour (valid or not).
  delete from public.document_share_lookups where looked_at < now() - interval '1 day';
  if (select count(*) from public.document_share_lookups where viewer_hash = p_viewer_hash and looked_at > now() - interval '1 hour') >= 120 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.document_share_lookups (viewer_hash) values (p_viewer_hash);

  update public.document_shares
     set open_count = open_count + case when p_kind = 'view' then 1 else 0 end,
         download_count = download_count + case when p_kind = 'download' then 1 else 0 end,
         last_opened_at = now()
   where token_hash = p_token_hash
     and revoked_at is null
     and (expires_at is null or expires_at > now())
  returning document_id into target;
  if not found then
    return null;
  end if;

  -- Only what the viewing page shows; description, tags and dates stay private.
  select jsonb_build_object('title', d.title, 'file_path', d.file_path, 'file_name', d.file_name, 'format', d.format, 'size_bytes', d.size_bytes) into result
    from public.documents d
   where d.id = target;
  return result;
end;
$$;

revoke all on function public.resolve_document_share(text, text, text) from public;
grant execute on function public.resolve_document_share(text, text, text) to anon, authenticated;
