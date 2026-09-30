# Phase 4: About, Gallery and Start A Project redesign (all content CRUD in the dashboard)

## Goal

Rebuild three public pages to match the attached designs. Make every piece of their content editable in the admin dashboard (Supabase is the source of truth), and make them responsive at all screen sizes.

1. **About Me (`/about`)**, design `10.png`:
   - A hero with the text on the left and two tilted photos on the right, with 3D motion.
   - A **fixed "code on a computer" background** that the page content scrolls over. It shows through a full-width "window" band and behind the sections.
   - A "Let's get closer… / My Early Life" section with an accordion on the right.
   - A "The Journey / Work Life" section with an illustration on the left.
   - A "Ready to create something huge? Let's Work →" CTA.
2. **Gallery (`/gallery`)**, design `7.png`:
   - A hero with the text on the left: a badge, "Welcome to / My Gallery.", a quote-mark icon, the quote and a signature.
   - A photo on the right with a **torn / brush-stroke edge**.
   - A 3-column masonry grid of rounded photos, then the same CTA.
3. **Start A Project (`/start-a-project`)**, designs `9.png` and `8.png`:
   - A one-question-per-screen wizard with a progress bar and Back / Continue.
   - Seven steps: name → location → project type → business/product name → completion date → budget → project details.
   - Then an **"All done! 🎉 How would you like to send this?"** screen with three choices: **Send via WhatsApp**, **Send via Email** and **Call or text me instead**.
   - Every submission is also saved to the database and shows up in a new **Inquiries** inbox in the dashboard.

All the text, images and option lists on these pages come from Supabase and are managed from new dashboard screens.

## Skills read

- `AGENTS.md`:
  - Supabase is the source of truth; use Zod and Tailwind.
  - `POST` for mutations, `GET` for reads.
  - Share curl test steps; run typecheck, lint and build; commit at the end.
- Next 16 docs:
  - `02-guides/backend-for-frontend.md`: Route Handlers are public endpoints; validate input and rate-limit public endpoints.
  - Patterns already applied in Phases 2 and 3: `proxy.ts`, `revalidateTag(tag, { expire: 0 })` + `revalidatePath`, `params` / `searchParams` as Promises, and the `unstable_retry` error boundary.
- No project skill directory exists.

## Existing code inspected

- **Current pages:**
  - `app/(site)/about/page.tsx`: static content from `utils/content/about.ts` (intro, highlights, services), followed by `LogoTicker`, `Experience`, `Testimonials` and `CallToAction`.
  - `app/(site)/gallery/page.tsx` and `components/gallery/GalleryGrid.tsx`: static `utils/content/gallery.ts`, filter chips, masonry and a `<dialog>` lightbox.
  - `app/(site)/start-a-project/page.tsx`: a `ComingSoon` placeholder.
- **Phase 3 admin pattern, which I'll reuse:**
  - `lib/admin/content-routes.ts`: generic collection / item / delete / toggle / reorder handlers driven by a config.
  - `components/admin/ContentList.tsx`, `SaveBar`, `Field`, `ImageUpload`, `ChipsInput`, `Toast`, `form-hooks.ts`.
  - The `admin_reorder_rows(p_table, ids)` RPC with a table allowlist.
  - The `site-images` bucket (2 MB; png/jpg/webp/avif).
  - `lib/supabase/server.ts` public client with cache tags, and `lib/admin/revalidate.ts`.
- **Other:**
  - `AdminShell.tsx` nav: Projects, Technologies, Testimonials, Experience.
  - `components/layout/Footer.tsx` links to `/about#services`. That anchor goes away, so the links will point to `/about`.
  - `assets/images/hero-image.png`: 2228×2114, transparent cut-out portrait. It's the only photo in `assets/`.
  - `.env.local` no longer has `ADMIN_TEST_*` (good). That means I can't upload images to Storage myself (see decision 3).

## Decisions / assumptions (please review)

1. **Branding stays "ROGERS".** The designs say "YUYU" and include Yuyu's personal biography. **I won't copy someone else's bio.** The seed uses short Rogers-flavoured placeholder text in the same structure (paragraph counts and lengths similar to the design), and you replace it from the dashboard. The footer stays as it is today; the design's different footer isn't in scope.
2. **The About page replaces the current About content.** The highlights, services, logo ticker, experience and testimonials blocks are removed from `/about`; the home page still has experience and testimonials. `utils/content/about.ts` and `utils/content/gallery.ts` are deleted.
3. **Images:**
   - Every image slot is uploadable in the dashboard: the About hero photos 1 and 2, the About background, the Work Life illustration, the Gallery hero and the Gallery photos.
   - Until something is uploaded, the **local `hero-image.png` is the fallback** for every photo slot, as you asked: "use the 1 image in my assets folder".
   - The About **background fallback** is a built-in "code on a screen" layer: real monospace code lines rendered in HTML/CSS, perspective-tilted, blurred and dimmed. It looks like the design without needing a photo. Once you upload a background photo, it replaces this layer.
   - When the gallery has no photos in the database, the grid shows the local portrait as a single item, so the page is never empty.
