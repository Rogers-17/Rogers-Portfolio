-- Document share links that last until they're expired by hand (or an optional time limit).
-- Run in Supabase Dashboard -> SQL Editor after the earlier migrations. Safe to re-run.

-- Only a SHA-256 hash of the token is stored. expires_at null = no time limit.
create table if not exists public.document_shares (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references public.documents(id) on delete cascade,
  token_hash     text not null unique check (char_length(token_hash) = 64),
  label          text check (char_length(label) <= 80),
  expires_at     timestamptz,
  revoked_at     timestamptz,
  open_count     integer not null default 0,
  last_opened_at timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists document_shares_document_idx on public.document_shares (document_id, created_at desc);

create table if not exists public.document_share_lookups (
  viewer_hash text not null,
  looked_at   timestamptz not null default now()
);
create index if not exists document_share_lookups_idx on public.document_share_lookups (viewer_hash, looked_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: admin only (anonymous access goes through the RPC below)
-- ---------------------------------------------------------------------------
alter table public.document_shares        enable row level security;
alter table public.document_share_lookups enable row level security;

drop policy if exists "Admins can read document shares" on public.document_shares;
drop policy if exists "Admins can insert document shares" on public.document_shares;
drop policy if exists "Admins can update document shares" on public.document_shares;
drop policy if exists "Admins can delete document shares" on public.document_shares;
create policy "Admins can read document shares" on public.document_shares for select to authenticated using (public.is_admin());
create policy "Admins can insert document shares" on public.document_shares for insert to authenticated with check (public.is_admin());
create policy "Admins can update document shares" on public.document_shares for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete document shares" on public.document_shares for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Public link lookup: returns only the file behind a valid link, and counts the open.
-- ---------------------------------------------------------------------------
create or replace function public.resolve_document_share(p_token_hash text, p_viewer_hash text)
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

  -- Rate limit: 120 lookups per visitor per hour (valid or not).
  delete from public.document_share_lookups where looked_at < now() - interval '1 day';
  if (select count(*) from public.document_share_lookups where viewer_hash = p_viewer_hash and looked_at > now() - interval '1 hour') >= 120 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.document_share_lookups (viewer_hash) values (p_viewer_hash);

  update public.document_shares
     set open_count = open_count + 1, last_opened_at = now()
   where token_hash = p_token_hash
     and revoked_at is null
     and (expires_at is null or expires_at > now())
  returning document_id into target;
  if not found then
    return null;
  end if;

  select jsonb_build_object('file_path', d.file_path, 'file_name', d.file_name) into result
    from public.documents d
   where d.id = target;
  return result;
end;
$$;

revoke all on function public.resolve_document_share(text, text) from public;
grant execute on function public.resolve_document_share(text, text) to anon, authenticated;
