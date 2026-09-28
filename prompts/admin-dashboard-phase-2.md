# Phase 2: Admin dashboard (auth + manage projects & technologies)

## Goal

A private `/admin` area where you (and only you) can sign in and manage all project content without touching Supabase directly:

- Create, edit, delete, publish/unpublish, feature and reorder **projects**, including every detail-page field (story sections, features, gallery, tech breakdown, linked technologies).
- Upload images (cover, feature images, gallery, tech icons) to Supabase Storage.
- Manage the shared **technologies** list (name + icon).
- After every save, the public site (`/`, `/projects`, `/projects/[slug]`) updates on the **next page load**, with no 60-second wait.

Out of scope: experience/testimonials/about (Phase 3) and the blog (Phase 4). Their admin screens get added to this same dashboard later.

## Skills read

- `AGENTS.md`: Supabase is the source of truth; Next.js + Supabase + Zod + Tailwind. **POST for every mutation, GET only for reads.** Share curl commands for API features.
- Next 16 docs (`node_modules/next/dist/docs/01-app/`):
  - `01-getting-started/16-proxy.md` + `03-api-reference/03-file-conventions/proxy.md`: **Middleware is renamed to `proxy.ts`** (Node runtime by default). Only use it for *optimistic* redirects, never as the real authorization check.
  - `02-guides/authentication.md` + `02-guides/data-security.md`: verify auth close to the data (in each page/route), keep the data layer `server-only`.
  - `03-api-reference/04-functions/revalidateTag.md`: the one-argument form is **deprecated**. `"max"` serves stale content once. In Route Handlers, **`revalidateTag(tag, { expire: 0 })`** gives immediate expiry.
  - `updateTag.md`: Server Actions only, so it is not usable from route handlers.
  - `revalidatePath.md`: in Route Handlers it marks the path, and the next visit regenerates it.
  - `03-file-conventions/error.md`: error boundaries receive `unstable_retry`.

## Existing code inspected

- `app/layout.tsx`: root layout renders `<Navbar/>` and `<Footer/>` around every page, which would wrap the admin area too.
- `app/page.tsx`, `app/projects/**`: public routes (Phase 1).
- `lib/supabase/server.ts`: cookie-less publishable-key client, used inside `unstable_cache` (must stay cookie-less).
- `lib/projects/queries.ts`: public cached reads tagged `projects`, with 1s dev / 60s prod revalidate.
- `lib/projects/schema.ts`: Zod read schemas + `slugSchema`.
- `supabase/migrations/20260927000000_projects.sql`: tables + public read-only RLS + buckets `project-images`, `tech-icons`.
- `package.json`: has `@supabase/supabase-js`, `zod`, `server-only`. No `@supabase/ssr` yet.

## Decisions / assumptions

1. **Sign-in: email + password** via Supabase Auth (confirmed over magic link). You create your admin user once in the Supabase dashboard, and public sign-ups get disabled. Reasons:
   - it doesn't depend on email delivery (Supabase's built-in email sender is heavily rate-limited and needs redirect-URL setup);
   - it works on any device instantly;
   - it lets the API be tested with curl via a password-grant access token.
2. **Who is admin: an `admin_users` allowlist table** (by `auth.users.id`) plus a `public.is_admin()` SQL function. Being signed in is **not** enough: RLS on every table and storage bucket checks `is_admin()`. Even if sign-ups were accidentally left on, a random account could not read drafts or write anything.
3. **No service-role key.** Every admin write runs with the signed-in admin's own JWT, so the database enforces permissions through RLS. The key that bypasses RLS never lives in the app.
4. **Mutations are `POST` Route Handlers under `/api/admin/**`** (AGENTS.md rule). Admin pages read data directly in Server Components; there are also two small `GET` routes for listing/reading projects (useful for curl checks and future use).
5. **Routes accept two auth modes:**
   - The **session cookie** (the dashboard UI), with an **Origin check** as CSRF protection.
   - An **`Authorization: Bearer <access_token>`** header, so the API can be tested with curl as AGENTS.md requires.
6. **Saving a project is atomic.** A Postgres function `admin_save_project(p_id, payload jsonb)` upserts the project and replaces its features, gallery, breakdown and technology links **in one transaction**. It runs as `security invoker`, so RLS still applies, and it also asserts `is_admin()`.
7. **Cache busting after every mutation:** `revalidateTag("projects", { expire: 0 })` plus `revalidatePath("/")`, `revalidatePath("/projects")` and `revalidatePath("/projects/[slug]", "page")`.
8. **Route groups keep the admin free of the public chrome:**
   - Move the public pages into `app/(site)/`, whose layout renders Navbar + Footer.
   - `app/admin/` gets its own dashboard layout.
   - The root `app/layout.tsx` keeps only `<html>`, `<body>`, fonts and global CSS.
   - **Public URLs do not change.**
