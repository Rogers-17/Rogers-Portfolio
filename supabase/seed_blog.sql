-- Phase 5 seed: blog page texts + one DRAFT sample post (not visible publicly until published).
-- Safe to re-run. The page texts match the defaults in lib/blog/schema.ts.

insert into public.blog_page (id, badge, title, highlight, intro, cta_title, cta_label)
values (
  1,
  'Blog ✍️',
  'Thoughts, ideas &',
  'everything in between.',
  'Welcome to my digital garden. This is where I share my experiences, lessons learned, and insights on design, code, and building products.',
  'Ready to create something huge?',
  'Let''s Work'
) on conflict (id) do nothing;

insert into public.blog_posts (slug, title, excerpt, content, content_text, auto_excerpt, reading_minutes, status)
select
  'hello-world',
  'Hello, world (sample post)',
  'A sample draft that shows the formatting options. Edit it or delete it from the dashboard.',
  '{
    "type": "doc",
    "content": [
      {"type": "paragraph", "content": [{"type": "text", "text": "This is a sample draft. It shows how posts look on the site. Edit it, or delete it and write your own."}]},
      {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Formatting"}]},
      {"type": "paragraph", "content": [
        {"type": "text", "text": "You can use "},
        {"type": "text", "text": "bold", "marks": [{"type": "bold"}]},
        {"type": "text", "text": ", "},
        {"type": "text", "text": "italic", "marks": [{"type": "italic"}]},
        {"type": "text", "text": " and "},
        {"type": "text", "text": "links", "marks": [{"type": "link", "attrs": {"href": "https://nextjs.org"}}]},
        {"type": "text", "text": "."}
      ]},
      {"type": "blockquote", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "\"Quotes look like this.\""}]}]},
      {"type": "bulletList", "content": [
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Lists"}]}]},
        {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Code blocks and images too"}]}]}
      ]}
    ]
  }'::jsonb,
  'This is a sample draft. It shows how posts look on the site. Edit it, or delete it and write your own. Formatting You can use bold, italic and links. "Quotes look like this." Lists Code blocks and images too',
  'This is a sample draft. It shows how posts look on the site. Edit it, or delete it and write your own.',
  1,
  'draft'
where not exists (select 1 from public.blog_posts);
