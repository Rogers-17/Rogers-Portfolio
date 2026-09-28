# Phase 3: Testimonials & Experience in Supabase + admin CRUD + responsive dashboard

## Goal

1. Move the **testimonials** and **experience** dummy data out of `utils/data.tsx` into new Supabase tables, **seeded with exactly the existing entries** (3 testimonials, 3 experiences).
2. The homepage **Testimonials** and **Experience** sections read from the database, with the same look as today.
3. Add **full CRUD** for both to the admin dashboard: list, create, edit, delete, publish/unpublish and reorder, with image uploads (avatar, company logo).
4. Make the **whole admin dashboard responsive** at every screen size (phone, tablet, laptop, desktop), including the existing Projects and Technologies screens.

Out of scope: redesigning the public sections to match the mockups (carousel, emoji art, "Load more", "Download CV"). The schema supports the extra mockup fields (avatar, logo, location, month-level dates) so a later redesign needs no migration. The `/about` page is a later phase.

## Skills read

- `AGENTS.md`: Supabase as the source of truth, Zod, Tailwind; POST for mutations and GET for reads; curl test steps; checks.
- Next 16 docs already applied in Phase 2 (`proxy.ts`, `revalidateTag(tag, { expire: 0 })` in route handlers, `revalidatePath`, the `unstable_retry` error boundary, and `PageProps` params as a Promise).
- No project skill directory exists.

## Existing code inspected

- `utils/data.tsx`: `testimonials` (quote, name, role, initials, rating) and `experience` (role, company, period, description, stack). ⚠️ This file also has **your uncommitted navbar edits**. I'll only remove the two arrays, and I'll commit only my hunk so your edits stay uncommitted.
- `types/type.ts`: `Testimonial` and `ExperienceItem` interfaces.
- `sections/Testimonials.tsx`: client component, a 3-column card grid with the quote icon, stars, a gradient-initials avatar and name/role.
- `sections/Experience.tsx`: client component, a vertical timeline of cards (role, period pill, gradient company, description, stack chips).
- Phase 2 admin: `AdminShell` (sidebar only from `lg` = **1200px**, so laptops at 1024px get the phone menu), `ProjectsTable`, `ProjectForm`, `TechnologiesManager`, `Field`, `ImageUpload`, `lib/admin/*`, `app/api/admin/*`.
- `lib/supabase/server.ts`: the public client tags every fetch with `projects`.
- The mockup (`3.png`): testimonial avatar photo + "name / title, company"; experience with company logo, company, role, location, "Nov 2022 – Present" and a computed duration ("3 Years 7 Months").

## Decisions / assumptions

1. **Seed = the current dummy entries, unchanged.** Experience periods convert as follows:
   - "2024 — Present" → start year 2024, current.
   - "2023 — 2024" → 2023 to 2024.
   - "2021 — 2023" → 2021 to 2023.

   Months stay empty for these, since they aren't known.
2. **Dates are year + optional month.** Columns: `start_year`, `start_month` (null OK), `end_year`/`end_month` (null OK), `is_current`. The display adapts:
   - with a month: "Nov 2022 — Present" plus a duration ("3 yrs 7 mos");
   - year only: "2024 — Present", with no duration, to avoid inventing precision.
