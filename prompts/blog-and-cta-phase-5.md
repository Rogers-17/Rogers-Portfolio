# Phase 5: Blog (Supabase + Tiptap editor) and one CTA site-wide

## Goal

1. **Blog pages** matching designs `12.png` (listing) and `11.png` (post):
   - `/blog`: a badge, the heading "Thoughts, ideas & / everything in between.", an intro, a "Follow me on Substack" link, and a 3-column grid of post cards.
   - `/blog/[slug]`: "← Back to Blog", a large title, "date • N min read", and the article body in a narrow reading column.
2. **Blog CRUD in the dashboard** with a **Tiptap rich text editor**. What you see in the editor is what the post shows: both use the same typography styles.
3. **One CTA everywhere.** The "Ready to create something huge? / Let's Work →" CTA from About and Gallery replaces the old `CallToAction` card on every page that has a CTA:
   - home;
   - project detail;
   - Coding Courses;
   - the blog listing;
   - blog posts.

Out of scope:
- **The footer stays as it is** (as you asked).
- The Resume Builder is planned next, as a separate phase.
- Comments, newsletter sign-up, RSS, tags/categories and search. The schema leaves room for tags later.

## Skills read

- `AGENTS.md`:
  - Supabase is the source of truth; use Zod and Tailwind.
  - `POST` for mutations, `GET` for reads.
  - Share curl steps; run typecheck, lint and build; commit.
- Next 16 docs, as used in Phases 1–4:
  - `params` as a Promise; `generateStaticParams` + `generateMetadata`.
  - `revalidateTag(tag, { expire: 0 })` + `revalidatePath`.
  - `02-guides/json-ld.md` for Article structured data on posts.
- Tiptap v3 (`@tiptap/react` 3.31): `useEditor` with `immediatelyRender: false` for SSR, StarterKit (v3 includes Link and Underline), and the Image and Placeholder extensions.

## Existing code inspected

- `app/(site)/blog/page.tsx`: a `ComingSoon` placeholder, to be replaced.
- `sections/CallToAction.tsx`: the old gradient card with "Let's Work" and "Download CV". It's used on `/`, `/projects/[slug]` and `/learn/coding-courses`.
- `sections/LetsWorkCTA.tsx`: the new CTA (title + label props), used on About and Gallery with their dashboard-editable text.
- The Phase 3/4 admin pattern:
  - generic `content-routes` / `page-routes`;
  - `ContentList`, `SaveBar`, `Field`, `ImageUpload` (with browser resize), `useSaveForm`, `SeedNotice`;
  - the `site-images` bucket, the `lib/pages` defaults with the missing-table fallback, and the `AdminShell` nav.
- `components/ui/Badge.tsx` and `Paragraphs.tsx` from Phase 4. The projects `Prose` component is plain text only.

## Decisions / assumptions (please review)

1. **Posts live in Supabase** (`blog_posts`). The body is stored as **Tiptap JSON** (not HTML) and rendered on the site by **our own React renderer** with a strict allowlist of node and mark types. There's no `dangerouslySetInnerHTML`, so a pasted script can never run.
2. **The editor has a toolbar with:**
   - paragraph, H2 and H3;
   - bold, italic, underline, strike and inline code;
   - link (http, https and mailto only);
   - bullet list, numbered list, blockquote, code block, horizontal rule;
   - **image** (uploaded to `site-images/blog/`, resized in the browser, with alt text required);
   - undo and redo.

   Keyboard shortcuts and Markdown-style shortcuts (`## `, `> `, `- `, `**bold**`) work as usual in Tiptap. Pasting from Google Docs or Word keeps only the allowed formatting.
3. **"Displays the same way":** a single `.blog-prose` style block (in `globals.css`, using Tailwind `@apply` tokens) is applied to both the editor surface and the rendered post, matching `11.png`:
   - muted `text-[15px] md:text-[17px]` body at `leading-[1.85]`, with generous paragraph spacing;
   - white headings, italic muted quotes, rounded images and gradient links.
4. **Read time** is calculated on save from the word count (220 words/minute, minimum 1) and stored, so the cards and post header show "10 min read".
5. **Excerpt:** an optional field. When it's empty, the first ~180 characters of the body text are used, as in the cards in `12.png`.
6. **Post fields:**
   - title, slug (auto from the title, editable, unique), excerpt, body;
   - optional cover image (used for the social share image only; the design shows no cover on the page);
   - SEO description;
   - status **Draft / Published**, plus a **publish date** (defaults to now; you can backdate, e.g. "originally written on May 9, 2025");
   - an optional "Originally published on" URL (e.g. Substack), shown as a small note at the end of the post.
   - Only published posts with a publish date in the past appear on the site.
