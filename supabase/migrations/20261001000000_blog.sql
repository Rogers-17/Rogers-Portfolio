-- Phase 5: blog page settings + blog posts (Tiptap JSON bodies).
-- Run in Supabase Dashboard -> SQL Editor after the Phase 1-4 migrations, then run supabase/seed_blog.sql.

create table public.blog_page (
  id           smallint primary key default 1 check (id = 1),
  badge        text not null check (char_length(badge) between 1 and 40),
  title        text not null check (char_length(title) between 1 and 80),
  highlight    text not null check (char_length(highlight) between 1 and 80),
  intro        text not null check (char_length(intro) between 1 and 600),
  substack_url text check (substack_url is null or (substack_url ~ '^https://' and char_length(substack_url) <= 300)),
  cta_title    text not null check (char_length(cta_title) between 1 and 80),
  cta_label    text not null check (char_length(cta_label) between 1 and 40),
  updated_at   timestamptz not null default now()
);

create table public.blog_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title           text not null check (char_length(title) between 1 and 160),
  excerpt         text check (char_length(excerpt) <= 300),
  content         jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 500000),
  content_text    text not null default '',
  auto_excerpt    text not null default '' check (char_length(auto_excerpt) <= 300),
  reading_minutes smallint not null default 1 check (reading_minutes between 1 and 240),
  cover_path      text,
  seo_description text check (char_length(seo_description) <= 200),
  canonical_url   text check (canonical_url is null or (canonical_url ~ '^https://' and char_length(canonical_url) <= 300)),
  status          text not null default 'draft' check (status in ('draft', 'published')),
  published_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index blog_posts_public_idx on public.blog_posts (status, published_at desc);

create trigger blog_page_set_updated_at before update on public.blog_page
for each row execute function public.set_updated_at();

create trigger blog_posts_set_updated_at before update on public.blog_posts
for each row execute function public.set_updated_at();

alter table public.blog_page  enable row level security;
alter table public.blog_posts enable row level security;

create policy "Public can read blog page" on public.blog_page for select to anon, authenticated using (true);
create policy "Admins can update blog page" on public.blog_page for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Drafts and scheduled posts are never visible to the public client.
create policy "Public can read published blog posts" on public.blog_posts for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "Admins can read all blog posts" on public.blog_posts for select to authenticated using (public.is_admin());
create policy "Admins can insert blog posts" on public.blog_posts for insert to authenticated with check (public.is_admin());
create policy "Admins can update blog posts" on public.blog_posts for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete blog posts" on public.blog_posts for delete to authenticated using (public.is_admin());