4. **About background behaviour ("main bg, everything else scrolls over it"):**
   - A `position: fixed` full-viewport layer sits behind the page. I'm not using `background-attachment: fixed`, because iOS Safari ignores it.
   - The hero, Early Life and Journey sections have a solid dark background, and a transparent full-width **window band** (about 40vh on phones, 60vh on desktop) between the hero and Early Life reveals the background, exactly like the design.
   - The layer only covers the About page (it's scoped to that route), and is marked `aria-hidden`.
5. **The "3D photos that move on hover and drag back automatically":**
   - Each of the two stacked photos **tilts in 3D towards the cursor** (perspective + rotateX/rotateY with a spring, plus a slight lift and glare highlight).
   - Each photo can also be **dragged**, and it **springs back to its spot** when released (framer-motion `drag` + `dragSnapToOrigin`, already a dependency).
   - On touch devices, tilt is off and dragging still works.
   - With `prefers-reduced-motion`, tilt and drag are disabled and the photos just sit at their resting angles (−6° and +5°, as in the design).
6. **Accordion (Born / Education / Career / Family):**
   - The rows are a CRUD list: icon, title and body, with reorder and publish.
   - One row is open at a time, and the first is open by default. The open row has the gradient pill (`#DE0EFF → #751CFF`); closed rows are muted purple, as in the design.
   - Icons come from a fixed allowlist of about 12 Lucide icons (calendar, graduation cap, briefcase, users, heart, map pin, star, book, code, camera, trophy, home) chosen in a select. Nobody can type arbitrary component names.
   - The body is plain text. `**bold**` is supported for emphasis, as in the design's "**Merciful of God Maternity Home**". It's rendered as `<strong>` text nodes, never as raw HTML.
7. **Paragraph fields** (About intro, Early Life, Work Life, Gallery quote) are one textarea each; a blank line starts a new paragraph.
8. **Gallery:**
   - There are no filter chips (the design has none).
   - The masonry grid is **1 column below 560px, 2 columns from 560px, and 3 columns from 1200px**, keeping each photo's natural aspect ratio (stored as width/height at upload time).
   - I'll **keep the lightbox** (click to view large, arrows, Escape), since it doesn't change the look.
   - Each photo has alt text (required), an optional caption shown in the lightbox, reorder and publish.
   - The torn-edge hero is an **inline SVG mask** with a rough brush outline applied to the photo, with a CSS `mask` fallback.
9. **Photo uploads:** phone photos are often 3–10 MB, so the uploader **resizes and converts in the browser** before uploading, to a maximum of 2400px on the long edge and WebP at quality 0.85. The file then fits the `site-images` 2 MB limit. The server still checks magic bytes and size. The uploader also sends back the pixel width and height, so the grid can reserve space and avoid layout shift. The gallery admin also allows **uploading several photos at once**.
10. **Start A Project wizard:**

    | # | Step | Input | Rules |
    |---|---|---|---|
    | 1 | "Hey there 👋 / What's your name? / Your first name would do just fine." | text, underline style | required, 2–60 chars |
    | 2 | "Where are you based?" | up to **4 country cards** (managed in the dashboard) + **Other** → reveals a text input | required; Other needs 2–60 chars |
    | 3 | "What type of project?" | option cards from the dashboard (seed: Website, Web App, Mobile App, UI/UX Design, Branding, Other) | required |
    | 4 | "What's the name of your business or product?" | text | required, ≤ 80 |
    | 5 | "When do you need it done?" | date picker (min = tomorrow) + optional time, plus an **"I'm flexible"** option | a date is required unless "flexible" |
    | 6 | "What's your budget?" | option cards from the dashboard (seed: "< $1,000", "$1,000 – $3,000", "$3,000 – $7,000", "$7,000 – $15,000", "$15,000+") | required |
    | 7 | "Tell me about the project" | textarea with a counter | required, 20–2000 |

    - The eyebrow, title and subtitle of each step are editable in the dashboard.
    - **Enter** moves on (except in the textarea; there it's Ctrl/⌘+Enter).
    - Option cards support arrow keys (radio-group semantics), and focus goes to the step's input on each step.
    - The progress bar goes from 1/8 to 8/8, with the gradient fill animating.
    - Answers are kept in `sessionStorage`, so a refresh doesn't lose them; this is cleared after sending.
    - **Continue on step 7** leads to the "All done!" screen (step 8), shown in `8.png`.
11. **The three send options.** In every case the request is **saved first** (`POST /api/project-requests`) and stored with its channel:
    - **WhatsApp:** opens `https://wa.me/<number>?text=<formatted summary>` in a new tab.
    - **Email:** opens `mailto:<email>?subject=New project: <business>&body=<formatted summary>`.
    - **Call or text me instead:** reveals a phone number field for the visitor ("Provide your details and I'll reach out to you"). It's validated with a light international pattern (7–20 characters: digits, spaces, `+ - ( )`). Submitting saves the request with that number, then shows a thank-you screen. It also offers "or text me now", using an `sms:<your number>?body=…` link.
    - If saving fails (for example, offline), WhatsApp and Email still open, so the visitor never loses their message, and a small note is shown.
    - The WhatsApp number, email and phone are set in the dashboard. Until they're set, those buttons are hidden, and "Call or text" always works because it saves to the inbox.
    - After success, a thank-you state appears with "Back to home" and "Start another".
12. **Inquiries inbox (new dashboard screen):**
    - A list with newest first, a status filter (New / Contacted / Won / Lost / Archived) and a "New" count badge in the sidebar.
    - A detail view with all the answers, the channel and the visitor's phone number (click-to-call / WhatsApp links), a status select and internal notes. Delete asks for confirmation.
    - No email notifications in this phase. That would need an email provider and API key, so it can be a later add-on.
13. **Spam and abuse protection for the public endpoint:**
    - A **honeypot** field. If it's filled in, the server returns a fake success and stores nothing.
    - A minimum fill time of 3s.
    - Zod caps on every field.
    - **Rate limiting in the database:** at most 5 submissions per IP per hour and 50 site-wide per hour. The IP is stored only as a **SHA-256 hash** with a server-side salt, never raw.
14. **New dashboard sections** (sidebar):
    - **About page:** one editor for the page texts and images, plus the accordion list (reorderable).
    - **Gallery:** one editor for the hero text and image, plus the photo grid manager with multi-upload, alt text, reorder, publish and delete.
    - **Project form:** contact channels, up to 4 countries, project types, budgets and the step texts.
    - **Inquiries:** the inbox.

    Everything follows the Phase 3 UI (a drawer on phones, an icon rail at 768–1199px, a full sidebar at 1200px and up, and a sticky SaveBar).
15. **Caching:** new tags `about`, `gallery` and `project-form`. Admin saves call `revalidateTag(tag, { expire: 0 })` + `revalidatePath` for the affected page. The three public pages stay statically generated, and the latest data appears on the next load after a save.

## Visual interpretation (pixel expectations)

Shared across all three pages:

- **Page background:** `#0B0614`, with the existing tokens (`bg-card`, `text-muted`, `accent-1` `#DE0EFF`, `accent-2` `#751CFF`).
- **Container:** the same as the site today, `px-5` with the `sm`/`md`/`lg` max widths.
- **Badge:** the existing gradient-border pill (`rounded-[10px_30px_30px_10px]`), about 40px tall, `text-sm`, with an emoji or icon after the label.
- **Heading pair:** the first line is white and the second is gradient text. Size `text-3xl md:text-4xl lg:text-[2.5rem]`, bold, tight leading.
- **Body text:** `text-[15px] md:text-base`, `leading-[1.8]`, `text-muted`, with a max width of about 34rem.
- **CTA section** (both About and Gallery):
  - Centred, `py-24 md:py-32`, no card.
  - "Ready to create something huge?" in white, `text-2xl md:text-4xl` bold.
  - "Let's Work →" below it in gradient text `text-3xl md:text-5xl`, linking to `/start-a-project`; the arrow slides 4px on hover.
  - This is a new `sections/LetsWorkCTA.tsx`; the old `CallToAction` card stays for the home page.

**About (`10.png`):**

- **Hero:** `pt-10 pb-16 md:pb-24`, with a soft purple radial glow behind the photos.
  - On desktop the grid is 7/5: text left, photos right. Below `lg` it's one column, photos under the text.
  - Photos: photo A is about 280×240 at −6°, top right. Photo B is about 240×220 at +5°, overlapping A's lower left by about 30%. Both are `rounded-2xl` with a thick shadow and a 1px white/10 border.
  - On phones the photos stay stacked side by side in a smaller size (A 200px, B 170px wide).
- **Window band:** full width with no container, and the fixed code background visible. On desktop the background is darkened with a `bg-black/35` overlay and a top/bottom fade into the page colour.
- **Early Life:** a 2-column layout on `lg`, with text left (7) and accordion right (5); stacked below `lg`.
  - "Let's get closer …" in gradient text, `text-2xl md:text-3xl`, then "My Early Life" in white, `text-lg` bold.
  - Accordion pills: `rounded-full` headers about 44px tall, a 14px icon, `text-sm` semibold, and a chevron on the right that rotates on open.
  - The open body is `text-sm text-muted` with `px-4 py-3`, and the height animates via grid-rows.
- **Work Life:** a 2-column layout on `lg`, with the illustration left (about 320px, `object-contain`) and text right. On phones the illustration is smaller (220px) and sits above the text.

**Gallery (`7.png`):**

- **Hero:** a 2-column layout on `lg` (text 6 / image 6), stacked below `lg` with the image under the text.
  - Quote mark: a 48px gradient "❝"-style glyph (Lucide `LuQuote`, filled with the gradient).
  - Signature: "— Rogers" in white `text-sm` bold.
  - The hero image is about 460px wide on desktop, full width on phones, with the brush-edge mask.
- **Grid:** `gap-3 md:gap-4`, cards `rounded-xl`, subtle `hover:scale-[1.02]` + brightness, with the aspect ratio preserved and `next/image` `sizes` set per column.

**Start A Project (`9.png` / `8.png`):**

- Full-height page: `min-h-[calc(100dvh-72px)]`, with the content vertically centred and a max width of about 36rem (`max-w-xl`).
- **Progress bar:** 3px high, with a white/8 track and the gradient fill `rounded-full`. It sits above the eyebrow with `mb-14`.
- Eyebrow: `text-sm text-muted` with an emoji. Title: `text-3xl md:text-4xl` bold white. Subtitle: `text-sm text-muted`.
- **Text input:** underline only (`border-b border-white/15`, focus `border-accent-1`), `text-lg`, no box.
- **Buttons:**
  - Back: an outline pill with `border-white/12`, a chevron-left icon and `text-sm`.
  - Continue: a gradient pill `px-7 py-3.5` with a chevron-right icon; it's disabled until the step is valid.
  - Back is hidden on step 1.
- **Option cards** (country, type, budget): a grid of 2 columns on phones and 2–3 on desktop, `rounded-xl border-white/8 bg-white/3 px-4 py-4`. Selected cards get a gradient border and a check icon.
- **Send screen:** 2-column cards (1 column below 560px). Each card is `rounded-2xl border-white/8 bg-white/2 p-6`, with the icon centred (24px), a bold title and a muted `text-xs` subtitle. Hover gives an `accent-1` border and a slight lift. The third card sits in the grid on its own row, left-aligned, as in the design.
- The enter and exit of each step slide and fade (framer-motion `AnimatePresence`). This respects reduced motion.

**Responsiveness:** check at 320, 375, 768, 1024, 1440 and 1920px. There must be no horizontal scroll at any width, and nothing overlapping or clipped. Touch targets are at least 44px on phones.

## Database: `supabase/migrations/20260930000000_about_gallery_project_form.sql`

```sql
-- Singleton page rows: exactly one row each (id = 1).
create table public.about_page (
  id                    smallint primary key default 1 check (id = 1),
  badge                 text not null default 'About Me 😍' check (char_length(badge) <= 40),
  title                 text not null check (char_length(title) between 1 and 80),
  highlight             text not null check (char_length(highlight) between 1 and 80),
  intro                 text not null check (char_length(intro) <= 4000),
  photo_primary_path    text,
  photo_secondary_path  text,
  background_path       text,
  early_eyebrow         text not null check (char_length(early_eyebrow) <= 60),
  early_title           text not null check (char_length(early_title) <= 60),
  early_body            text not null check (char_length(early_body) <= 6000),
  journey_eyebrow       text not null check (char_length(journey_eyebrow) <= 60),
  journey_title         text not null check (char_length(journey_title) <= 60),
  journey_body          text not null check (char_length(journey_body) <= 6000),
  journey_image_path    text,
  updated_at            timestamptz not null default now()
);

create table public.about_facts (           -- accordion rows
  id uuid primary key default gen_random_uuid(),
  icon text not null check (icon in ('calendar','graduation','briefcase','users','heart','map-pin','star','book','code','camera','trophy','home')),
  title text not null check (char_length(title) between 1 and 60),
  body  text not null check (char_length(body) between 1 and 2000),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gallery_page (
  id smallint primary key default 1 check (id = 1),
  badge text not null default 'Gallery 🖼️' check (char_length(badge) <= 40),
  title text not null check (char_length(title) between 1 and 80),
  highlight text not null check (char_length(highlight) between 1 and 80),
  quote text not null check (char_length(quote) <= 2000),
  signature text check (char_length(signature) <= 60),
  hero_path text,
  updated_at timestamptz not null default now()
);

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  image_path text not null,
  width integer not null check (width between 1 and 10000),
  height integer not null check (height between 1 and 10000),
  alt text not null check (char_length(alt) between 1 and 200),
  caption text check (char_length(caption) <= 200),
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_form_settings (
  id smallint primary key default 1 check (id = 1),
  whatsapp_number text check (whatsapp_number ~ '^[0-9]{7,15}$'),   -- digits only, international, no +
  contact_email   text check (contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(contact_email) <= 254),
  contact_phone   text check (contact_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  countries      text[] not null default '{}' check (cardinality(countries) <= 4),
  project_types  text[] not null default '{}' check (cardinality(project_types) between 0 and 12),
  budgets        text[] not null default '{}' check (cardinality(budgets) between 0 and 12),
  steps jsonb not null,            -- { name:{eyebrow,title,subtitle}, location:{…}, … , send:{…} }, Zod-validated in the API
  updated_at timestamptz not null default now()
);

create table public.project_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  location text not null check (char_length(location) between 2 and 60),
  project_type text not null check (char_length(project_type) between 1 and 60),
  business_name text not null check (char_length(business_name) between 1 and 80),
  deadline_date date,
  deadline_time time,
  is_flexible boolean not null default false,
  budget text not null check (char_length(budget) between 1 and 60),
  details text not null check (char_length(details) between 20 and 2000),
  channel text not null check (channel in ('whatsapp','email','callback')),
  visitor_phone text check (visitor_phone ~ '^\+?[0-9 ()-]{7,20}$'),
  status text not null default 'new' check (status in ('new','contacted','won','lost','archived')),
  notes text check (char_length(notes) <= 4000),
  ip_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (is_flexible or deadline_date is not null),
  check (channel <> 'callback' or visitor_phone is not null)
);
create index project_requests_created_idx on public.project_requests (created_at desc);
create index project_requests_ip_idx on public.project_requests (ip_hash, created_at desc);
```

Plus:

- `updated_at` triggers on all tables, and `(is_published, sort_order)` indexes on `about_facts` and `gallery_photos`.
- **RLS:**
  - Public `select` on the singletons, published facts and published photos.
  - `project_form_settings`: public `select`, since it only has the contact channels and option lists shown on the page anyway.
  - `project_requests`: **no public select, update or delete.** Admin-only select, update and delete via `is_admin()`.
  - Admin writes on everything via `is_admin()`. The singletons allow admin `update` only, with no insert or delete, so there's always exactly one row.
- **`public.submit_project_request(payload jsonb, p_ip_hash text)`:**
  - `security definer`, `set search_path = ''`, execute granted to `anon, authenticated`.
  - It raises `rate_limited` if the same `ip_hash` has 5 or more rows in the last hour, or there are 50 or more rows site-wide in the last hour.
  - It inserts only whitelisted keys, always with `status = 'new'`, and returns only the `id`.
  - Anonymous visitors have **no direct insert** on the table.
- `admin_reorder_rows` allowlist extended to `('testimonials','experiences','about_facts','gallery_photos')`.
- Seed (`supabase/seed_about_gallery_project_form.sql`, idempotent):
  - the three singleton rows, with Rogers placeholder text and the step texts from the table above;
  - 4 facts (Born, Education, Career, Family);
  - countries: Nigeria, United Kingdom, United States, Canada;
  - the project types and budgets above.

## Files likely to change

### New

| File | Purpose |
|---|---|
| `supabase/migrations/20260930000000_about_gallery_project_form.sql`, `supabase/seed_about_gallery_project_form.sql` | Schema, RLS, RPCs, seed. |
| `lib/pages/schema.ts` | Client-safe Zod read schemas and types (`AboutPage`, `AboutFact`, `GalleryPage`, `GalleryPhoto`, `ProjectFormSettings`), `splitParagraphs`, and `renderEmphasis` (`**bold**` → segments). |
| `lib/pages/queries.ts`, `lib/pages/cache.ts` | `server-only` cached, tagged public reads with explicit columns and Zod parsing. |
| `lib/project-request/schema.ts` | The shared wizard / submit Zod schema (client + server) and `formatSummary(request)` for WhatsApp, email and SMS text. |
| `lib/project-request/rate-limit.ts` | `server-only`: `hashIp(request)` (`x-forwarded-for` first hop → SHA-256 with `RATE_LIMIT_SALT`). |
| `app/api/project-requests/route.ts` | Public `POST`: honeypot, minimum time, Zod, RPC, and 429 on rate limit. |
| `app/api/admin/about/route.ts` | `GET` / `POST` (update the singleton). |
| `app/api/admin/about-facts/…` | Collection / item / delete / toggle / reorder via `content-routes` configs. |
| `app/api/admin/gallery/route.ts` | `GET` / `POST` (update the singleton). |
| `app/api/admin/gallery-photos/…` | The same five routes, plus `POST /api/admin/gallery-photos/bulk` (create many after a multi-upload). |
| `app/api/admin/project-form/route.ts` | `GET` / `POST` (update settings). |
| `app/api/admin/project-requests/route.ts`, `[id]/route.ts`, `[id]/delete/route.ts` | `GET` list (`?status=`), `GET` one, `POST` update (status/notes), `POST` delete. |
| `app/admin/(dashboard)/about/page.tsx`, `about/facts/new`, `about/facts/[id]` | About editor + fact editor. |
| `app/admin/(dashboard)/gallery/page.tsx`, `gallery/photos/[id]` | Gallery hero editor + photo manager + photo editor. |
| `app/admin/(dashboard)/project-form/page.tsx` | Settings editor. |
| `app/admin/(dashboard)/inquiries/page.tsx`, `inquiries/[id]/page.tsx` | Inbox + detail. |
| `components/admin/AboutPageForm.tsx`, `AboutFactForm.tsx`, `GalleryPageForm.tsx`, `GalleryPhotoManager.tsx`, `GalleryPhotoForm.tsx`, `ProjectFormSettingsForm.tsx`, `InquiriesList.tsx`, `InquiryDetail.tsx` | Admin UIs. |
| `components/admin/image-resize.ts` | Browser resize to WebP (max 2400px), returning `{ file, width, height }`. |
| `components/about/TiltPhotos.tsx`, `components/about/CodeBackdrop.tsx`, `components/about/FactsAccordion.tsx`, `components/about/fact-icons.ts` | About UI pieces. |
| `components/gallery/TornImage.tsx`, `components/gallery/GalleryMasonry.tsx` | Gallery UI (the lightbox logic moves here from `GalleryGrid`). |
| `components/start-project/ProjectWizard.tsx`, `WizardStep.tsx`, `OptionCards.tsx`, `SendOptions.tsx` | The wizard. |
| `sections/LetsWorkCTA.tsx` | The shared "Ready to create something huge?" CTA. |

### Modified

- `app/(site)/about/page.tsx`, `app/(site)/gallery/page.tsx`, `app/(site)/start-a-project/page.tsx`: rebuilt as async Server Components.
- `components/admin/AdminShell.tsx`: 4 new nav items (About page, Gallery, Project form, Inquiries with a New-count badge).
- `components/admin/ImageUpload.tsx`: optional `resize` prop + returns dimensions. `app/api/admin/uploads/route.ts` stays unchanged, apart from also accepting the `gallery`, `about` and `pages` folders, which already match the folder regex.
- `lib/admin/content-routes.ts`: configs for `about_facts` and `gallery_photos` (image cleanup on delete). The image column type is widened.
- `lib/admin/content-schemas.ts`: new input schemas.
- `lib/admin/revalidate.ts`: `revalidateAbout`, `revalidateGallery`, `revalidateProjectForm`.
- `lib/env.ts` + `.env.example`: `RATE_LIMIT_SALT` (server-only, required in production, at least 32 characters).
- `components/layout/Footer.tsx`: `/about#services` becomes `/about`.
- **Deleted:** `utils/content/about.ts`, `utils/content/gallery.ts`, `components/gallery/GalleryGrid.tsx`.

## Implementation requirements

- **Server Components** fetch the data; client components only for:
  - tilt/drag photos, the accordion, the masonry lightbox and the wizard;
  - the admin forms.
- **Images:**
  - Every image uses `next/image` with correct `sizes`.
  - The About hero photo and the Gallery hero are `priority`; the grid is lazy.
  - Gallery photos pass their stored `width` and `height`, so there's no layout shift.
- **The fixed background:**
  - It's rendered once in the About page as `fixed inset-0 -z-10`.
  - The page wrapper sets `isolate` so it can't bleed onto other routes.
  - The code fallback is static HTML (no JavaScript).
- **Tilt:**
  - `useMotionValue` + `useSpring`, with the rotation capped at ±12°.
  - It only runs for `(hover: hover) and (pointer: fine)`.
  - It resets on pointer leave.
  - Drag uses `dragSnapToOrigin` with `dragElastic` of 0.2.
- **Wizard:**
  - One `useReducer`, with the step config built from the settings.
  - Validation uses the shared Zod schema, per step.
  - There's no route change between steps. The step is announced via an `aria-live="polite"` region ("Step 3 of 8").
  - The honeypot input is visually hidden and `tabIndex={-1}`, with `autoComplete="off"`.
- **Summary text** (WhatsApp, email and SMS):
  - The same `formatSummary`: plain text, line-separated labels, with the details trimmed to fit.
  - The final `wa.me` / `mailto` URL is capped at about 1,800 characters, and the details get an ellipsis if it's longer.
- **Admin:**
  - Reuse `Card`, `Field`, `SaveBar`, `ContentList`, `ChipsInput` (countries capped at 4; types and budgets at 12), `ImageUpload`, `Toast`, `useUnsavedGuard` and `useScrollToFirstError`.
  - The step-text editor is a compact 8-row table of eyebrow / title / subtitle inputs.
- **No new dependencies.**

## Security requirements

- **Public `POST /api/project-requests`:**
  - It accepts `application/json` only, with a maximum body of 16 KB.
  - Zod strips unknown keys; the enum `channel` and the phone regex are enforced.
  - The honeypot and a minimum time since the form started (`now - started_at >= 3s`; a missing or future timestamp is treated as a bot) are checked.
  - It calls `submit_project_request` with the anon client. The IP is hashed with `RATE_LIMIT_SALT` and never stored raw.
  - It returns `{ id }` only; 429 carries a friendly message; other errors return a generic message and are logged server-side only.
- **The anon role can't read, update or delete `project_requests`.** Only the `security definer` RPC can insert, and it hard-codes `status` and ignores extra keys.
- **Admin routes:**
  - All use `requireAdminApi` (bearer, or cookie plus the Origin check).
  - UUIDs are validated; singleton updates never accept an `id`.
  - Image paths must start with the expected folder prefix (`about/`, `gallery/`, `pages/`), so the admin can't point a page at an arbitrary storage object.
- **User-provided text:**
  - It's rendered only as React text. `**bold**` becomes `<strong>` elements built from split segments, with no `dangerouslySetInnerHTML` anywhere.
  - In the admin inquiry view, visitor text is plain text; `tel:` and `wa.me` links are built from the validated phone value only.
- **Outgoing links:**
  - `wa.me` / `mailto:` / `sms:` URLs use `encodeURIComponent` on every part.
  - The WhatsApp number is digits only (validated at the DB and in Zod).
  - External links use `target="_blank" rel="noopener noreferrer"`.
- **Uploads:** the existing magic-byte checks, server-generated names, the 2 MB cap and no SVG in `site-images` all stay.
- **Secrets:** `RATE_LIMIT_SALT` is server-only and never has the `NEXT_PUBLIC_` prefix. Nothing sensitive goes into the client bundle.

## Acceptance criteria

- **About page:**
  - `/about` matches `10.png` in structure and spacing, with Rogers branding and the seeded text.
  - The fixed code background stays still while the content scrolls over it, and shows through the band (including on iOS Safari).
  - Hovering a photo tilts it in 3D. Dragging it and letting go snaps it back. On touch, drag still works.
  - The accordion opens one row at a time, animated, and is keyboard-accessible (Enter/Space, `aria-expanded`).
- **Gallery page:** `/gallery` matches `7.png`: the torn-edge hero, the quote block and the masonry grid (3 / 2 / 1 columns), plus the lightbox. With no photos uploaded, it shows the local portrait.
- **Start A Project:**
  - `/start-a-project` matches `9.png` and `8.png`.
  - All 7 steps validate, Back keeps the answers, and a refresh keeps the answers.
  - "Other" country requires text. The date can't be in the past unless "I'm flexible" is chosen.
  - WhatsApp and Email open pre-filled and save the request.
  - Call/text requires the visitor's phone number, saves the request and shows the thank-you screen.
  - The 6th submission from one IP within an hour gets 429 with a friendly message.
- **Dashboard:**
  - Every text, image and list on the three pages is editable, and the change appears on the next page load.
  - Facts and gallery photos can be created, edited, deleted, published or unpublished, and reordered.
  - Multi-upload of 3 photos creates 3 photos.
  - Inquiries list with status filter; the detail view lets you change status and notes, and delete.
- **Validation:**
  - Countries with 5 entries → 400.
  - WhatsApp number with letters → 400.
  - Project request with `channel: "callback"` and no phone → 400.
  - Details under 20 characters → 400.
  - Honeypot filled → 200 and nothing stored.
- **Auth:** signed out, every new admin route returns 401 and the pages redirect to login. Anon `select` on `project_requests` via the Supabase REST API returns no rows.
- **Responsive:** no horizontal scroll or overlap at 320 / 375 / 768 / 1024 / 1440 / 1920px on all three public pages and all new admin screens. Reduced motion is respected.
- **Checks:** `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

Plus a signed-out API check against `next start` with curl (the 401s, validation errors on the public endpoint and the honeypot). I won't run the headless screenshot pass unless you ask for it.

## What you'll need to do (one time)

1. **Supabase SQL Editor:** run `supabase/migrations/20260930000000_about_gallery_project_form.sql`, then `supabase/seed_about_gallery_project_form.sql`.
2. Add `RATE_LIMIT_SALT` to `.env.local` **and** to Vercel's environment variables. Use any random string of 32 or more characters, for example from `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
3. In the dashboard → **Project form**, set your WhatsApp number (digits only, e.g. `2348012345678`), email and phone.
4. Upload your photos in **About page** and **Gallery**, and replace the placeholder text.

## Manual test steps (to share after implementation)

UI:

1. `npm run dev` and open http://localhost:3000/about.
   - Scroll: the code background stays fixed while the content slides over it.
   - Hover the photos: they tilt. Drag one and release it: it springs back.
   - Open "Education" in the accordion: "Born" closes.
2. Open `/gallery`: the torn-edge hero and the masonry grid. Click a photo to open the lightbox; use the ← / → keys and Esc.
3. Open `/start-a-project`:
   - Fill in the name, then choose "Other" and type a country. Pick a type, enter a business name, pick a date (past dates are blocked), then a budget and the details (minimum 20 characters).
   - On the "All done!" screen, click **Send via WhatsApp**: WhatsApp opens pre-filled.
   - Repeat with **Call or text me instead**: enter a phone number, submit, and the thank-you screen appears.
4. Go to `/admin` → **Inquiries**: both requests are there. Open one, set the status to Contacted, add a note and save.
5. **About page** admin:
   - Change the title, upload the two photos and a background, and save. `/about` updates.
   - Add a fact "Hobbies" with the heart icon, move it to the top, then unpublish it.
6. **Gallery** admin: upload 3 photos at once, set alt text, and reorder. `/gallery` updates.
7. **Project form** admin:
   - Try adding a 5th country: it's blocked. Rename a budget and save; the wizard shows it.
   - Clear the WhatsApp number: the WhatsApp card disappears from the send screen.
8. **Responsive:** in DevTools device mode, check iPhone SE, Pixel 7, iPad Mini, 1024, 1440 and 1920. There should be no sideways scrolling.

API (curl):

```bash
# Public: submit a project request (callback channel)
curl -s -X POST http://localhost:3000/api/project-requests \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","location":"Nigeria","project_type":"Web App","business_name":"Acme","deadline_date":"2026-12-01","is_flexible":false,"budget":"$3,000 – $7,000","details":"We need a booking platform with payments.","channel":"callback","visitor_phone":"+234 801 234 5678","website":"","started_at":1700000000000}'

# Validation: callback without phone -> 400
curl -s -X POST http://localhost:3000/api/project-requests \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","location":"Nigeria","project_type":"Web App","business_name":"Acme","is_flexible":true,"budget":"$3,000 – $7,000","details":"We need a booking platform with payments.","channel":"callback","website":"","started_at":1700000000000}'

# Admin (signed out) -> 401
curl -s http://localhost:3000/api/admin/project-requests

# Admin with token ($TOKEN from the Phase 2 token command)
curl -s http://localhost:3000/api/admin/project-requests?status=new -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/admin/project-requests/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"contacted","notes":"Called on Monday."}'
curl -s -X POST http://localhost:3000/api/admin/project-form \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"countries":["Nigeria","Ghana","Kenya","UK","USA"]}'   # -> 400 (max 4)
```