7. **Blog page texts are editable:** a `blog_page` singleton (badge, title, highlight, intro, Substack URL, CTA title and label), edited in Dashboard → Blog. The Substack link is hidden when no URL is set.
8. **CTA everywhere:**
   - `LetsWorkCTA` is used on `/`, `/projects/[slug]`, `/learn/coding-courses`, `/blog` and `/blog/[slug]`.
   - About and Gallery keep their own editable CTA text. The blog pages use the blog CTA text. Home, project and courses pages use the default text ("Ready to create something huge?" / "Let's Work").
   - `sections/CallToAction.tsx` is deleted, and with it the unused "Download CV" button (its link was `#`).
9. **Listing layout:**
   - Newest first, with 12 posts per page and a "Load more" link (`?page=2`). The listing stays static; page 2+ is rendered on demand.
   - Cards are 1 column below 768px, 2 columns at 768–1199px and 3 columns at 1200px and up.
   - Each card shows "date • N min read", a bold title and an excerpt clamped to 4 lines, with "Read article →" in gradient pink.
   - The whole card is a link, with a hover border glow.
10. **Post page:**
    - Statically generated for all published posts (`generateStaticParams`), with the same 60s revalidation plus tag expiry as projects.
    - It has `generateMetadata` (title, description, Open Graph with the cover when set) and Article JSON-LD.
    - Unknown or draft slugs return 404.
11. **Admin UI:**
    - **Blog list:** title, status badge (Draft / Published / Scheduled), date, read time, and actions (edit, view live, delete).
    - **Editor page:**
      - a title input, a slug with an auto/locked toggle, the toolbar and editor, an excerpt with a counter, and cover and SEO fields;
      - a status select and publish date, and the sticky SaveBar;
      - a "Preview" link that opens the live post in a new tab once it's published.
    - **Blog page settings** are a card at the top of Dashboard → Blog.
12. **Seed:** one sample post, titled "Hello, world" and clearly marked as a sample, as a **Draft**, so nothing appears publicly until you publish your own. The seed also creates the `blog_page` row with the texts from `12.png`, adapted: "Thoughts, ideas &" / "everything in between." and "Welcome to my digital garden…".

## Visual interpretation

**Listing (`12.png`):**
- The standard container with `pt-10 md:pt-14`.
- The Badge component ("Blog ✍️").
- H1: `text-3xl md:text-4xl lg:text-[2.5rem]` bold, with the second line in gradient text.
- Intro: `text-[15px] md:text-base text-fg/85`, about 34rem wide, `mt-5`.
- Substack link: `mt-8 inline-flex gap-2 text-sm font-medium` with a bookmark icon, white, underlined on hover.
- Grid: `mt-14 md:mt-16 gap-5 md:gap-6`.
- Cards:
  - `rounded-2xl border-white/6 bg-white/[0.015] p-6 md:p-7`, with `hover:border-accent-1/40` and a soft glow;
  - the meta line is `text-xs text-dim` ("Sep 15, 2026 • 10 min read");
  - the title is `mt-4 text-lg md:text-xl font-bold leading-snug`;
  - the excerpt is `mt-3 text-sm text-muted leading-relaxed line-clamp-4`;
  - "Read article →" is `mt-6 text-sm font-semibold text-accent-1`, and the arrow slides on hover.
  - Cards in a row align to the top and heights differ with the content, as in the design.
- Empty state: "No posts yet — check back soon."

**Post (`11.png`):**
- A centred column `max-w-[40rem]`, `pt-10 md:pt-14`.
- "← Back to Blog" in `text-sm text-muted hover:text-white`.
- H1: `mt-6 text-3xl md:text-[2.75rem] font-bold leading-[1.15]`.
- Meta line: `mt-4 text-xs md:text-sm text-dim`.
- Body: `mt-10`, using `.blog-prose`:
  - paragraphs `text-muted`, `mb-6`;
  - H2 `text-2xl text-white mt-12 mb-4` and H3 `text-xl text-white mt-10 mb-3`;
  - blockquote: `italic text-muted/90`, no box, a 2px gradient left border and `pl-5`;
  - images: `rounded-xl my-8` via `next/image` (Supabase URLs only), with an optional caption from the alt text;
  - code: inline pill `bg-white/8 rounded px-1.5`, and blocks `bg-[#0f0b18] rounded-xl p-5 overflow-x-auto text-sm font-mono`;
  - lists: `pl-6 list-disc` / `list-decimal`, with `marker:text-accent-1`;
  - links: `text-accent-1 underline underline-offset-4`, and external links open in a new tab.