9. **Uploads go through the server** (`POST /api/admin/uploads`), which:
   - validates the type by **magic bytes** and the size,
   - generates the storage path itself (`<folder>/<uuid>.<ext>`), never trusting the client's file name,
   - uploads with the admin's JWT.

   Buckets also get server-side `file_size_limit` and `allowed_mime_types`. Images uploaded and then abandoned without saving stay in storage; deleting a project deletes its known files (best effort).
10. **Text stays plain text** (blank line = new paragraph), so there is still no HTML rendering and no XSS surface.
11. **Reordering** uses ↑/↓ buttons (accessible, no drag-and-drop library). The homepage shows the first 3 **featured** projects by sort order, and the list warns if more than 3 are featured.
12. **Admin UI style:** the site's dark theme and tokens (`bg-surface`, `bg-card`, accent gradient, white/6 borders), a desktop-first dashboard that still works at 375px. There's no design file for the admin, so it follows the conventions of a clean dashboard.

## Database: `supabase/migrations/20260928000000_admin.sql`

- `admin_users (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz default now())`. RLS on; an admin can `select` only their own row; no write policies (rows are added via the SQL editor).
- `public.is_admin() returns boolean`: `stable`, `security definer`, `set search_path = ''`, returning `exists (select 1 from public.admin_users where user_id = auth.uid())`. `revoke all … from public`, then `grant execute … to anon, authenticated`.
- For **each** content table (`projects`, `project_features`, `project_images`, `project_tech_breakdown`, `technologies`, `project_technologies`), add policies for `authenticated`:
  - `select using (public.is_admin())`, so admins also see drafts;
  - `insert with check (public.is_admin())`;
  - `update using (public.is_admin()) with check (public.is_admin())`;
  - `delete using (public.is_admin())`.
- **Storage** (`storage.objects`): `insert`/`update`/`delete` for `authenticated`, `using/with check (bucket_id in ('project-images','tech-icons') and public.is_admin())`.
- **Bucket limits:**
  - `project-images`: 5 MB, `image/png, image/jpeg, image/webp, image/avif, image/gif`.
  - `tech-icons`: 1 MB, `image/svg+xml, image/png, image/webp`.
- `public.admin_save_project(p_id uuid, payload jsonb) returns uuid`: `security invoker`, `set search_path = ''`.
  - Raises `insufficient_privilege` unless `is_admin()`.
  - Inserts the project when `p_id` is null, otherwise updates that row.
  - Deletes and re-inserts `project_features`, `project_images`, `project_tech_breakdown` and `project_technologies` from `payload` arrays, keeping array order as `sort_order`.
  - Returns the id.
  - `grant execute … to authenticated` only.
- `public.admin_reorder_projects(ids uuid[])`: `security invoker`, admin-asserted; sets `sort_order = array position`.

## Packages

`pnpm add @supabase/ssr`

## Files

### New

