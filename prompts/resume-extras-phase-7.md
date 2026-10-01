# Phase 7: Resume Builder extras (version history, private share links, job tracker)

## Goal

Three additions to the Resume Builder in the dashboard:

1. **Version history:** every save keeps a snapshot of the resume. You can browse earlier versions, preview any of them as a PDF, and restore one. You can also save a **named version** (for example "Sent to Acme").
2. **Private share links:** create a secret link to a resume that someone can open without logging in. They see the PDF preview and can download it. Each link has an expiry (7 days, 30 days or never) and a view counter, and you can **revoke it at any time**. Resumes stay private otherwise.
3. **Job tracker:** track your applications on a board with the stages **Saved → Applied → Interview → Offer → Rejected**, plus a list view. Each application links to the resume and cover letter you sent. It has dates, a follow-up reminder and notes, and you can move cards by drag and drop.

Out of scope: document archives (next phase), SEO, analytics, email reminders, comparing versions side by side (you can preview any version instead), and edit access for other people.

## Skills read

- `AGENTS.md`:
  - Supabase is the source of truth; use Zod and Tailwind.
  - `POST` for mutations, `GET` for reads.
  - Share curl steps; run typecheck, lint and build; commit.
- Next 16 docs:
  - dynamic route `params` as a Promise, `generateMetadata` with `robots: noindex`;
  - Route Handlers;
  - `proxy.ts` only covers `/admin` and `/api/admin`, so the public share page must do its own checks.
- Existing libraries: `@react-pdf/renderer` (client-side PDF), `@dnd-kit` (the board), `framer-motion`.

## Existing code inspected

- **Resume editor** (`components/resume/ResumeEditor.tsx`): `save()` POSTs the whole document to `/api/admin/resumes/[id]`. `EditorPanel` has Sections / Insights / Tailor tabs and a list of panel items.
- **Resume data:** `lib/resume/schema.ts` (`parseResumeData`, `ResumeRecord`) and `lib/resume/queries.ts` (`getResume`, `signPhoto`).
- **PDF preview:** `components/resume/PdfPreview.tsx` (the `PdfViewer` + `toPdfImage` for photos) and `components/resume/pdf/ResumeDocument.tsx`.
- **Admin patterns:** `requireAdminApi` / `requireAdminPage`, the `authWithId` helper, and `lib/admin/http.ts`. Tables use RLS with `is_admin()`. The private `resume-assets` bucket is readable only through signed URLs.
- **Rate limiting:** `lib/project-request/rate-limit.ts` has `hashIp`, used here for share-page view counting.
- **Sidebar:** `AdminShell` has one flat list. Resumes and Cover letters are already there; Job tracker will be added after them.

## Decisions / assumptions (please review)

1. **Versions:**
   - A snapshot is taken **automatically on every save**, but only if the content changed since the last snapshot. At most one automatic snapshot is kept per 10 minutes; the newest one within a 10-minute window is replaced, so rapid saves don't flood the history.
   - The **latest 50 automatic** versions are kept. **Named versions are never pruned.**
   - A snapshot stores the title, template, design and data.
   - Restoring loads that version into the editor as unsaved changes, so you can review it and then click Save. The current state is snapshotted first, so a restore can always be undone.
   - The history is in a new **"History"** item in the editor panel. It lists versions with the date, "Named" or "Auto" and the section count, with Preview (PDF), Restore, Rename, Name it and Delete.
2. **Share links:**
   - The URL is `https://<site>/r/<token>`. The token has 32 random bytes and is shown only once, when the link is created.
   - Only a **SHA-256 hash** of the token is stored, so a database leak can't be turned into working links. Because of that, you can't copy the link again later; you create a new one instead.
   - Each link has a label (for example "Acme recruiter"), an expiry, an optional **"allow download"** switch (default on), the view count and the last viewed time. It can be revoked.
   - **Snapshot or live?** A link shows a **frozen snapshot**: the version at the moment you create it, which becomes a named version automatically. That way, what a recruiter sees never changes while you keep editing. You can create a new link after changes.
   - The page is public and has no login. It checks the token server-side, is `noindex` / `nofollow`, and sends `Cache-Control: no-store`.
     - It renders the PDF in the browser from the snapshot data, served by a public **GET** route that only returns data for a valid, unexpired, unrevoked token.
     - The photo is stored with the link as a small JPEG (see Security), so the page never reads the private bucket.
   - **QR code:** when a link is created, a QR code for it is shown next to the URL, with **Download PNG** and **Download SVG** (for printing on business cards or cover letters). Like the link, it is only available at creation time; it is generated in the browser, so the token never goes to a third-party service.
  - The page has a minimal branded frame: the name, "Shared resume", a Download button (if allowed), and "Powered by Rogers" linking to the portfolio.
   - Views are counted once per visitor per hour, using a hashed IP, and are rate-limited (60 views per link per hour).
