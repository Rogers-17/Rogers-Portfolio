# Phase 1: Projects from Supabase (homepage section, /projects, /projects/[slug])

## Roadmap context (step by step)

| Phase | Scope |
|---|---|
| **1 (this prompt)** | Supabase schema + RLS + storage buckets + seed. Homepage "My Works" section reads from the DB. New `/projects` listing page. New `/projects/[slug]` detail page matching the design. |
| 2 | Admin auth + dashboard: create/edit/reorder/publish projects, upload images, and revalidate the site on save. |
| 3 | Experience + testimonials moved to the DB; `/about` page. |
| 4 | Blog (`/blog`, `/blog/[slug]`). |

Phase 1 is **read-only**: no write APIs, no service-role key, no auth.

## Goal

Replace the hard-coded `projects` mock in `utils/data.tsx` with data stored in Supabase. Render:

1. The homepage **My Works** section: the 3 featured projects in the new card design, plus an "ALL PROJECTS →" button.
2. `/projects`: every published project in the same card grid.
3. `/projects/[slug]`: the full case-study page from the design, with these fields: year, type, client, role, status, headline, cover image, overview, website link, the problem, the solution, my role, features (accordion with images), monetization model, technologies used (labelled breakdown + icon grid), project summary, and previous/next project links.

## Skills read

- `AGENTS.md`: Supabase is the source of truth; Next.js + Supabase + Zod + Tailwind; GET for reads, POST for mutations; `npm run typecheck`/`lint`/`build`.
- Next 16 docs in `node_modules/next/dist/docs/01-app/`:
  - `03-api-reference/03-file-conventions/dynamic-routes.md`: `params` is a **Promise** and must be awaited. Use the `PageProps<'/projects/[slug]'>` helper.
  - `01-getting-started/08-caching.md` + `02-guides/caching-without-cache-components.md`: Cache Components is **not** enabled, so use the older model (`unstable_cache` with `tags` + `revalidate`, route-segment `revalidate`, `generateStaticParams`).
  - `01-getting-started/12-images.md`: remote images need `images.remotePatterns` in `next.config.ts`.
- No project skill directory exists.

## Existing code inspected

- `sections/Project.tsx`: client component (framer-motion) mapping over `projects` from `utils/data.tsx`; generic card with a gradient placeholder; header "My Works / Projects I worked on. At a glance." + a "View All Projects" link pointing to `/start-a-project`.
- `utils/data.tsx`: `projects: Project[]` mock (4 fake items). Also holds `logos`, `NavbarMenu`, `testimonials` and `experience`, which are untouched in this phase.
- `types/type.ts`: `Project` interface (title, description, tags, stack, year, href, accent).
- `components/layout/Navbar.tsx` + `utils/data.tsx`: the "Projects" nav item points to `/`.
- `sections/CallToAction.tsx`: reused at the bottom of the detail page.
- `next.config.ts`: empty. `package.json`: no Supabase, Zod or `server-only` packages. The lockfile is **pnpm**.
- `.env`: contains only `POSTGRE_ACCOUNT_PASSWORD` (not needed; see Security).
- Designs: `3.png` (desktop home), `2.png` (mobile home), `1.png` (tablet home), `4.png` (desktop detail page).

## Decisions (confirmed with you)

- **Seed** the 3 design projects (htmlhost.co, ColorInvoice, Naya AI) via a SQL seed file.
- **Technologies** go in a shared `technologies` table (name + icon), linked to projects through a join table, plus a per-project labelled breakdown ("Frontend:", "Backend & API:", …).
- **Images** go in **Supabase Storage** (public buckets). The DB stores object paths, not full URLs.
- A Supabase project already exists.

## Further decisions / assumptions