- After the body: an optional "Originally published on Substack →" note, then `LetsWorkCTA`.

**Responsive:** check at 320 / 375 / 768 / 1024 / 1440px. There's no horizontal scroll; wide code blocks and images scroll or scale inside the column.

## Database: `supabase/migrations/20261001000000_blog.sql`

```sql
create table public.blog_page (
  id smallint primary key default 1 check (id = 1),
  badge text not null check (char_length(badge) between 1 and 40),
  title text not null check (char_length(title) between 1 and 80),
  highlight text not null check (char_length(highlight) between 1 and 80),
  intro text not null check (char_length(intro) between 1 and 600),
  substack_url text check (substack_url is null or substack_url ~ '^https://'),
  cta_title text not null, cta_label text not null,
  updated_at timestamptz not null default now()
);

create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and char_length(slug) <= 100),
  title text not null check (char_length(title) between 1 and 160),
  excerpt text check (char_length(excerpt) <= 300),
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  content_text text not null default '',          -- plain text, for excerpts / read time / future search
  reading_minutes smallint not null default 1 check (reading_minutes between 1 and 240),
  cover_path text,
  seo_description text check (char_length(seo_description) <= 200),
  canonical_url text check (canonical_url is null or canonical_url ~ '^https://'),
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (octet_length(content::text) <= 500000)
);
create index blog_posts_public_idx on public.blog_posts (status, published_at desc);
```

Plus:

- `updated_at` triggers.
- **RLS:**
  - Public `select` on `blog_page`.
  - Public `select` on posts where `status = 'published' and published_at <= now()`.
  - Admin select, insert, update and delete via `is_admin()`. The singleton is admin update-only.
- Seed file `supabase/seed_blog.sql` (idempotent): the `blog_page` row and 1 draft sample post.

## Files likely to change

### New

| File | Purpose |
|---|---|
| `supabase/migrations/20261001000000_blog.sql`, `supabase/seed_blog.sql` | Schema, RLS, seed. |
| `lib/blog/content.ts` | Client-safe **Tiptap JSON Zod schema**: an allowlist of nodes (`doc`, `paragraph`, `heading` levels 2–3, `text`, `bulletList`, `orderedList`, `listItem`, `blockquote`, `codeBlock`, `horizontalRule`, `hardBreak`, `image`) and marks (`bold`, `italic`, `underline`, `strike`, `code`, `link`). Limits: depth ≤ 20, ≤ 5,000 nodes, link `href` restricted to http, https and mailto, and image `src` restricted to our Supabase `site-images/blog/` public URL. Also `toPlainText`, `readingMinutes` and `autoExcerpt`. |
| `lib/blog/schema.ts`, `lib/blog/queries.ts`, `lib/blog/cache.ts` | Read schemas + defaults; cached, tagged public queries (list with pagination, by slug, slugs for static params, page singleton); tag `blog`. |
| `lib/admin/blog-schemas.ts`, `lib/admin/blog-queries.ts` | Admin input schemas (post, page) and uncached admin reads. |
| `app/api/admin/blog/route.ts` | `GET` / `POST` for the blog page singleton. |
| `app/api/admin/blog-posts/route.ts`, `[id]/route.ts`, `[id]/delete/route.ts` | `GET` list / `POST` create; `GET` one / `POST` update; `POST` delete. The server recomputes `content_text`, `reading_minutes` and the excerpt fallback. A duplicate slug returns 409 on the slug field. |
| `app/(site)/blog/[slug]/page.tsx` | The post page. |
| `components/blog/PostCard.tsx`, `components/blog/RichText.tsx` | Card; the allowlisted JSON → React renderer (shared with the admin preview). |
| `components/admin/BlogEditor.tsx`, `components/admin/EditorToolbar.tsx`, `components/admin/BlogPostForm.tsx`, `components/admin/BlogPageForm.tsx`, `components/admin/BlogPostsList.tsx` | The dashboard UI. |
| `app/admin/(dashboard)/blog/page.tsx`, `blog/new/page.tsx`, `blog/[id]/page.tsx` | Admin pages. |

### Modified

- `app/(site)/blog/page.tsx`: the real listing.
- `app/globals.css`: the `.blog-prose` typography block (shared by the editor and the post).
- `app/(site)/page.tsx`, `app/(site)/projects/[slug]/page.tsx`, `app/(site)/learn/coding-courses/page.tsx`: `CallToAction` becomes `LetsWorkCTA`.
- `sections/LetsWorkCTA.tsx`: default title and label props.
- `components/admin/AdminShell.tsx`: a "Blog" nav item.
- `lib/admin/revalidate.ts`: `revalidateBlog()` (tag + `/blog` + `/blog/[slug]`).
- `package.json` / `pnpm-lock.yaml`: add `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/extension-image` and `@tiptap/extensions` (Placeholder, CharacterCount). I'll install with **pnpm**, so the lockfile stays in sync for Vercel.
- **Deleted:** `sections/CallToAction.tsx`.

