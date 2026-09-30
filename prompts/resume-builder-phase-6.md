# Phase 6: Resume Builder (dashboard-only, multi-resume, templates, PDF, OpenRouter AI)

## Goal

A private resume and CV builder inside the admin dashboard, used only by you. It lets you:

1. **Keep many resumes and CVs**, one per job or field. You can create, duplicate, rename, archive and delete them, and each has its own template, sections and target job.
2. **Edit section by section** in a layout based on your Resumify screenshot (`16.png`), using the portfolio's colours:
   - a section list you can drag to reorder, with a show/hide toggle for each section;
   - the form for the selected section;
   - a **live preview that is the actual PDF**.
3. **Pick from 4 templates** based on your attachments: `13.jpg` Timeline, `14.webp` Classic, `15.jpg` Sidebar, and `Resume.pdf` Professional. Accent colours and density are adjustable.
4. **Export a PDF in one click** with real, selectable text that applicant tracking systems (ATS) can read.
5. **Get AI help through OpenRouter** (`OPEN_ROUTER_API_KEY`):
   - write, improve, shorten or quantify a summary or bullet;
   - generate bullets for a role;
   - **Tailor to a job**: paste a job description and get suggested rewrites to accept one by one, plus missing keywords;
   - **Insights**: an ATS-style keyword match plus checks on content quality and completeness;
   - **Import an existing CV**: upload a PDF or paste text, and the AI fills in every section;
   - **Cover letters**: generate one per resume and job, edit it, and export it as a PDF in the same style;
   - **Ask Copilot**: ask free-form questions about the resume you're editing.
6. **Fit the dashboard.** The admin sidebar is regrouped into numbered sections (as in `16.png`), with Career / Resume tools as a group, and the editor page uses the full width.

Out of scope for this phase (they could come later):
- version history, job discovery or tracking, networking, peer review and interview prep;
- public sharing links (resumes are never public).

## Skills read

- `AGENTS.md`:
  - Supabase is the source of truth; use Zod and Tailwind.
  - `POST` for mutations, `GET` for reads.
  - Share curl steps; run typecheck, lint and build; commit.
- Next 16 docs:
  - Route Handlers (Node runtime for PDF import and AI).
  - `server-only` modules, env handling (a server-only key), and the `02-guides/data-security.md` guidance on keeping secrets out of client bundles.
- Library docs, at the versions to install:
  - `@react-pdf/renderer` 4.9: `Document`/`Page`/`View`/`Text`/`Image`, `Font.register`, `pdf().toBlob()`, and `fixed` views for sidebars that repeat on every page.
  - `@dnd-kit/core` 6 / `@dnd-kit/sortable` 10: sortable lists with keyboard support.
  - `unpdf` 1.8: extracting PDF text on the server.
  - The OpenRouter Chat Completions API (`https://openrouter.ai/api/v1/chat/completions`, OpenAI-compatible, with `response_format` JSON).

## Existing code inspected

- **Admin shell:** `components/admin/AdminShell.tsx` has a flat nav of 10 items (a drawer below md, an icon rail at md–lg, and a full sidebar at lg). The content column is `max-w-6xl`, so the editor needs a full-width mode.
- **Reused building blocks:**
  - `Field` (inputs, `Card`, `Switch`, button classes), `SaveBar`, `Toast`, `useSaveForm`, `form-hooks`, `ChipsInput` and `ImageUpload` (with browser resize);
  - `requireAdminApi` / `requireAdminPage` and `lib/admin/http.ts` (`ok`, `fail`, `parseJson`, `dbError`);
  - the RLS `is_admin()` pattern.
- **Env:** `OPEN_ROUTER_API_KEY` exists in `.env.local` and is server-only. It isn't in `.env.example` yet.
- **Your `Resume.pdf`:** 3 pages. It has a photo, name, headline, date of birth, address, email and phone, then Working Experience (role | dates, an italic "company • address" line, a "Terms of Reference (Key Responsibilities):" label, bullets), Educational Background (date — credential, field, italic institution) and References.

## Decisions / assumptions (please review)

