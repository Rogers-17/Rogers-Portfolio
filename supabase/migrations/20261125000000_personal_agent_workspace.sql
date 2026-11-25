-- Personal assistant workspace. Every row is scoped to its signed-in owner.
create table public.agent_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  assistant_name text not null default 'Rogers' check (char_length(assistant_name) between 1 and 60),
  owner_name text not null default '' check (char_length(owner_name) <= 100),
  response_style text not null default '' check (char_length(response_style) <= 2000),
  ongoing_goals text not null default '' check (char_length(ongoing_goals) <= 5000),
  custom_instructions text not null default '' check (char_length(custom_instructions) <= 5000),
  enabled_tools text[] not null default array['site_read','site_write','chat_search','web_research']::text[],
  search_saved_chats boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.agent_projects (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120), instructions text not null default '' check (char_length(instructions) <= 5000),
  enabled_tools text[] not null default array['site_read','site_write','chat_search','web_research']::text[],
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,name), unique(id,user_id)
);
create table public.agent_conversations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid, title text not null default 'New chat' check(char_length(title) between 1 and 200),
  archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id),
  foreign key(project_id,user_id) references public.agent_projects(id,user_id) on delete set null (project_id)
);
create table public.agent_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  role text not null check(role in ('user','assistant')), content text not null check(char_length(content) between 1 and 40000),
  citations jsonb not null default '[]'::jsonb, search_vector tsvector generated always as (to_tsvector('english',content)) stored,
  created_at timestamptz not null default now(), foreign key(conversation_id,user_id) references public.agent_conversations(id,user_id) on delete cascade
);
create table public.agent_memory_sources (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check(provider in ('chatgpt','claude')), source_name text not null check(char_length(source_name) between 1 and 240),
  external_id text not null check(char_length(external_id) between 1 and 240), title text not null check(char_length(title) between 1 and 500),
  conversation_date timestamptz, created_at timestamptz not null default now(), unique(user_id,provider,external_id), unique(id,user_id)
);
create table public.agent_memory_chunks (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_id uuid not null, chunk_index integer not null check(chunk_index >= 0),
  content text not null check(char_length(content) between 1 and 12000), search_vector tsvector generated always as (to_tsvector('english',content)) stored,
  unique(source_id,chunk_index), foreign key(source_id,user_id) references public.agent_memory_sources(id,user_id) on delete cascade
);
create index agent_memory_chunks_search_idx on public.agent_memory_chunks using gin(search_vector);
create index agent_messages_search_idx on public.agent_messages using gin(search_vector);
create table public.agent_project_files (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null, file_name text not null check(char_length(file_name) between 1 and 240),
  storage_path text not null unique, content_type text not null check(content_type in ('text/plain','text/markdown','application/pdf')),
  size_bytes integer not null check(size_bytes between 1 and 10485760), extracted_text text not null default '' check(char_length(extracted_text) <= 200000),
  created_at timestamptz not null default now(), foreign key(project_id,user_id) references public.agent_projects(id,user_id) on delete cascade
);
create table public.agent_automations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null, name text not null check(char_length(name) between 1 and 120),
  instructions text not null check(char_length(instructions) between 1 and 5000), cadence text not null check(cadence in ('daily','weekly','once')),
  schedule_expression text not null check(char_length(schedule_expression) <= 100), timezone text not null default 'UTC' check(char_length(timezone) <= 80),
  schedule_id text, enabled boolean not null default false, failure_count integer not null default 0 check(failure_count between 0 and 20),
  next_run_at timestamptz, last_run_at timestamptz, locked_until timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(project_id,user_id) references public.agent_projects(id,user_id) on delete cascade, unique(id,user_id)
);
create table public.agent_automation_runs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  automation_id uuid not null, queue_message_id text unique,
  status text not null check(status in ('queued','running','completed','failed')), report_title text,
  report_content text check(char_length(report_content) <= 30000), citations jsonb not null default '[]'::jsonb,
  error_summary text check(char_length(error_summary) <= 500), started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now(),
  foreign key(automation_id,user_id) references public.agent_automations(id,user_id) on delete cascade
);
create index agent_conversations_user_updated_idx on public.agent_conversations(user_id,archived,updated_at desc);
create index agent_messages_conversation_idx on public.agent_messages(conversation_id,created_at);
create index agent_automations_due_idx on public.agent_automations(enabled,next_run_at);
create index agent_automation_runs_history_idx on public.agent_automation_runs(automation_id,created_at desc);
create trigger agent_profiles_set_updated_at before update on public.agent_profiles for each row execute function public.set_updated_at();
create trigger agent_projects_set_updated_at before update on public.agent_projects for each row execute function public.set_updated_at();
create trigger agent_conversations_set_updated_at before update on public.agent_conversations for each row execute function public.set_updated_at();
create trigger agent_automations_set_updated_at before update on public.agent_automations for each row execute function public.set_updated_at();
create or replace function public.claim_agent_automation(automation_id uuid, lease_until timestamptz)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then raise exception 'admin access required'; end if;
  update public.agent_automations set locked_until = lease_until
   where id = automation_id and enabled and next_run_at <= now() and (locked_until is null or locked_until < now())
     and (auth.uid() is null or user_id = auth.uid());
  return found;
end;
$$;
revoke all on function public.claim_agent_automation(uuid,timestamptz) from public, anon;
grant execute on function public.claim_agent_automation(uuid,timestamptz) to authenticated, service_role;
do $$ declare t text; begin
  foreach t in array array['agent_profiles','agent_projects','agent_conversations','agent_messages','agent_memory_sources','agent_memory_chunks','agent_project_files','agent_automations','agent_automation_runs'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy %I on public.%I for select to authenticated using(user_id=auth.uid() and public.is_admin())','Owner read '||t,t);
    execute format('create policy %I on public.%I for insert to authenticated with check(user_id=auth.uid() and public.is_admin())','Owner insert '||t,t);
    execute format('create policy %I on public.%I for update to authenticated using(user_id=auth.uid() and public.is_admin()) with check(user_id=auth.uid() and public.is_admin())','Owner update '||t,t);
    execute format('create policy %I on public.%I for delete to authenticated using(user_id=auth.uid() and public.is_admin())','Owner delete '||t,t);
  end loop;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('agent-project-files','agent-project-files',false,10485760,array['text/plain','text/markdown','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "Admins can read agent project files" on storage.objects for select to authenticated using(bucket_id='agent-project-files' and public.is_admin());
create policy "Admins can upload agent project files" on storage.objects for insert to authenticated with check(bucket_id='agent-project-files' and public.is_admin());
create policy "Admins can delete agent project files" on storage.objects for delete to authenticated using(bucket_id='agent-project-files' and public.is_admin());