| File | Purpose |
|---|---|
| `supabase/migrations/20260928000000_admin.sql` | As above. |
| `proxy.ts` | Matcher `/admin/:path*` and `/api/admin/:path*`. Refreshes the Supabase session cookies (the `@supabase/ssr` pattern). **Optimistic** redirect: requests to `/admin/*` other than `/admin/login` with no user go to `/admin/login?next=<path>`. No DB queries here. |
| `lib/supabase/session.ts` | `server-only`. `createSessionClient()`: `createServerClient` from `@supabase/ssr` bound to `cookies()` (try/catch in `setAll` for Server Components). `createBearerClient(token)`: supabase-js with `global.headers.Authorization`. |
| `lib/admin/auth.ts` | `server-only`. `requireAdminPage()`: `auth.getUser()` (verified with the Auth server) + `rpc('is_admin')`; redirects to `/admin/login` if either fails, and returns `{ supabase, user }`. `requireAdminApi(request)`: picks bearer or cookie mode; in cookie mode, rejects a missing or foreign `Origin` with **403**; returns **401** with no user and **403** if not admin. |
| `lib/admin/http.ts` | Shared JSON helpers: `ok(data, status)`, `fail(status, code, message, fieldErrors?)`, `parseJson(request, schema)` (400 on invalid JSON or a Zod error, with `z.flattenError` field errors). |
| `lib/admin/revalidate.ts` | `revalidateProjects()`: the tag + path calls from Decision 7. |
| `lib/admin/schemas.ts` | **Shared (no server-only)** Zod input schemas used by both the form and the API. `projectInputSchema`, `technologyInputSchema`, `reorderSchema`, `toggleSchema`, `loginSchema`, with length limits: name ≤ 80, tagline ≤ 200, summary ≤ 280, long text ≤ 10,000, feature title ≤ 120, feature/breakdown description ≤ 2,000; max 30 features, 30 gallery images, 20 breakdown rows, 40 technologies. `website_url` must be `https://`. Storage paths must match `^[a-z0-9-]+/[0-9a-f-]{36}\.(png\|jpe?g\|webp\|avif\|gif\|svg)$`. Year is 2000–2100. Slug uses `slugSchema`. |
| `lib/admin/queries.ts` | `server-only`, **uncached**, using the session client: `listProjectsForAdmin()` (drafts included, with cover URL, published/featured, updated_at), `getProjectForAdmin(id)` (full nested shape), `listTechnologiesForAdmin()` (with usage counts). |
| `lib/admin/uploads.ts` | Magic-byte sniffing (PNG, JPEG, WEBP, AVIF, GIF; SVG by `<svg` root after trimming an XML prolog). **SVG is rejected if it contains `<script`, `on*=` attributes or `javascript:`.** Plus size limits per bucket. |
| `app/api/admin/auth/login/route.ts` | `POST {email, password}`: `signInWithPassword` (cookie client), then the `is_admin` check (signs out and returns 403 if not admin). Returns 200 `{ ok }`, 400 or 401 (a generic "Invalid email or password"). |
| `app/api/admin/auth/logout/route.ts` | `POST`: signs out and clears cookies. |
| `app/api/admin/projects/route.ts` | `GET` list (drafts included). `POST` create: returns 201 `{ id, slug }`, or 409 on a duplicate slug. |
| `app/api/admin/projects/[id]/route.ts` | `GET` one. `POST` full update: 200, 404, or 409 on a duplicate slug. |
| `app/api/admin/projects/[id]/delete/route.ts` | `POST`: deletes the row (children cascade) plus best-effort removal of its storage files. |
| `app/api/admin/projects/[id]/toggle/route.ts` | `POST {field: "is_published" \| "is_featured", value: boolean}`. |
| `app/api/admin/projects/reorder/route.ts` | `POST {ids: uuid[]}`. |
| `app/api/admin/technologies/route.ts` | `POST` create (409 on a duplicate name or slug). |
| `app/api/admin/technologies/[id]/route.ts` | `POST` update. |
| `app/api/admin/technologies/[id]/delete/route.ts` | `POST`: returns 409 "In use by N projects" when linked (the FK is `restrict`). |
| `app/api/admin/uploads/route.ts` | `POST` multipart `{ file, bucket: "project-images" \| "tech-icons", folder }` (folder = kebab-case, e.g. the project slug or `technologies`). Returns 201 `{ path, url }`, 400 for a bad type or size, or 413. |
| `app/admin/layout.tsx` | Admin shell: sidebar (Projects, Technologies, "View site ↗", Sign out). `metadata.robots = { index: false, follow: false }`. |
| `app/admin/login/page.tsx` + `components/admin/LoginForm.tsx` | Email/password form. Shows the error message. On success goes to `next`, which must be a same-origin path starting with `/admin`, otherwise `/admin/projects`. |
| `app/admin/page.tsx` | Redirects to `/admin/projects`. |
| `app/admin/projects/page.tsx` + `components/admin/ProjectsTable.tsx` | Projects list. |
| `app/admin/projects/new/page.tsx`, `app/admin/projects/[id]/page.tsx` + `components/admin/ProjectForm.tsx` (and sub-components) | Create/edit form. |
| `app/admin/technologies/page.tsx` + `components/admin/TechnologiesManager.tsx` | Technologies screen. |
| `components/admin/ImageUpload.tsx` | Upload + preview + alt text + remove. |
| `components/admin/RepeatableList.tsx` | Add/remove/move up/down helper. |
| `components/admin/Field.tsx` | Labelled input/textarea/select with error and hint. |
| `app/admin/error.tsx` | Error boundary with `unstable_retry`. |

### Moved / modified

- `app/page.tsx` → `app/(site)/page.tsx`; `app/projects/**` → `app/(site)/projects/**`.
- New `app/(site)/layout.tsx` renders `<Navbar/>{children}<Footer/>`.
- `app/layout.tsx` loses the Navbar/Footer imports.
- `lib/projects/queries.ts`: export `PROJECTS_CACHE_TAG` (already exported), otherwise unchanged.
- `.env.example`: unchanged. No new env vars.