3. **Initials are computed from the name** (no column). An avatar photo is optional; without one, the current gradient-initials circle stays.
4. **Experience skills are free-text chips** (`text[]`, e.g. "Tailwind"), not linked to the `technologies` table. Many of the existing items ("React", "Tailwind") aren't technologies with icons.
5. **Testimonial role is one field** ("CEO, Lendify"), matching the current data and the mockup's "Co-Founder, Marvel Oaks Solicitors UK Ltd".
6. **New public bucket `site-images`** (2 MB; png/jpeg/webp/avif) for avatars (`avatars/…`) and company logos (`logos/…`), with admin-only writes, like the others.
7. **Caching:** the public Supabase client takes a cache tag. Testimonials use tag `testimonials` and experience uses `experiences`. Admin saves call `revalidateTag(tag, { expire: 0 })` + `revalidatePath("/")`, so changes appear on the next load, as with projects.
8. **Reordering:** a generic `admin_reorder_rows(p_table, ids)` RPC with a hard-coded table allowlist (`testimonials`, `experiences`). The existing projects reorder is untouched.
9. **Admin pattern mirrors Projects:** a list page (↑/↓ reorder, Published switch, edit, delete), `/new` and `/[id]` editor pages, and a sticky save bar. The forms are much shorter than the project form.
10. **Responsive strategy for the dashboard** (breakpoints: `sm` 375, `md` 768, `lg` 1200):
    - **< md (phones):** sticky top bar with the logo and a menu button. Navigation opens as a **slide-in drawer** with a backdrop, instead of the current dropdown. It closes on link click, backdrop tap or Escape, locks body scroll and traps focus while open.
    - **md–lg (tablets, small laptops like 1024px):** a **collapsed icon rail** (`w-16`) with icons only, tooltips/`aria-label`s and an active indicator. Previously these widths got the phone menu.
    - **≥ lg:** the full `w-60` sidebar as today.
    - The **sticky save bar and toasts** follow the sidebar width at each breakpoint (`left-0` / `md:left-16` / `lg:left-60`). On phones the save bar stacks, with the primary button full-width.
    - **Touch targets** are at least 40×40px below `md` (icon buttons grow from 32 to 40px).
    - **Lists** (projects, testimonials, experience) become stacked cards on phones with the controls in a bottom row, and a single row from `md`.
    - **Form grids** are 1 column on phones, 2 on md, and 3 where they already exist on lg.
    - **Tech picker and image uploads** go full-width on phones, and no content scrolls horizontally at 320px.