## Security requirements

- **Post body:**
  - Validated server-side with the allowlist schema on every create or update. Unknown nodes, marks or attributes are rejected (400), as are `javascript:`/`data:` links and images outside our bucket.
  - The body size is capped (500 KB in the DB, and checked in the API).
  - Rendering maps only allowlisted types to fixed React components. Text is React text, and attributes are rebuilt from validated values only. There's no raw HTML anywhere.
- **Links:** external links get `rel="noopener noreferrer nofollow" target="_blank"`, and `mailto:` is allowed.
- **Admin API:** `requireAdminApi` (bearer, or cookie plus the Origin check); UUID validation; Zod with unknown keys stripped; the slug regex and uniqueness check (409).
- **RLS:** anonymous visitors can only read published posts with a publish date in the past, so drafts and scheduled posts never leak through the public client.
- **Uploads:** the existing magic-byte checks, and the `blog/` folder prefix enforced for the cover and body images.

## Acceptance criteria

- `/blog` matches `12.png`, and `/blog/[slug]` matches `11.png`. Both are responsive at all widths.
- Writing a post in the dashboard with headings, bold, italic, links, lists, a quote, a code block and an image, then publishing, shows it on `/blog` and `/blog/<slug>` on the next load, looking the same as in the editor.
- Drafts and future-dated posts aren't visible publicly (404 on direct URL). Backdating a post orders it correctly.
- Read time and the excerpt fallback work.
- A duplicate slug → 409 with an inline error. A body containing a `javascript:` link → 400. An unknown node type → 400.
- The CTA on `/`, `/projects/<slug>`, `/learn/coding-courses`, `/blog` and posts is the new "Ready to create something huge? / Let's Work →". `CallToAction.tsx` is gone.
- Signed out: 401 on all new admin routes.
- `npm run typecheck`, `npm run lint` and `npm run build` pass. A fresh `pnpm install --frozen-lockfile` succeeds, as it does on Vercel.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
pnpm install --frozen-lockfile --lockfile-only
```

Plus curl smoke tests against `next start`: the pages, the 401s, and validation errors.

## What you'll need to do (one time)

In the Supabase SQL Editor, run `supabase/migrations/20261001000000_blog.sql`, then `supabase/seed_blog.sql`. Also make sure the Phase 4 migration and seed have been run.

## Manual test steps (to share after implementation)

1. `npm run dev` → `/admin` → **Blog**.
2. Set the Substack URL in the page settings card and save. `/blog` shows "Follow me on Substack".
3. **New post:**
   - Type the title; the slug fills in automatically.
   - Write a few paragraphs. Add an H2, **bold**, a link, a bullet list and a quote, then upload an image and add its alt text.
   - Set the status to Published and save.
4. `/blog` shows the card with the date, read time and excerpt. Clicking it opens the post, which looks like the editor.
5. Change the publish date to next month: the post disappears from `/blog`, and its URL returns 404. Set it back.
6. Create a second post with the same slug: an inline "Slug already in use" error.
7. Check the CTA at the bottom of `/`, a project page, `/learn/coding-courses`, `/blog` and a post.
8. Responsive: iPhone SE, iPad and 1440 in DevTools. There's no sideways scrolling, including on code blocks.

curl (`$TOKEN` from the Phase 2 token command):

```bash
curl -s http://localhost:3000/api/admin/blog-posts                       # 401
curl -s http://localhost:3000/api/admin/blog-posts -H "Authorization: Bearer $TOKEN"

curl -s -X POST http://localhost:3000/api/admin/blog-posts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Test post","slug":"test-post","excerpt":null,"status":"published","published_at":"2026-09-15T09:00:00Z","seo_description":null,"canonical_url":null,"cover_path":null,
       "content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello from the API."}]}]}}'

# Rejected: javascript: link -> 400
curl -s -X POST http://localhost:3000/api/admin/blog-posts \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Bad","slug":"bad","status":"draft","published_at":"2026-09-15T09:00:00Z",
       "content":{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"link","attrs":{"href":"javascript:alert(1)"}}]}]}]}}'

curl -s -X POST http://localhost:3000/api/admin/blog-posts/<id>/delete -H "Authorization: Bearer $TOKEN"
```