## Admin UI spec

- **Shell:**
  - **Desktop:** a fixed left sidebar `w-60` (`bg-card border-r border-white/6`) with the logo, nav links (the active one gets a gradient left bar + white text) and Sign out at the bottom. Content area `px-8 py-8 max-w-6xl`.
  - **Mobile:** a top bar with a menu toggle.
- **Login:** centred card `max-w-sm` with `bg-card rounded-2xl border border-white/6 p-8`, the logo, and the heading "Admin sign in". Email + password inputs (`rounded-xl bg-white/4 border-white/10 focus:border-accent-1`), a full-width gradient button, and an inline error in rose. The button is disabled while submitting.
- **Projects list:**
  - Header: "Projects" + a "New project" gradient button.
  - Table (card list on mobile) with columns: ↑/↓ order, 48px cover thumb (or monogram), name + slug, type, year, status badge, **Published** switch, **Featured** switch, updated date, then Edit and View ↗ actions.
  - Toggles and reorders call the API optimistically and roll back on error with a toast.
  - Amber notice when more than 3 projects are featured.
  - Empty state with a CTA.
- **Project form:** one page of stacked cards, each with a title and short hint.
  1. **Basics:**
     - Name; Slug (auto-filled from the name until edited manually, shown as `/projects/<slug>`); Tagline; Summary (with a character counter out of 280).
     - Type, Niche, Year, Client, Role, Status select, Website URL.
  2. **Cover image:** ImageUpload (16:10 preview) + alt text.
  3. **Story:** textareas for Overview, The Problem, The Solution, My Role, Monetization Model and Project Summary, auto-growing, with the hint "Leave a blank line between paragraphs."
  4. **Features:** a repeatable list; each item has a title, a description and an optional image + alt, plus ↑ ↓ ✕ buttons and "Add feature".
  5. **Technologies:**
     - Intro textarea.
     - A breakdown repeatable (label + description).
     - A technology picker: searchable chips from the `technologies` table. Selected chips are ordered and can be removed; there's a "Manage technologies ↗" link.
  6. **Gallery:** multi-upload, a grid with alt text + reorder + remove per image.
  7. **Visibility:** Published and Featured switches.
- **Sticky bottom save bar:**
  - "Save" (gradient; shows a spinner and a "Saved" toast), "View live ↗" (when published) and "Delete" (red text, confirm dialog).
  - An unsaved-changes indicator plus a `beforeunload` guard.
  - Client-side Zod validation before submitting; server field errors map onto the inputs, and the page scrolls to the first error.
- **Technologies:** a grid of tiles (icon, name, slug, "used by N"), each with Edit/Delete. The "Add technology" form has name, slug (auto) and an icon upload (SVG/PNG/WEBP). Delete is disabled with a tooltip when the technology is in use.
- **Accessibility:** real `<label>`s, `aria-invalid`/`aria-describedby` on errors, switches as `role="switch"` with `aria-checked`, and visible focus rings.

## Security requirements

- **Authorization is enforced in the database.** RLS + `is_admin()` on every table and storage bucket; the app-level checks are defence in depth. No service-role key anywhere.
- **Auth is verified on every admin page and API route** with `auth.getUser()` (validated with the Supabase Auth server), not just the proxy, and never from the cookie alone.
- **CSRF:** cookie-authenticated POSTs must carry an `Origin` equal to the app's own origin, otherwise 403. Session cookies are `SameSite=Lax`, `HttpOnly` and `Secure` in production (the `@supabase/ssr` defaults, which I'll verify).
- **Input:** every request body is Zod-validated with length and array caps; unknown keys are stripped. IDs are validated as UUIDs, and slugs match the regex.
- **Uploads:** magic-byte type detection (the client MIME type is ignored), per-bucket size limits (also enforced by the bucket config), server-generated paths, SVG script/handler rejection, and uploads only to the two allowlisted buckets.
- **Login:** a generic error message (no user enumeration); Supabase Auth's built-in rate limits apply. A non-admin account that signs in is immediately signed out and gets 403.
- **Redirects:** the `next` param is only honoured for same-origin paths under `/admin`, which prevents open redirects.
- **Admin pages send `noindex`** and are dynamic (never cached or shared between users).
- **Errors:** responses never leak raw Postgres or stack details. Messages are mapped (e.g. unique violation → 409 "Slug already in use"), and details are logged server-side only.
- Public sign-ups are disabled in the Supabase dashboard (a manual step below).