3. **Job tracker:**
   - A new `job_applications` table, managed at `/admin/jobs`, with:
     - company, role, job URL (https), location, salary range (free text) and source (LinkedIn, referral…);
     - **status**, date applied, the resume, the cover letter, the next follow-up date, notes, a 0–3 star priority and archived;
     - `status_changed_at`, for the "days in stage" shown on cards.
   - **The board** has 5 columns with a count in each. Cards show the company, role, the resume used, days in stage and a follow-up badge (red when overdue, amber when today).
     - Drag a card between columns or within one. Keyboard and touch work; on phones the columns scroll sideways, one at a time.
   - **List view:** a sortable table (company, role, status, applied, follow-up), with a search box and a status filter.
   - **Application editor:** a drawer on desktop and full screen on phones. It has all the fields, plus quick links: "Open resume", "Open cover letter", "Create a tailored resume for this job" (duplicates the linked resume with the company name), and "Create a cover letter".
   - **Resume editor link:** a small "Used in N applications" line under the title, linking to `/admin/jobs?resume=<id>`.
4. **Follow-ups:** a "Due follow-ups" strip at the top of the tracker, plus a count badge on "Job tracker" in the sidebar for follow-ups due today or overdue (like the Inquiries badge). No emails.
5. **Deleting:**
   - Deleting a resume deletes its versions and share links (cascade). Applications keep their record, but the resume is unlinked (`on delete set null`).
   - Deleting a cover letter unlinks it from applications.

## Visual interpretation

- The same dashboard language as the Resume Builder:
  - `bg-card` panels with `border-white/6`, uppercase `text-[11px]` labels;
  - the gradient pill for primary actions, and the soft gradient highlight for the active state.
- **History panel** (editor centre pane):
  - A vertical list with a thin timeline line on the left; named versions get a gradient dot, auto versions a grey dot.
  - Each row has the relative time ("12 min ago", exact date on hover), a name or "Auto-save", and "N sections · Template".
  - The actions are icon buttons.
  - Preview opens a modal with the `PdfViewer`.
- **Share panel:** in the **Finish up** pane and as a "Share" button in the editor top bar.
  - A list of links showing the label, "Expires in 6 days" or "No expiry", the views, and a Revoke button.
  - Creating a link shows the URL once, in a highlighted box with Copy, next to its QR code (white on a rounded card, 176px, with PNG and SVG download buttons).
- **Share page `/r/[token]`:**
  - A dark `bg-surface` frame with a small top bar (name + "Shared resume" on the left, Download on the right).
  - The PDF sits centred on a `bg-[#525659]` canvas, full height.
  - On phones the page is full width, with an "Open PDF" fallback.
  - An expired or revoked link shows a friendly message: "This link has expired or been turned off."
- **Tracker board:**
  - Columns are `min-w-72`, `bg-card/60 rounded-2xl`, with a coloured top border per status:
    - Saved: slate;
    - Applied: sky;
    - Interview: violet (`accent-2`);
    - Offer: emerald;
    - Rejected: rose.
  - Cards are `rounded-xl bg-white/3 border-white/8 p-3`, lifting slightly on hover.
  - The board is 5 columns at 1440px and up; otherwise it scrolls horizontally with snap.
- **Responsive:** check at 375 / 768 / 1024 / 1440px. The only horizontal scroll is inside the board.

## Database: `supabase/migrations/20261004000000_resume_extras.sql`