11. **Visual verification:** I'll take headless-browser screenshots (the Chrome already installed, via a temporary `puppeteer-core` in the scratchpad, not added to the project) of each admin screen at 375, 768, 1024 and 1440px while signed in with the `ADMIN_TEST_*` credentials. I'll review them before handing over. *(This needs the `ADMIN_TEST_*` lines in `.env.local` again. If you've already deleted them, add them back temporarily.)*

## Database: `supabase/migrations/20260929000000_testimonials_experiences.sql`

```sql
create table public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null check (char_length(quote) between 1 and 1000),
  author_name  text not null check (char_length(author_name) between 1 and 80),
  author_role  text check (char_length(author_role) <= 120),
  avatar_path  text,
  rating       smallint check (rating between 1 and 5),
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.experiences (
  id           uuid primary key default gen_random_uuid(),
  role         text not null check (char_length(role) between 1 and 120),
  company      text not null check (char_length(company) between 1 and 120),
  company_url  text check (company_url is null or company_url ~ '^https://'),
  logo_path    text,
  location     text check (char_length(location) <= 120),
  start_year   smallint not null check (start_year between 1970 and 2100),
  start_month  smallint check (start_month between 1 and 12),
  end_year     smallint check (end_year between 1970 and 2100),
  end_month    smallint check (end_month between 1 and 12),
  is_current   boolean not null default false,
  description  text check (char_length(description) <= 2000),
  skills       text[] not null default '{}' check (cardinality(skills) <= 20),
  is_published boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (is_current or end_year is not null),
  check (end_year is null or end_year > start_year
         or (end_year = start_year and coalesce(end_month, 12) >= coalesce(start_month, 1)))
);
```

Plus:

- `updated_at` triggers (reusing `public.set_updated_at()`) and indexes on `(is_published, sort_order)`.
- **RLS:** public `select` where `is_published`; admin `select/insert/update/delete` via `public.is_admin()`.
- The **`site-images` bucket** with limits and admin-only write/list/delete storage policies.
- **`public.admin_reorder_rows(p_table text, ids uuid[])`:** `security invoker`, `set search_path = ''`. It raises unless `is_admin()`, **raises unless `p_table in ('testimonials','experiences')`**, and uses `format('%I', …)` for the table name. Execute is granted to `authenticated` only.

Seed file `supabase/seed_testimonials_experiences.sql` (idempotent: it only inserts when the table is empty) with the 3 + 3 existing entries in their current order.

## Files

### New

| File | Purpose |
|---|---|
| `supabase/migrations/20260929000000_testimonials_experiences.sql`, `supabase/seed_testimonials_experiences.sql` | As above. |
| `lib/content/schema.ts` | Client-safe Zod read schemas + types (`TestimonialPublic`, `ExperiencePublic`) and helpers: `initials(name)`, `formatPeriod(exp)`, `formatDuration(exp, now)`, `MONTHS`. |
| `lib/content/queries.ts` | `server-only`: `getPublishedTestimonials()`, `getPublishedExperiences()`. React `cache()` + a tagged fetch; Zod-parsed; explicit columns; ordered by `sort_order`. |
| `lib/content/cache.ts` | `TESTIMONIALS_CACHE_TAG`, `EXPERIENCES_CACHE_TAG`. |
| `lib/admin/content-schemas.ts` | Shared input schemas: `testimonialInputSchema`, `experienceInputSchema` (with cross-field rules for current/end date and end ≥ start), and `contentToggleSchema` (`is_published` only). |
| `lib/admin/content-queries.ts` | `server-only`, uncached: list/get for admin. |
| `app/api/admin/testimonials/route.ts` | `GET` list, `POST` create. |
| `app/api/admin/testimonials/[id]/route.ts` | `GET` one, `POST` update. |
| `app/api/admin/testimonials/[id]/delete/route.ts` | `POST`: deletes the row + best-effort avatar removal. |
| `app/api/admin/testimonials/[id]/toggle/route.ts` | `POST {field: "is_published", value}`. |
| `app/api/admin/testimonials/reorder/route.ts` | `POST {ids}`. |
| `app/api/admin/experiences/…` | The same five routes for experience. |
| `app/admin/(dashboard)/testimonials/page.tsx`, `new/page.tsx`, `[id]/page.tsx` | List + editor pages. |
| `app/admin/(dashboard)/experience/page.tsx`, `new/page.tsx`, `[id]/page.tsx` | List + editor pages. |
| `components/admin/ContentList.tsx` | A generic, reusable, responsive list (thumbnail, title, subtitle, meta, reorder, publish switch, edit/delete) used by testimonials and experience. |
| `components/admin/TestimonialForm.tsx`, `components/admin/ExperienceForm.tsx` | The editors. |
| `components/admin/SaveBar.tsx` | Sticky responsive save bar extracted from `ProjectForm` and shared by all three editors. |
| `components/admin/ChipsInput.tsx` | Add skills by typing and pressing Enter or comma; remove with × or Backspace; max 20. |
| `components/admin/MobileDrawer.tsx` (or inside `AdminShell`) | Accessible slide-in navigation. |

### Modified

- **`sections/Testimonials.tsx`, `sections/Experience.tsx`:** each becomes an async Server Component that fetches, plus a client grid/timeline child for the animations. **Same markup and styles as today**, plus:
  - an avatar `<Image>` when `avatar_path` is set (otherwise initials);
  - stars only when `rating` is set;
  - a company logo (32px, rounded) before the company name when set;
  - location in muted text when set;
  - the period from `formatPeriod`, and the duration in muted text when months are known;
  - skills chips when present;
  - an empty-state line when there are no rows.
- `lib/supabase/server.ts`: `createServerSupabase(tag = PROJECTS_CACHE_TAG)`. Existing callers are unchanged.
- `app/api/admin/uploads/route.ts` + `lib/admin/uploads.ts` + `lib/admin/schemas.ts`: allow the `site-images` bucket (png/jpg/webp/avif, 2 MB).
- `lib/storage.ts`: add `"site-images"` to `StorageBucket`.
- `lib/admin/revalidate.ts`: add `revalidateTestimonials()` and `revalidateExperiences()`.
- `components/admin/AdminShell.tsx`: nav gets **Testimonials** and **Experience**, plus the drawer / icon rail / full sidebar behaviour.
- `components/admin/Field.tsx`: responsive `iconButtonClass` (40px below md), and `Card` padding `p-4 md:p-7`.
- `components/admin/ProjectsTable.tsx`, `ProjectForm.tsx`, `TechnologiesManager.tsx`, `ImageUpload.tsx`, `Toast.tsx`, `app/admin/(dashboard)/projects/page.tsx`: responsive fixes. `ProjectForm` uses the shared `SaveBar`.
- `utils/data.tsx`: remove `testimonials` and `experience` (only this hunk gets committed).
- `types/type.ts`: remove `Testimonial` and `ExperienceItem`.

## Admin UI spec

- **Testimonials list:**
  - Each card shows the avatar (or initials) at 48px, the author name (bold), the role (muted), a two-line clamped quote preview, and stars.
  - Controls: ↑/↓, Published switch, Edit and Delete (with confirm).
  - The header has "Testimonials" and a "New testimonial" button; there's an empty-state CTA.
- **Testimonial editor:**
  - Author name (required, ≤ 80), role/company (≤ 120), rating (a select: None, 1–5), and quote (a textarea with a counter out of 1000).
  - Avatar upload (square preview, `site-images` → `avatars/`) and a Published switch.
  - The shared SaveBar: Save / Delete / unsaved-changes indicator + `beforeunload` guard.
- **Experience list:** each card shows the logo (or initials) at 48px, the role (bold), "Company · Location" (muted), the period ("Nov 2022 — Present"), and a "Current" badge. Controls are the same as for testimonials.
- **Experience editor:**
  - Role*, Company*, Company URL (https), Location.
  - **Start:** month select (optional, "—") + year*.
  - A **"I currently work here"** switch; when it's off, **End** gets a month select + year*.
  - Description (≤ 2000), Skills (ChipsInput), logo upload (`site-images` → `logos/`), and a Published switch.
  - Inline errors appear for "End date must be after the start date" and "End year is required unless current".
- All forms reuse `Field`/`Card`/`ImageUpload`/`Switch`/`Toast`; errors map onto fields, and the page scrolls to the first invalid one.

## Security requirements

- **RLS** on both tables: the public reads only published rows, and every write requires `is_admin()`. The storage policies for `site-images` are admin-only.
- **Every route** uses `requireAdminApi` (bearer or cookie + Origin check); IDs are validated as UUIDs; bodies are Zod-validated with length/array caps; unknown keys are stripped.
- **`admin_reorder_rows`** checks the table against an allowlist before building dynamic SQL, and quotes it with `%I`, so SQL injection through `p_table` isn't possible.
- **Uploads** keep magic-byte checks and server-generated paths; `site-images` rejects SVG entirely.
- **Text** renders as React text nodes only; there's still no HTML rendering.
- `company_url` must be `https://`, and external links use `rel="noopener noreferrer"`.
- DB errors map to safe messages; details are logged server-side only.

## Acceptance criteria

- `utils/data.tsx` has no testimonials or experience arrays. The homepage sections render the 3 + 3 seeded entries from Supabase and **look the same as before**.
- Creating, editing, deleting, publishing and reordering a testimonial or experience in the admin shows up on `/` on the next load.
- Validation:
  - an empty quote → 400;
  - rating 7 → 400;
  - end before start → 400 with a field error;
  - not current and no end year → 400;
  - `admin_reorder_rows('projects', …)` or `('admin_users', …)` called directly → raises an error.
- Uploading an SVG to `site-images` → 400. An avatar upload shows on the homepage card.
- Signed out: 401 on every new API route, and the new admin pages redirect to login.
- **Responsive:**
  - At **375 / 768 / 1024 / 1440px** every admin screen (login, projects list, project editor, technologies, testimonials list and editor, experience list and editor) has no horizontal scroll, no overlapping or clipped controls, and a reachable save bar.
  - Navigation is a drawer below 768, an icon rail from 768 to 1199, and a full sidebar at 1200 and up.
  - Screenshots are reviewed.
- `npm run typecheck`, `npm run lint` and `npm run build` pass, and the Phase 2 e2e suite still passes (44/44). A new Phase 3 API suite passes.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

Plus the e2e API suites (Phase 2 + Phase 3) against `next start`, and the headless screenshot pass at the 4 widths.

## What you'll need to do (one time)

1. **SQL Editor:** run `supabase/migrations/20260929000000_testimonials_experiences.sql`, then `supabase/seed_testimonials_experiences.sql`.
2. Keep (or temporarily re-add) `ADMIN_TEST_EMAIL` / `ADMIN_TEST_PASSWORD` in `.env.local` for the automated checks. Remove them afterwards.

## Manual test steps (to share after implementation)

UI:

1. `npm run dev` and open http://localhost:3000. The Testimonials and Experience sections look as before, now from Supabase.
2. Go to `/admin` → **Testimonials** → "New testimonial". Fill in the name, role and quote, set rating 5, upload an avatar, then Save. It appears on `/` with the photo.
3. Move it to the top with ↑; the order on `/` changes. Toggle Published off; it disappears from `/`.
4. **Experience** → edit "Freelance Web Developer": set Start to Mar 2021 and End to Dec 2023, add location "Lagos", add a skill, upload a logo, then Save. On `/` you should see "Mar 2021 — Dec 2023 · 2 yrs 10 mos", the logo and the location.
5. Try End = Jan 2020 (before the start): an inline error appears and nothing is saved.
6. Delete the test testimonial. It disappears from `/`.
7. **Responsive:** in DevTools device mode, try iPhone SE (375), iPad Mini (768), 1024 and 1440.
   - Below 768 the menu button opens a drawer; tap the backdrop or press Escape to close it.
   - From 768 to 1199 there's an icon rail.
   - At 1200 and up there's the full sidebar.
   - No sideways scrolling anywhere, and the save bar is always reachable.

API (curl, with `$TOKEN` from the Phase 2 token command):

```bash
# 401 without auth
curl -s http://localhost:3000/api/admin/testimonials

# List
curl -s http://localhost:3000/api/admin/testimonials -H "Authorization: Bearer $TOKEN"

# Create testimonial
curl -s -X POST http://localhost:3000/api/admin/testimonials \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"quote":"Great to work with.","author_name":"Test Person","author_role":"CTO, Example","rating":5,"is_published":true}'

# Update (use returned id)
curl -s -X POST http://localhost:3000/api/admin/testimonials/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"quote":"Updated quote.","author_name":"Test Person","author_role":"CTO, Example","rating":4,"is_published":true}'

# Toggle / reorder / delete
curl -s -X POST http://localhost:3000/api/admin/testimonials/<id>/toggle -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"field":"is_published","value":false}'
curl -s -X POST http://localhost:3000/api/admin/testimonials/reorder -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"ids":["<id1>","<id2>","<id3>"]}'
curl -s -X POST http://localhost:3000/api/admin/testimonials/<id>/delete -H "Authorization: Bearer $TOKEN"

# Create experience (end before start -> 400)
curl -s -X POST http://localhost:3000/api/admin/experiences \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"Engineer","company":"Acme","start_year":2024,"start_month":6,"end_year":2023,"is_current":false,"skills":[],"is_published":true}'

# Valid experience
curl -s -X POST http://localhost:3000/api/admin/experiences \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"Engineer","company":"Acme","location":"Lagos","start_year":2022,"start_month":11,"is_current":true,"description":"Built things.","skills":["Next.js","Supabase"],"is_published":true}'
```