1. **A resume is one validated JSON document** in `resumes.data`, rather than dozens of tables. That makes custom sections, reordering, duplicating and AI edits simple. Zod checks every save, and the size is capped at 300 KB.
   - **Contact:** full name, headline, email, phone, location, LinkedIn, website, optional **date of birth**, and an optional **photo**.
   - **Sections** are an ordered list of `{ id, type, title, visible, items }`, with these types:

     | Type | Fields per item |
     |---|---|
     | `summary` | text |
     | `experience` | role, company, location, start/end (month + year, or year only), current, optional *bullets label* (e.g. "Terms of Reference (Key Responsibilities):"), bullets |
     | `education` | credential (Certificate / Diploma / B.Sc…), field, institution, location, start/end/"Ongoing", notes |
     | `skills` | skill names, optionally grouped (e.g. "Tools: Jira, SQL") |
     | `projects` | name, role, URL, dates, bullets |
     | `certifications` | name, issuer, date, URL |
     | `involvement` | organisation, role, dates, bullets |
     | `awards` | title, issuer, date, description |
     | `languages` | language + level |
     | `coursework` | course, institution |
     | `references` | name, title, organisation, address, phone, email, or a single "Available on request" toggle |
     | `custom` | a title you choose, with items of heading, subheading, date and bullets |

   - Section titles can be renamed, e.g. "Working Experience" or "Educational Background" as in your PDF.
2. **The 4 templates** are drawn with `@react-pdf/renderer`, so the preview and the download are the same PDF:

   | Key | Based on | Layout |
   |---|---|---|
   | `timeline` | `13.jpg` | Big bold name + title rule. A left column holds Contact (with icons), Skills, Languages and References; a right column holds Profile, Work Experience and Education, on a **vertical timeline with round section icons**. Navy/charcoal on white. |
   | `classic` | `14.webp` | A centred name + title, a contact row with icons and a rule, then single-column sections with ruled headings and a 3-column skills list. Charcoal on white. |
   | `sidebar` | `15.jpg` | A **coloured left sidebar (maroon by default)** with a circular photo, Contact, Education and Skills. On the right, a two-line name and **angled ribbon headings** for About Me and Experience. The sidebar repeats on every page. |
   | `professional` | your `Resume.pdf` | A photo top-left, navy name, gold italic headline and bold "Label:" contact lines, then navy section headings over a gold rule. Roles show "Role \| dates" with gold dates, italic company lines, an italic bullets label and bullets. It's a multi-page layout. |

   - **Accent colours:** 6 presets per template (the originals plus navy, maroon, teal, forest, charcoal and purple). Which sections go in the sidebar is fixed per template.
   - **Density:** Compact / Normal / Relaxed changes font size and spacing, to help fit a page.
   - **Paper:** A4 or US Letter.
   - **Fonts:** open-licence TTF files (Montserrat, Open Sans and Carlito, a free Calibri-metric match for your PDF) stored in `public/fonts/resume/`.