```sql
create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  name text check (char_length(name) <= 80),              -- null = automatic
  title text not null, template text not null, design jsonb not null,
  data jsonb not null check (octet_length(data::text) <= 300000),
  content_hash text not null,                              -- skip duplicate snapshots
  created_at timestamptz not null default now()
);
create index on public.resume_versions (resume_id, created_at desc);

create table public.resume_shares (
  id uuid primary key default gen_random_uuid(),
  resume_id uuid not null references public.resumes(id) on delete cascade,
  version_id uuid not null references public.resume_versions(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  label text check (char_length(label) <= 80),
  allow_download boolean not null default true,
  expires_at timestamptz,
  revoked_at timestamptz,
  photo_data text check (photo_data is null or (photo_data like 'data:image/jpeg;base64,%' and char_length(photo_data) <= 420000)),
  view_count integer not null default 0,
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  company text not null check (char_length(company) between 1 and 120),
  role text not null check (char_length(role) between 1 and 120),
  job_url text check (job_url is null or job_url ~ '^https?://'),
  location text, salary text, source text,                 -- length-checked
  status text not null default 'saved' check (status in ('saved','applied','interview','offer','rejected')),
  sort_order integer not null default 0,
  applied_on date, follow_up_on date,
  resume_id uuid references public.resumes(id) on delete set null,
  cover_letter_id uuid references public.cover_letters(id) on delete set null,
  priority smallint not null default 0 check (priority between 0 and 3),
  notes text check (char_length(notes) <= 5000),
  is_archived boolean not null default false,
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Plus:

- `updated_at` triggers, and a trigger that sets `status_changed_at` when the status changes.
- **RLS: admin only on all three tables.** Anonymous visitors have no access to anything.
- **`public.resolve_resume_share(p_token_hash text, p_viewer_hash text)`:**
  - `security definer`, `set search_path = ''`, execute granted to `anon`.
  - It returns only `{ title, template, design, data, allow_download, photo_data }` for a valid, unexpired, unrevoked link. Otherwise it returns null.
  - It increments `view_count` at most once per viewer hash per hour, using a small `resume_share_views (share_id, viewer_hash, viewed_at)` table.
- **`public.admin_move_application(p_id uuid, p_status text, p_ids uuid[])`:** updates the status and the order of the target column in one transaction. It raises unless `is_admin()`.

## Files likely to change

### New

| File | Purpose |
|---|---|
| `supabase/migrations/20261004000000_resume_extras.sql` | Tables, RLS, RPCs. |
| `lib/resume/versions.ts` | `server-only`: `snapshotResume(supabase, resumeId, state, name?)` (hash, dedupe, 10-minute window, prune to 50 auto), plus list and get. |
| `lib/resume/shares.ts` | `server-only`: `createShare` (token → hash, frozen named version), `listShares`, `revokeShare`, `resolveShare` (anon RPC). |
| `lib/jobs/schema.ts`, `lib/jobs/queries.ts` | Zod schemas, statuses and labels, and queries. |
| `app/api/admin/resumes/[id]/versions/route.ts` | `GET` list, `POST` create a named version. |
| `app/api/admin/resumes/[id]/versions/[versionId]/route.ts` | `GET` one (with data, for preview and restore), `POST` rename. |
| `app/api/admin/resumes/[id]/versions/[versionId]/delete/route.ts` | `POST`. |
| `app/api/admin/resumes/[id]/shares/route.ts` | `GET` list, `POST` create (returns the URL once). |
| `app/api/admin/resumes/[id]/shares/[shareId]/revoke/route.ts` | `POST`. |
| `app/api/share/[token]/route.ts` | Public `GET` (snapshot + stored photo), rate-limited, `no-store`. |
| `app/r/[token]/page.tsx` + `components/resume/SharedResumeView.tsx` | The public share page (outside the `(site)` layout: no navbar or footer). |
| `app/api/admin/jobs/route.ts`, `[id]/route.ts`, `[id]/delete/route.ts`, `move/route.ts` | Tracker CRUD + move/reorder. |
| `app/admin/(dashboard)/jobs/page.tsx` + `components/jobs/JobBoard.tsx`, `JobList.tsx`, `JobEditor.tsx`, `JobCard.tsx` | The tracker UI. |
| `components/resume/HistoryPanel.tsx`, `components/resume/SharePanel.tsx` | Editor panels. |

### Modified

- `app/api/admin/resumes/[id]/route.ts`: takes an automatic snapshot after a successful save.
- `components/resume/EditorPanel.tsx`, `ResumeEditor.tsx`, `FinishPanel.tsx`: the History item, the Share button and panel, restore handling, and the "Used in N applications" line.
- `components/admin/AdminShell.tsx` + `app/admin/(dashboard)/layout.tsx`: the "Job tracker" item (`FiTarget`) with the due follow-ups badge.

## Security requirements

- **Share tokens:**
  - 32 bytes from `crypto.randomBytes`, base64url-encoded; only the SHA-256 hash is stored, and the token is never logged.
  - The token format is validated before any DB call (43 characters, base64url).
  - Look-ups go through the `security definer` RPC, which checks expiry and revocation in SQL and returns **only** the snapshot fields. There's no table access for `anon`.
- **Share photo:** there's no service-role key, and anonymous visitors can't read the private bucket. So when you create a link, your browser (already signed in) converts the photo to a small JPEG and sends it with the request. It's stored with the link in `resume_shares.photo_data` (a data URL of at most about 300 KB, validated as a real JPEG). The share page never touches storage, and the private bucket stays private.
- **The share page:**
  - `noindex, nofollow, noarchive`, a `Referrer-Policy: no-referrer` header, and `Cache-Control: no-store`. A link that isn't found, has expired or has been revoked shows the same friendly message, so a guessed token gives nothing away.
  - The public route is rate-limited per IP (a hashed IP, 120 requests an hour).
- **Admin routes:** `requireAdminApi` everywhere; UUIDs validated; Zod limits on every field; `job_url` must be http(s) and is rendered with `rel="noopener noreferrer"`.
- **Versions:** the size cap matches resumes. Restoring re-validates the data with `parseResumeData`.

## Acceptance criteria

- **Versions:**
  - Saving 3 times with changes, 10 or more minutes apart, creates 3 automatic versions. Rapid saves within 10 minutes keep 1.
  - A named version survives pruning.
  - Preview shows that version's PDF. Restore loads it as unsaved changes, and the prior state is snapshotted.
- **Share links:**
  - Creating a link shows the URL once. Opening it in a private window shows the resume PDF with no login, and Download works if allowed.
  - Editing the resume afterwards doesn't change what the link shows.
  - Revoking, or passing the expiry, shows the "expired or turned off" page. A random token shows the same page.
  - The view count increases once per visitor per hour.
- **Job tracker:**
  - Create, edit and delete applications. Drag between columns updates the status and "days in stage".
  - List view sorting, search and status filter work.
  - The follow-up badge appears in the sidebar and on cards. Linking a resume or cover letter works, and so do the quick actions.
- **Auth:** signed out, every new admin route returns 401 and the new pages redirect. The share API returns 404 for invalid tokens and never exposes other resumes.
- **Checks:** `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