1. **Routes:** `/projects` and `/projects/[slug]`. The slug is lowercase kebab-case (`colorinvoice`, `htmlhost-co`, `naya-ai`).
2. **Long text** (overview, problem, solution, role, monetization, summary) is stored as plain text; blank lines separate paragraphs. It renders as `<p>` blocks. No HTML/Markdown rendering, so there is no XSS surface.
3. **Missing images render placeholders**: cards and the cover use a gradient tile, and tech icons use a monogram tile. Seeded rows start with `null` image paths, except tech icons for which a local SVG already exists (you upload those once; see manual steps).
4. **Homepage shows 3 featured projects**: `is_featured = true`, ordered by `sort_order`. `/projects` shows all rows with `is_published = true`.
5. **Caching:** queries are wrapped in `unstable_cache` with tag `projects` and `revalidate: 300`, so edits made in the Supabase dashboard appear within 5 minutes. Phase 2's admin will call `revalidateTag('projects')` for instant updates. Detail pages use `generateStaticParams`, and new slugs render on demand.
6. **Reads happen in Server Components** through a server-only data module. No public `/api/projects` route is added in this phase, since nothing needs it yet. Phase 2 adds POST mutation routes.
7. **Content accuracy:** ColorInvoice's text is transcribed from the design; a few lines cut off in the screenshot are completed and marked `-- VERIFY` in the seed. htmlhost.co and Naya AI get only the card-level text from the design (name, type, status, summary). Their detail sections stay empty and hidden until you fill them in. I won't invent case-study content for them.
8. **Not in this phase:** the decorative purple 3D ribbon next to the overview (no asset in the repo, so that column is left empty and the text keeps its width), the floating avatar stickers, and the Blog/About pages.
9. The existing `Project` interface and the `projects` mock are deleted. New types come from the Zod schemas (`z.infer`).

## Database schema: `supabase/migrations/20260927000000_projects.sql`

```sql
-- Enums
create type project_status as enum ('active', 'in_development', 'completed', 'archived');

-- Projects
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null,
  tagline          text not null,            -- detail H1: "{name} — {tagline}"
  summary          text not null,            -- card + prev/next description
  project_type     text not null,            -- "Software" (badge + TYPE)
  niche            text,                     -- e.g. "Fintech"
  year             smallint not null check (year between 2000 and 2100),
  client           text,
  role             text,                     -- "Founder, COO & CTO"
  status           project_status not null default 'active',
  website_url      text check (website_url is null or website_url ~ '^https://'),
  cover_image_path text,                     -- storage path in project-images
  cover_image_alt  text,
  overview         text,
  problem          text,
  solution         text,
  dev_role         text,                     -- "My Role" section
  monetization     text,
  tech_intro       text,                     -- intro line above breakdown
  project_summary  text,
  is_featured      boolean not null default false,
  is_published     boolean not null default false,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.project_features (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  description text,
  image_path  text,
  image_alt   text,
  sort_order  integer not null default 0
);

create table public.project_images (          -- extra gallery images
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  image_path  text not null,
  alt         text not null,
  sort_order  integer not null default 0
);

create table public.project_tech_breakdown (  -- "Frontend: …" paragraphs
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  label       text not null,
  description text not null,
  sort_order  integer not null default 0
);

create table public.technologies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  slug       text not null unique,
  icon_path  text                              -- storage path in tech-icons
);

create table public.project_technologies (
  project_id    uuid not null references public.projects(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete restrict,
  sort_order    integer not null default 0,
  primary key (project_id, technology_id)
);
```

Plus:

- Indexes on every `project_id` FK and on `projects (is_published, sort_order)`.
- An `updated_at` trigger on `projects`.
- **RLS enabled on every table**:
  - `projects`: `select` for `anon, authenticated` **where `is_published`**.
  - Child tables (`project_features`, `project_images`, `project_tech_breakdown`, `project_technologies`): `select` only when `exists (select 1 from projects p where p.id = project_id and p.is_published)`.
  - `technologies`: `select` for all.
  - **No insert/update/delete policies.** All writes are denied for anon; admin policies come in Phase 2.
- **Storage**: create public buckets `project-images` and `tech-icons` (public read via the public object URL). No anon upload policies.

## Seed: `supabase/seed.sql`

- 3 projects with `is_published = true` and `is_featured = true`, `sort_order` 1–3: htmlhost.co, ColorInvoice, Naya AI. All `project_type 'Software'`, `status 'active'`, `year 2026`.
- ColorInvoice gets everything from the design:
  - client "Yuyu", role "Founder, COO & CTO"
  - overview, problem, solution, my role, monetization, tech intro and project summary
  - 10 features (the accordion titles from the design, with descriptions where visible)
  - 8 tech-breakdown rows (Frontend, Backend & API, AI Pipeline, Database & Auth, Payments, Email Infrastructure, Observability, PWA & Deployment)
  - 8 technologies (JavaScript, Firebase, Google Cloud, HTML5, Sentry, Vercel, GitHub, CSS3)
- `technologies` seed: the 8 above plus Figma, TypeScript, Supabase and WordPress. `icon_path` is set to `<slug>.svg` only for the 8 that already have an SVG in `assets/images/` (figma, html5, css3, javascript, typescript, firebase, supabase, wordpress). The others are `null` (monogram fallback).
- Idempotent: `on conflict (slug) do update` so it can be re-run.