3. **Photo:** uploaded to a new **private** storage bucket, `resume-assets`, with admin-only access. It's shown through short-lived signed URLs, because resumes hold personal details (date of birth, phone) and should never be publicly reachable. The photo is resized in the browser.
4. **Editor layout** (`16.png` layering, portfolio colours):
   - **Top bar:** breadcrumbs "Dashboard / Resumes / Editor", the resume title, the template picker, "Download PDF" and **Save** (a gradient pill; Ctrl/⌘+S also saves; there's an unsaved-changes guard).
   - **Left panel** (`bg-card`, about 280px wide): Back, the resume name and target role, and tabs for **Sections / Insights / Tailor**.
     - The **Sections** tab lists Ask Copilot, Contact, then the sections with drag handles and a visibility toggle, then "Add section", "Design" (template, colour, density, paper) and "Finish up & preview".
     - The active item has the gradient left bar used elsewhere in the dashboard.
   - **Centre:** the form for the selected section, e.g. a "Personal Information" heading with a two-column grid of fields as in `16.png`. Items are cards you can reorder and collapse.
   - **Right:** a live PDF preview, refreshed about 700ms after you stop typing.
   - **Responsive:**
     - at 1440px and up: all three panes;
     - at 1200–1439px: panel + form, with a "Preview" toggle that swaps the form for the preview;
     - below 1200px: the panel becomes a horizontal section picker above the form, and Preview opens full-screen.
   - Your phone (375px) gets a usable editor, not just a view.
5. **Resumes list** (`/admin/resumes`):
   - cards showing a thumbnail (the first page rendered small), title, target role, template and last edited date;
   - actions: open, duplicate ("Duplicate for another job"), rename, archive and delete;
   - "New resume" offers three starts: blank, copy an existing resume, or **import a CV**.
6. **AI via OpenRouter**, server-side only (`lib/ai/openrouter.ts`):
   - **Model:** defaults to **`anthropic/claude-haiku-4.5`** (fast and cheap). It can be changed in Resume settings, stored in the DB, and must be an `owner/model` ID.
   - **Every AI route** returns validated JSON: `response_format: { type: "json_object" }` + a Zod parse, with one automatic retry on invalid output. Output caps are 1,500 tokens for rewrites and 6,000 for imports.
   - **Actions:**
     - `rewrite`: improve, shorten, quantify, fix grammar or make it more formal, on a summary or bullet. It returns up to 3 options to pick from.
     - `bullets`: 4–6 bullets for a role, company and optional notes.
     - `summary`: written from the resume and the target role.
     - `tailor`: from the resume and a job description, it returns keywords (matched and missing) plus a suggested rewrite of the summary and specific bullets. Each change appears as a before/after card with Accept or Dismiss. "Duplicate & tailor" makes a copy first.
     - `import`: PDF text or pasted text becomes the full resume JSON. You check the result before it's saved.
     - `cover_letter`: from the resume, company, role, job description and tone, it writes 3–5 paragraphs.
     - `ask`: a free-form question with the resume as context. It answers in text, optionally with a suggested edit.
   - **Guardrails:**
     - The AI must not invent employers, dates, degrees or numbers. When it quantifies, it uses placeholders like "[X]%" for you to fill in.
     - Job descriptions and imported text are treated as untrusted data, clearly separated from the instructions.
     - Nothing is sent without you clicking.
7. **Insights:**
   - **Checks that run in the browser (free):**
     - missing contact fields or sections;
     - bullets without a number, or starting with weak verbs ("Responsible for", "Helped");
     - bullet length;
     - page count (from the rendered PDF);
     - duplicate words;
     - date gaps and date order.
   - **With a saved job description:** keyword coverage from the tailor keywords, computed locally, with a **match score from 0 to 100** and "add these keywords" chips.
8. **Cover letters** (`/admin/cover-letters` + a tab in the resume):
   - title, company, job title, recipient, date and body (plain paragraphs), plus a link to a resume;
   - the PDF uses the linked resume's template header, colours and fonts, followed by the letter.
9. **AI usage and limits:**
   - Every AI call is logged (action, model, input and output tokens, cost if OpenRouter reports it, time).
   - A **daily cap of 150 AI requests** (changeable in settings) protects your credits if something loops or a session is misused.
   - The panel shows "N generations left today", like the Resumify "Free plan" box.
10. **Dashboard navigation** is regrouped with numbered labels, as in `16.png`:
    - **01 / Content:** Projects, Technologies, Testimonials, Experience, Blog.
    - **02 / Pages:** About page, Gallery, Project form.
    - **03 / Career:** Resumes, Cover letters, Resume settings.
    - **04 / Inbox:** Inquiries.

    This applies to the full sidebar, the icon rail (group dividers) and the phone drawer. Resume editor routes use a **full-width content area**; other pages keep `max-w-6xl`.
11. **Starting data:** nothing is pre-filled from your PDF automatically. You use **Import CV** with `Resume.pdf` to create your first resume, which also tests the import. I won't put your date of birth, phone or address into seed files or the repo.

## Visual interpretation

- **Colours:**
  - page `bg-surface`; panels `bg-card` (`#131320`) with `border-white/6`, and inputs with `bg-white/4` (the existing `inputClass`);
  - primary actions use the gradient pill, and active states the pink/purple gradient bar or `accent-1`.
  - No orange from Resumify; only its **layering** is used: a darker sidebar, a lighter panel column, then the content surface.
- **Type and spacing:**
  - section headings `text-lg font-bold` with a `text-xs text-muted` subtitle;
  - field labels **uppercase `text-[11px] tracking-wider text-muted`**, as in `16.png`;
  - panel items are `min-h-10`, `text-sm`, with icons 16px wide;
  - numbered group labels use `text-[11px] tracking-[0.2em] uppercase text-dim`, with the number in `accent-1`.
- **Preview pane:** `bg-[#0b0712]`, the PDF page centred with a drop shadow, a zoom control (fit / 75% / 100%), the page count, and a "Download PDF" button.
- **PDF templates:** they match the reference images as closely as `@react-pdf` allows. The exact sizes (name about 26–30pt, headings 12–13pt, body 9.5–10.5pt by density) are tuned against each reference image during implementation.
- **Responsive:** check at 320, 375, 768, 1024, 1280, 1440 and 1920px. There's no horizontal scroll, and touch targets are at least 40px on phones.

## Database: `supabase/migrations/20261002000000_resume_builder.sql`

```sql
create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  target_role text check (char_length(target_role) <= 120),
  template text not null default 'professional' check (template in ('timeline', 'classic', 'sidebar', 'professional')),
  design jsonb not null default '{}'::jsonb,              -- { accent, density, paper }
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 300000),
  job_description text check (char_length(job_description) <= 20000),
  job_company text check (char_length(job_company) <= 120),
  tailor_keywords jsonb not null default '[]'::jsonb,      -- last Tailor/Insights keyword analysis
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cover_letters (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid references public.resumes(id) on delete set null,
  title text not null check (char_length(title) between 1 and 120),
  company text check (char_length(company) <= 120),
  job_title text check (char_length(job_title) <= 120),
  recipient text check (char_length(recipient) <= 200),
  letter_date date,
  body text not null default '' check (char_length(body) <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_settings (                     -- singleton
  id smallint primary key default 1 check (id = 1),
  ai_model text not null default 'anthropic/claude-haiku-4.5' check (ai_model ~ '^[a-z0-9._-]+/[a-z0-9._:-]+$'),
  daily_ai_limit integer not null default 150 check (daily_ai_limit between 1 and 2000),
  default_template text not null default 'professional',
  updated_at timestamptz not null default now()
);

create table public.ai_requests (
  id bigint generated always as identity primary key,
  action text not null,
  model text not null,
  prompt_tokens integer, completion_tokens integer, cost_usd numeric(10, 6),
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index ai_requests_created_idx on public.ai_requests (created_at desc);
```

Plus:

- `updated_at` triggers.
- **RLS on all four tables: admin only** (`is_admin()` for select, insert, update and delete). There's **no public policy at all**.
- The **private bucket `resume-assets`** (5 MB; png, jpeg, webp) with admin-only storage policies.
- An `insert ... on conflict do nothing` for the settings row.

## Files likely to change

### New

| Area | Files |
|---|---|
| **Schema** | `lib/resume/schema.ts`: the Zod resume document (contact, section types, items, limits), design options, template keys, empty/blank resume factories, `duplicateResume`, date helpers. Client-safe. |
| **Templates (PDF)** | `components/resume/pdf/ResumeDocument.tsx` (picks the template), `templates/Timeline.tsx`, `Classic.tsx`, `Sidebar.tsx`, `Professional.tsx`, `shared.tsx` (icons as SVG paths, headings, bullet lists, date formatting), `fonts.ts` (`Font.register` + hyphenation off), `CoverLetterDocument.tsx`. |
| **Fonts** | `public/fonts/resume/*.ttf` (Montserrat, Open Sans, Carlito; open licences, with the licence files included). |
| **Editor UI** | `components/resume/ResumeEditor.tsx` (state, save, keyboard shortcut), `EditorPanel.tsx` (tabs, sortable sections), `SectionForm.tsx` + a form per section type under `forms/`, `ContactForm.tsx`, `DesignForm.tsx`, `PdfPreview.tsx` (debounced `pdf().toBlob()` → `<iframe>` or canvas, page count, zoom), `ItemList.tsx` (sortable, collapsible item cards), `BulletsEditor.tsx` (with an AI ✨ button per bullet). |
| **AI UI** | `components/resume/ai/AiButton.tsx` (options popover), `TailorPanel.tsx`, `InsightsPanel.tsx`, `CopilotPanel.tsx`, `ImportDialog.tsx`, `UsageMeter.tsx`. |
| **Resume list / letters** | `components/resume/ResumeCard.tsx`, `NewResumeDialog.tsx`, `components/resume/CoverLetterEditor.tsx`. |
| **Server** | `lib/ai/openrouter.ts` (`server-only`: fetch, timeout 60s, JSON mode, retry, usage logging, daily limit), `lib/ai/prompts.ts` (system prompts per action), `lib/resume/queries.ts`, `lib/resume/insights.ts` (checks shared by client and server), `lib/resume/pdf-text.ts` (`unpdf`). |
| **API** | `app/api/admin/resumes/route.ts` (GET list, POST create), `[id]/route.ts` (GET, POST update), `[id]/duplicate/route.ts`, `[id]/archive/route.ts`, `[id]/delete/route.ts`, `resumes/photo-url/route.ts` (POST → signed URL), `app/api/admin/cover-letters/...` (same pattern), `app/api/admin/resume-settings/route.ts`, `app/api/admin/ai/[action]/route.ts` (POST; action ∈ rewrite, bullets, summary, tailor, import, cover-letter, ask), `app/api/admin/ai/usage/route.ts` (GET). |
| **Pages** | `app/admin/(dashboard)/resumes/page.tsx`, `resumes/[id]/page.tsx` (editor, full width), `cover-letters/page.tsx`, `cover-letters/[id]/page.tsx`, `resume-settings/page.tsx`. |
| **SQL** | `supabase/migrations/20261002000000_resume_builder.sql`. |

### Modified

- `components/admin/AdminShell.tsx`: grouped, numbered navigation, and full-width mode for `/admin/resumes/[id]` and `/admin/cover-letters/[id]`.
- `app/api/admin/uploads/route.ts`, `lib/admin/uploads.ts`, `lib/admin/schemas.ts`, `lib/storage.ts`, `components/admin/ImageUpload.tsx`: support the private `resume-assets` bucket. It returns a signed URL instead of a public one.
- `.env.example`: `OPEN_ROUTER_API_KEY=` (server-only), with a comment.
- `package.json` / `pnpm-lock.yaml`: `@react-pdf/renderer`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` and `unpdf`, installed with **pnpm**.

## Security requirements

- **Admin only, everywhere:**
  - every page uses `requireAdminPage`, and every route uses `requireAdminApi` (bearer, or cookie plus the Origin check on POST);
  - RLS has no anonymous policies, and the proxy already matches `/admin` and `/api/admin`;
  - resume data never goes through the public Supabase client or the public cache.
- **The OpenRouter key:**
  - it's read only in `server-only` modules, never has the `NEXT_PUBLIC_` prefix, and is never sent to the browser or logged;
  - requests send `HTTP-Referer` / `X-Title` headers and no personal data beyond the resume content you choose to send.
- **Cost and abuse control:**
  - a daily request cap (checked in the DB before calling OpenRouter);
  - input caps per action (e.g. a job description ≤ 20k characters, imported text ≤ 40k, a PDF upload ≤ 5 MB with a magic-byte check), `max_tokens` per action, and a 60s timeout.
- **AI output is untrusted:**
  - it's parsed with Zod and rendered as text only (no HTML);
  - imported or tailored content always goes through the same resume schema before it's saved, and you review it first.
- **Prompt injection:**
  - system prompts tell the model to treat the job description and CV text as data;
  - output is limited to the expected JSON shape, and the model has no tools or links to follow.
- **Personal data:**
  - the photo lives in a private bucket and is read through signed URLs that expire after 1 hour;
  - date of birth and contact details only ever appear in the admin and in PDFs you download;
  - nothing is seeded into the repo.
- **Validation:** UUIDs are checked, Zod strips unknown keys, and the JSON document size is capped. Deleting a resume removes its photo. The model ID has to match the `owner/model` pattern.

## Acceptance criteria

- **Resumes:**
  - Several resumes can be created, duplicated, renamed, archived and deleted, and each one keeps its own template, design and content.
  - Sections can be reordered by drag or keyboard, hidden and shown, renamed, and added (including custom sections). Items reorder within a section.
- **Templates and preview:**
  - All 4 templates render your imported CV and **look like their reference images**.
  - The Professional template reproduces `Resume.pdf`'s structure: photo, labels, gold dates, the bullets label, and a multi-page flow.
  - The preview updates while you type and matches the downloaded PDF exactly. Text in the PDF is selectable.
- **Import:** importing `Resume.pdf` fills contact, experience (all 5 roles, with the bullets label), education (6 entries) and references (2) for you to review before saving.
- **AI:**
  - rewrite, bullets and summary return options you can apply;
  - Tailor shows matched and missing keywords plus before/after suggestions you can accept;
  - Insights shows a score and checks;
  - a cover letter can be generated, edited and exported as a PDF.
- **Limits and security:**
  - The daily AI limit is enforced (429 after the cap), and usage is shown.
  - Signed out: 401 on all new APIs and a redirect on all new pages. `resume-assets` objects aren't publicly accessible.
- **Layout:** it works at 375 / 768 / 1024 / 1440 / 1920px, and the dashboard nav is grouped and numbered.
- **Checks:** `npm run typecheck`, `npm run lint` and `npm run build` pass, and `pnpm install --frozen-lockfile` succeeds.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
pnpm install --frozen-lockfile --lockfile-only
```

Plus curl smoke tests: the 401s, validation 400s, and one real AI call (`rewrite`) to confirm the OpenRouter key and model work. That call costs a fraction of a cent.

## Implementation order (one phase, committed in 3 steps so each is testable)

1. **Foundation:**
   - the migration, schema, APIs and the resume list;
   - the editor for all sections, with reordering;
   - the Professional + Classic templates, live preview and PDF download.
2. **Templates and design:** the Timeline + Sidebar templates, the design options, and photo upload through the private bucket.
3. **AI:** OpenRouter and usage limits, then rewrite, bullets and summary, then Import, Tailor, Insights, cover letters and Copilot. Then the grouped navigation polish.

## What you'll need to do (one time)

1. In the Supabase SQL Editor, run `supabase/migrations/20261002000000_resume_builder.sql`.
2. In Vercel → Environment Variables, add `OPEN_ROUTER_API_KEY` (and `RATE_LIMIT_SALT`, if you haven't yet).
3. Make sure your OpenRouter account has credits. The default model costs roughly $1 per million input tokens, and a typical rewrite uses under 3,000 tokens.

## Manual test steps (to share after implementation)

1. `npm run dev` → `/admin` → **03 / Career → Resumes** → **New resume → Import CV**. Upload `Resume.pdf`, review the result, and save. Choose the **Professional** template: the preview should look like your PDF.
2. Switch templates (Timeline, Classic, Sidebar) and colours. Set density to Compact and watch the page count.
3. Drag "Education" above "Experience", hide "References", and add a custom section "Volunteer Work".
4. On an experience bullet, click ✨ → "Quantify". Pick one of the 3 options.
5. **Tailor:** paste a job description, click Analyze, accept 2 suggestions, then open **Insights** and check the score.
6. **Duplicate for another job:** rename the copy, change its target role and template. The original is unchanged.
7. **Download PDF:** open it and check that the text is selectable and the layout matches the preview.
8. **Cover letters → New**, linked to the resume. Generate, edit and download.
9. On a phone-size screen (375px), edit a bullet and open Preview.

curl (`$TOKEN` from the Phase 2 token command):

```bash
curl -s http://localhost:3000/api/admin/resumes                                   # 401
curl -s http://localhost:3000/api/admin/resumes -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/admin/resumes -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"Frontend Developer CV","target_role":"Frontend Developer","template":"classic"}'
curl -s -X POST http://localhost:3000/api/admin/ai/rewrite -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Responsible for entering data into the system.","mode":"quantify","context":{"role":"Data Entry Clerk"}}'
curl -s http://localhost:3000/api/admin/ai/usage -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/admin/resumes/<id>/duplicate -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/admin/resumes/<id>/delete -H "Authorization: Bearer $TOKEN"
```