Plus curl smoke tests: the 401s, the share API with an invalid token (404), and a malformed token (404).

## What you'll need to do (one time)

In the Supabase SQL Editor, run `supabase/migrations/20261004000000_resume_extras.sql`.

## Manual test steps (to share after implementation)

1. **History:**
   - Open a resume, change the headline and save. Open the **History** panel: there's an "Auto-save" entry. Click **Name it** and call it "Before tailoring".
   - Make more changes and save, then **Preview** the named version (a PDF modal) and **Restore** it. The editor shows the old content as unsaved changes; save to keep it.
2. **Share:**
   - Click **Share** → label "Test", expiry 7 days → **Create link** → **Copy**.
   - Open the link in a private or incognito window: you see the resume with no login, and Download works.
   - Edit the resume in the dashboard and reload the shared page: it's unchanged.
   - **Revoke** the link and reload the page: "This link has expired or been turned off."
3. **Job tracker:**
   - Go to **Job tracker** → **New application**: Acme, Frontend Developer, link a resume, follow-up today.
   - The card appears in Saved with a follow-up badge, and the sidebar shows **1**. Drag it to Applied, then Interview; days in stage resets.
   - Switch to **List**, sort by company and search "acme".
   - In the application, click **Create a tailored resume for this job**: a copy opens in the editor.
4. **Responsive:** on a phone-size screen, scroll the board sideways, open an application and edit it.

curl (`$TOKEN` from the Phase 2 token command):

```bash
curl -s http://localhost:3000/api/admin/jobs                               # 401
curl -s -X POST http://localhost:3000/api/admin/jobs -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"company":"Acme","role":"Frontend Developer","status":"applied","applied_on":"2026-09-30"}'
curl -s -X POST http://localhost:3000/api/admin/jobs/move -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":"<id>","status":"interview","ids":["<id>"]}'
curl -s http://localhost:3000/api/admin/resumes/<resumeId>/versions -H "Authorization: Bearer $TOKEN"
curl -s -X POST http://localhost:3000/api/admin/resumes/<resumeId>/shares -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"label":"Test","expires_in_days":7,"allow_download":true}'
curl -s http://localhost:3000/api/share/not-a-real-token                  # 404
```