## App implementation

### Packages (pnpm, matching the lockfile)

`pnpm add @supabase/supabase-js zod server-only`

### Env: `.env.local` (gitignored by the existing `.env*` rule) + committed `.env.example`

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable or anon key>
```

### New files

| File | Purpose |
|---|---|
| `lib/env.ts` | Zod-validates both env vars (`url()`, non-empty) and throws a clear error at startup if either is missing. |
| `lib/supabase/server.ts` | `import "server-only"`. Creates a Supabase client with the publishable key (`auth: { persistSession: false }`). |
| `lib/storage.ts` | `publicImageUrl(bucket, path)` returns `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${encodeURI(path)}`, or `null` if there is no path. |
| `lib/projects/schema.ts` | Zod schemas: `projectCardSchema`, `projectDetailSchema` (with nested features, images, breakdown, technologies), `slugSchema`. Exports inferred types. |
| `lib/projects/queries.ts` | `import "server-only"`. `getFeaturedProjects()`, `getPublishedProjects()`, `getProjectBySlug(slug)` (includes prev/next by `sort_order`, wrapping around) and `getPublishedProjectSlugs()`. Each is wrapped in `unstable_cache(…, [key], { tags: ["projects"], revalidate: 300 })`, selects explicit columns (never `*`), orders children by `sort_order`, and `.parse()`s results with Zod. On a Supabase error it throws, so the `error.tsx` boundary catches it. |
| `components/projects/ProjectCard.tsx` | Server-safe card (see UI spec). |
| `components/projects/ProjectGrid.tsx` | `"use client"`: framer-motion stagger wrapper that keeps the current reveal animation. |
| `components/projects/StatusBadge.tsx` | Green/amber/grey dot + label per status. |
| `components/projects/Prose.tsx` | Splits text on `/\n\s*\n/` into `<p>`s. |
| `components/projects/DetailSection.tsx` | Two-column title/content section. |
| `components/projects/FeatureAccordion.tsx` | `"use client"` accordion. |
| `components/projects/TechGrid.tsx` | Icon tile grid. |
| `components/projects/ImagePlaceholder.tsx` | Gradient tile used when an image path is null. |
| `app/projects/page.tsx` | Listing page. `export const revalidate = 300`, plus metadata. |
| `app/projects/[slug]/page.tsx` | Detail page: `generateStaticParams`, `generateMetadata` (title, description = summary, OG image = cover), `notFound()` for an invalid or unknown slug. |
| `app/projects/error.tsx` | `"use client"` friendly error state with a retry button. |
| `supabase/migrations/…sql`, `supabase/seed.sql`, `.env.example` | As above. |

### Modified files

- `sections/Project.tsx`: becomes an **async Server Component** that calls `getFeaturedProjects()` and renders the header + `<ProjectGrid>` of `<ProjectCard>`s. If there are no projects, it shows an empty state ("Projects coming soon.").
- `next.config.ts`: add `images.remotePatterns` for `https://<host from NEXT_PUBLIC_SUPABASE_URL>` with `pathname: '/storage/v1/object/public/**'`.
- `utils/data.tsx`: delete the `projects` mock and change the Projects nav `href` to `/projects`.
- `types/type.ts`: delete the `Project` interface.

## UI spec (pixel expectations from the designs)

### Homepage "My Works" section (`3.png` desktop, `2.png` mobile)

- **Header row:**
  - Left: badge "My Works 🤩" (existing gradient-border badge), then heading "Projects I worked on." (white) and "At a glance." (gradient) on the next line. `text-3xl md:text-4xl font-bold`, `leading-tight`.
  - Right, bottom-aligned (desktop): **"ALL PROJECTS →"** pill: `rounded-full border border-white/10 bg-[#1b1030] px-7 py-3.5 text-sm font-bold uppercase tracking-wider`, hover `border-accent-1`, links to `/projects`.
  - On mobile the pill sits under the heading, left-aligned and auto width.
- **Grid:** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `gap-x-5 gap-y-10`, `mt-10 md:mt-14`.
- **Card** (the whole card is a `next/link` to `/projects/[slug]`, with no box background):
  - Image: `aspect-[7/8] rounded-xl overflow-hidden`, `next/image fill object-cover`, `sizes="(min-width:1200px) 33vw, (min-width:768px) 50vw, 100vw"`. Hover: image `scale-105` over 500ms.
  - Title row `mt-5 flex items-center gap-2.5`: name `text-lg font-bold`, then type badge `rounded-md bg-linear-65/srgb from-accent-1 to-accent-2 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide`.
  - Status `mt-3 flex items-center gap-2 text-sm text-muted`: dot `size-2.5 rounded-full`, where active = `bg-[#3ee03e]`, in_development = amber, completed = accent-2, archived = dim.
  - Summary `mt-3 text-sm leading-relaxed text-muted line-clamp-3`.
  - Focus-visible ring on the link for keyboard users.