## Acceptance criteria

- Signed out: `/admin/*` redirects to `/admin/login`, and every `/api/admin/*` call returns **401**.
- Signing in with a non-admin account returns 403 and leaves no session.
- The admin can create a project with all sections, features, gallery, breakdown and technologies, save it, and see it on `/projects/<slug>` **on the next page load** (after publishing).
- Editing any field, reordering or toggling Published/Featured shows up on the public site on the next load.
- A duplicate slug shows an inline "Slug already in use" error and nothing is saved.
- Uploading a `.txt` file renamed to `.png`, or an SVG containing `<script>`, is rejected with 400.
- Deleting a technology that is in use returns 409 and shows a message; deleting an unused one works.
- Deleting a project removes it from the public site and removes its storage files.
- A cross-origin cookie POST (a foreign `Origin` header) returns 403.
- Public pages are unchanged at `/`, `/projects` and `/projects/[slug]`, and the admin has no public Navbar/Footer.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

Plus live API checks with curl against the dev server (below).

## What you'll need to do (one time)

1. **SQL Editor:** run `supabase/migrations/20260928000000_admin.sql`.
2. **Authentication → Users → Add user → Create new user:** your email + a strong password, with **"Auto Confirm User"** ticked.
3. **SQL Editor:** make that user an admin:
   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'you@example.com';
   ```
4. **Authentication → Sign In / Providers → Email:** turn **off** "Allow new users to sign up".

## Manual test steps (to share after implementation)

UI:

1. `npm run dev` and open http://localhost:3000/admin. You should be redirected to `/admin/login`. Sign in.
2. **Projects:** toggle Featured off on htmlhost.co, then load `/` in another tab; it disappears immediately. Toggle it back on.
3. Move Naya AI to the top with ↑; the homepage order changes.
4. **New project:** fill in the basics, upload a cover, add 2 features (one with an image), add a gallery image, pick 3 technologies, add a breakdown row, tick Published, then Save. Open `/projects/<slug>` and check every section.
5. Try a duplicate slug (`colorinvoice`); an inline error appears.
6. **Technologies:** add "Next.js" with an SVG icon, attach it to a project, and check the icon appears on the detail page. Try deleting it while it's attached (blocked), then detach and delete it.
7. Delete the test project; it disappears from `/projects`.
8. Sign out; `/admin/projects` redirects to the login page again.

API (curl). First get an access token from Supabase:

```bash
SUPABASE_URL="https://<project-ref>.supabase.co"
KEY="<publishable-key>"
TOKEN=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"<password>"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token')
```

```bash
# 401 without auth
curl -s -X POST http://localhost:3000/api/admin/projects -H "Content-Type: application/json" -d '{}'

# List projects (drafts included)
curl -s http://localhost:3000/api/admin/projects -H "Authorization: Bearer $TOKEN"

# Create a draft project
curl -s -X POST http://localhost:3000/api/admin/projects \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test Project","slug":"test-project","tagline":"A test.","summary":"Testing the admin API.","project_type":"Software","year":2026,"status":"in_development","is_published":false,"is_featured":false,"features":[],"gallery":[],"tech_breakdown":[],"technology_ids":[]}'

# Update it (use the id returned above), publishing it
curl -s -X POST http://localhost:3000/api/admin/projects/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Test Project","slug":"test-project","tagline":"Updated.","summary":"Testing the admin API.","project_type":"Software","year":2026,"status":"active","is_published":true,"is_featured":false,"features":[{"title":"Fast","description":"Very fast."}],"gallery":[],"tech_breakdown":[],"technology_ids":[]}'

# Toggle featured
curl -s -X POST http://localhost:3000/api/admin/projects/<id>/toggle \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"field":"is_featured","value":true}'

# Upload an image
curl -s -X POST http://localhost:3000/api/admin/uploads \
  -H "Authorization: Bearer $TOKEN" \
  -F "bucket=project-images" -F "folder=test-project" -F "file=@public/img/hero-bg.png"

# Delete it
curl -s -X POST http://localhost:3000/api/admin/projects/<id>/delete -H "Authorization: Bearer $TOKEN"

# CSRF check: cookie-style request from a foreign origin -> 403
curl -s -X POST http://localhost:3000/api/admin/projects/reorder \
  -H "Origin: https://evil.example" -H "Cookie: <copy sb-... cookie from the browser>" \
  -H "Content-Type: application/json" -d '{"ids":[]}'
```