### `/projects`

The same header style ("My Works" badge, "All projects." / "Things I've built." gradient) and the same card grid showing every published project. `pt-10 pb-24`.

### `/projects/[slug]` (`4.png`)

Everything sits in the shared container (`mx-auto w-full px-5 … lg:max-w-(--breakpoint-lg) lg:px-20`).

1. **Back link:** "‹ All Projects", `text-sm text-muted hover:text-white`, `pt-10`, links to `/projects`.
2. **H1:** `mt-8 text-3xl md:text-[2.5rem] font-bold leading-tight`, reading `{name} — {tagline}`.
3. **Meta row:** `mt-10 border-y border-white/6 py-7`; `grid grid-cols-2 gap-y-6 md:grid-cols-5`.
   - Each cell: label `text-sm uppercase text-muted`, value `mt-2 font-semibold`.
   - Cells: YEAR / TYPE / CLIENT / ROLE / STATUS (status value uses `StatusBadge`). A cell is hidden when its value is null.
4. **Cover:** `mt-8 rounded-2xl overflow-hidden`, `aspect-[16/10]`, `next/image` with `priority`, or the placeholder.
5. **Overview:** `mt-12 md:w-3/5`, Prose `text-lg leading-[1.85] text-muted`, 20px between paragraphs.
6. **Buttons:** `mt-8 flex flex-wrap gap-4`.
   - **CONTINUE READING ↓**: `rounded-full border border-white/10 bg-[#1b1030] px-7 py-3.5 text-sm font-bold uppercase`, `href="#problem"`. Hidden if there is no problem text.
   - **VISIT WEBSITE ↗**: gradient pill with the same sizing plus a glow shadow, `target="_blank" rel="noopener noreferrer"`. Hidden if there is no `website_url`.
7. **Divider:** `mt-20 border-t border-white/6`.
8. **Two-column sections**, each `DetailSection`: `grid gap-6 md:grid-cols-2 md:gap-16 py-14 md:py-20`. Title `text-3xl md:text-[2.5rem] font-bold leading-tight` in the left column. Content in the right column: Prose `text-base leading-[1.9] text-muted`. On mobile the title stacks above the content. A section is **omitted** when its data is empty. Order:
   - **The Problem** (`id="problem"`, `scroll-mt-24`)
   - **The Solution**
   - **My Role** (`dev_role`)
   - **Features**: FeatureAccordion.
     - Each item is a full-width `rounded-full` button `px-6 py-4 text-left font-semibold`.
     - Closed: `bg-[#4a2468]` with a chevron-down. Open: `bg-linear-65/srgb from-accent-1 to-accent-2` with a chevron-up.
     - `gap-3` between items. The open panel shows the image (`rounded-xl`, centred, max width ~90%) and/or the description (muted, `mt-4`), animated with a height/opacity transition.
     - The first item is open by default and only one is open at a time.
     - Buttons have `aria-expanded` and `aria-controls`; panels have `role="region"`.
   - **Gallery**: only if `project_images` exist. A `grid gap-4 sm:grid-cols-2` of `rounded-xl` images in the content column. (Not shown in the design; this renders the "more images" field.)
   - **Monetization Model**
   - **Technologies Used**:
     - The intro Prose, then each breakdown row as `<p><strong class="font-bold text-fg/90">{label}:</strong> {description}</p>` with `mt-5` spacing.
     - Then the TechGrid: `mt-8 grid grid-cols-3 gap-3`. Each tile is `rounded-xl border border-white/6 bg-[#0e0b16] py-5 flex flex-col items-center gap-3`, with a 40px icon (`next/image` from `tech-icons`, or a monogram circle) and the name `text-xs font-semibold`.
   - **Project Summary**
9. **Prev/Next:** `border-t border-white/6 mt-6 pt-10 grid md:grid-cols-2 gap-10`.
   - Left: "← PREVIOUS PROJECT" (`text-xs uppercase tracking-wider text-muted`), name `mt-3 text-2xl font-bold`, summary `mt-3 text-sm text-muted max-w-md`.
   - Right: the same, right-aligned on md+, with "NEXT PROJECT →".
   - Both are links, and both are hidden if there is only 1 project.
10. The **CallToAction** section is rendered below (reusing the existing component).

## Security requirements

- Only the **publishable/anon key** is used. **Do not add a service-role key in Phase 1.** Keys live in `.env.local` (gitignored), and only `.env.example` with placeholders is committed.
- `POSTGRE_ACCOUNT_PASSWORD` is not used by the app. **Don't paste the DB password into chat.** Migrations run in the Supabase SQL editor.
- RLS is on for all tables. Anon can only `select` published rows (and their children); every write is denied.
- The data module is `server-only`, so the Supabase client and queries never ship to the browser.
- The slug param is validated with a Zod regex before querying; invalid slugs go to `notFound()`, never to the DB.
- DB responses are Zod-parsed, so unexpected shapes fail loudly and never render raw.
- Text renders as React text nodes only. No `dangerouslySetInnerHTML` and no Markdown/HTML parsing.
- `website_url` must be `https://` (DB check), and external links use `rel="noopener noreferrer"`.
- `next/image` `remotePatterns` is restricted to the project's Supabase host and the public-storage path only.

## Acceptance criteria

- `utils/data.tsx` no longer contains project mock data; all project content comes from Supabase.
- The homepage shows exactly the featured, published projects in `sort_order`, styled like the design, with a working "ALL PROJECTS" link.
- `/projects` lists all published projects.
- `/projects/colorinvoice` renders every section in the order of the design. `/projects/htmlhost-co` renders the header, meta and cover placeholder, and hides its empty sections.
- `/projects/does-not-exist` and `/projects/Bad_Slug!` return the 404 page.
- Setting `is_published = false` on a project in Supabase removes it everywhere within 5 minutes (or after a restart in dev).
- Navbar "Projects" goes to `/projects`.
- Layout is correct at 375 / 768 / 1200 / 1440 px.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

## What I need from you before/at execution

1. Add to `.env.local` (I'll create the file with placeholders):
   - `NEXT_PUBLIC_SUPABASE_URL` (Project Settings → API → Project URL)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API Keys → publishable key, or the legacy `anon` key)

   Both are public-safe values, but put them in the file rather than in chat.
2. Run `supabase/migrations/20260927000000_projects.sql`, then `supabase/seed.sql`, in **Supabase Dashboard → SQL Editor**.
3. Upload the 8 SVGs from `assets/images/` to the `tech-icons` bucket (Storage → tech-icons → Upload), keeping their file names.

## Manual test steps (to share after implementation)

1. After steps 1–3 above: `npm run dev`.
2. http://localhost:3000: the My Works section shows htmlhost.co, ColorInvoice and Naya AI with SOFTWARE badges, green "Active" dots and placeholder images. Click "ALL PROJECTS" and you land on `/projects`.
3. Click ColorInvoice to open `/projects/colorinvoice`:
   - Check the meta row (2026 / Software / Yuyu / Founder, COO & CTO / Active).
   - "Continue reading" scrolls to The Problem.
   - The feature accordion opens one item at a time.
   - Technology tiles show icons for JavaScript, Firebase, HTML5 and CSS3, and monograms for the rest.
   - Prev/next links cycle through the projects.
4. Open http://localhost:3000/projects/nope and see the 404 page.
5. In Supabase Table Editor, set Naya AI `is_published = false`, restart `npm run dev`, and confirm it disappears from the homepage and `/projects`.
6. Upload an image to `project-images` (e.g. `colorinvoice/cover.png`), set ColorInvoice's `cover_image_path = 'colorinvoice/cover.png'`, restart dev, and confirm the image appears on the card and the detail cover.
7. RLS sanity check (replace the placeholders):
   ```bash
   # returns only published rows
   curl -s "https://<project-ref>.supabase.co/rest/v1/projects?select=slug,is_published" \
     -H "apikey: <publishable-key>" -H "Authorization: Bearer <publishable-key>"
   # write must be rejected (401/403, or 0 rows affected)
   curl -s -X POST "https://<project-ref>.supabase.co/rest/v1/projects" \
     -H "apikey: <publishable-key>" -H "Authorization: Bearer <publishable-key>" \
     -H "Content-Type: application/json" \
     -d '{"slug":"hack","name":"x","tagline":"x","summary":"x","project_type":"x","year":2026}'
   ```
8. Resize to 375px: cards go to one column, the meta row to 2 columns, and sections stack title-over-content.
