# Phase 8: Document archive (dashboard only)

## Goal

Give Rogers a private place in the dashboard to store and find personal and professional documents: certificates, diplomas, transcripts, IDs, contracts, invoices, references, exported CVs and so on. Rogers can:

- upload several files at once (drag and drop);
- organise them in a top-level group, with tags, a description and optional issue and expiry dates;
- search and filter them;
- preview PDFs and images in the app;
- download them with their original file name;
- create a temporary link to send one document to someone (for example a recruiter);
- edit their details and delete them.

Nothing in the archive is public. Every file lives in a private bucket and is only reachable through short-lived signed URLs.

## Skills read

- `AGENTS.md`: the workflow, POST for mutations and GET for reads, the checks to run, and the commit format.
- Next 16 docs in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/`:
  - `route.md`: Route Handlers. `context.params` is a Promise. Route files can only export HTTP handlers and the route config.
  - `page.md`: `searchParams` is a Promise.

## Existing code inspected

**Upload pipeline**
- `lib/admin/uploads.ts`: `sniffImage` (magic-byte detection, including PDF), `BUCKET_RULES`, `MIME_TO_EXT` and `MAX_UPLOAD_BYTES` (10 MB).
- `app/api/admin/uploads/sign/route.ts`: the server approves the upload, generates the path and returns a `createSignedUploadUrl`. The browser then PUTs the file straight to Supabase, which avoids Vercel's 4.5 MB body limit.
- `app/api/admin/uploads/confirm/route.ts`: downloads the file back, sniffs its real type and deletes it if it's rejected.
- `components/admin/ImageUpload.tsx`: the client side of the signed-upload flow.

**Storage**
- `lib/storage.ts`: `StorageBucket` and `PRIVATE_BUCKETS`.
- `supabase/migrations/20261002000000_resume_builder.sql`: the private `resume-assets` bucket and its admin-only `storage.objects` policies. These are the pattern to copy.
- `supabase/migrations/20261004000000_resume_extras.sql`: the table, trigger and RLS conventions (`public.is_admin()`, a `set_updated_at` trigger, policies created in a loop).

**Routes and helpers**
- `app/api/admin/jobs/route.ts` and `app/api/admin/jobs/[id]/route.ts`, plus its `delete/` route: GET reads, POST updates, and deletes go through POST on a `delete/` route.
- `lib/resume/routes.ts`: the `authWithId` and `IdContext` helpers.
- `lib/admin/http.ts`: `ok`, `fail`, `parseJson` and `dbError`.
- `lib/admin/auth.ts`: `requireAdminApi` and `requireAdminPage`.

**Admin UI**
- `components/admin/AdminShell.tsx`: the flat `navItems` list.
- `components/admin/Dialog.tsx`: `useDialog().confirm` and `prompt`.
- `components/admin/Toast.tsx`.
- `components/admin/Field.tsx`: `inputClass`.

## Decisions and assumptions

1. **Storage.** A new private bucket, `documents`, with a 10 MB limit per file (the same as every other bucket). The bucket is separate from `resume-assets`, so the CV-import clean-up can never touch the archive.

2. **Allowed types**, checked by their real contents and not by the browser's MIME type:

| Group | Formats | How the contents are checked |
| --- | --- | --- |
| PDF | `.pdf` | `%PDF-` |
| Images | PNG, JPG, WEBP | their magic bytes |
| Modern Office files | DOCX, XLSX, PPTX | a `PK\x03\x04` ZIP header that contains `[Content_Types].xml` |
| Legacy Office files | DOC, XLS | the OLE header `D0 CF 11 E0 A1 B1 1A E1` |
| Plain text | TXT, CSV, MD | valid UTF-8 with no NUL bytes |
| Archives | ZIP | a `PK` header |

   - The detected format must match the file's extension, with one exception: a DOCX, XLSX or PPTX may also be stored with a `.zip` extension.
   - **Not allowed:** SVG, HTML and executables. SVG and HTML can run scripts when opened from the storage domain, and executables are never needed.

3. **Groups.** Every document belongs to one fixed top-level group (stored in the `category` column):

| Key | Label | Typical contents |
| --- | --- | --- |
| `career` | Career | CVs, cover letters, job applications, employment documents, references |
| `academic` | Academic | transcripts, results, assignments, research, university documents |
| `achievements` | Achievements | certificates, awards, recognition |
| `projects` | Projects | PRDs, reports, case studies, pitch decks, technical documentation |
| `programs` | Programs | Orange/OSC, fellowships, hackathons, trainings, workshops |
| `business` | Business | contracts, proposals, client documents, invoices and finance |
| `personal` | Personal | identity and private records |
| `other` | Other | anything else |

   - Free-form **tags** (up to 10, 1 to 30 characters each, lowercase) and the description handle anything more specific.
   - The editor shows each group's typical contents as a hint under the group select.

4. **Metadata.** Every document has:
   - a title (from the file name, editable) and an optional description;
   - a group and tags;
   - optional `issued_on` and `expires_on` dates;
   - a favourite star;
   - the original file name (cleaned up; used only for display and as the download name);
   - the detected format, size and storage path.

5. **Expiry.** Documents whose `expires_on` is within 60 days show an "Expires soon" badge, and expired ones show "Expired". There's a filter for "Expiring". There are no emails or notifications.

6. **Previews.** PDFs and images open in an in-app modal using a 5-minute signed URL. Other formats offer a download only. Office files are never sent to a third-party viewer, because that would expose private documents.

7. **Downloads.** A 60-second signed URL with `download: <original file name>`, so the browser saves the file under its real name.

8. **Temporary links.** "Copy link" creates a signed URL that lasts 1 hour or 24 hours, chosen in a small menu. It's copied to the clipboard and not stored, so it can't be revoked; it simply expires. The UI says this plainly. Longer or revocable links can come later.

9. **Uploads.**
   - Several files at once: drop them on the page or use the Upload button.
   - Each file goes through sign, then PUT, then create, at most 3 at a time.
   - Each row shows its own progress or error.
   - New documents start in the "Other" group (or the active group filter, if one is selected), with the title taken from the file name. They're edited afterwards.

10. **Replacing a file** is out of scope; delete and re-upload instead. Saving generated resume PDFs into the archive automatically is also out of scope and can come later.

11. **Abandoned uploads.** If an upload is signed but never created (for example the tab was closed), the file stays in `documents/inbox/`. The create route moves verified files from `inbox/` to `files/`. A "Clean up" step in the list route deletes `inbox/` files older than 24 hours, at most once per request and capped at 100 files.

## Files likely to change

**New**
- `supabase/migrations/20261005000000_documents.sql`
- `lib/documents/schema.ts`: the groups (with labels and hints), the allowed formats, and the Zod input and update schemas.
- `lib/documents/sniff.ts`: server-only format detection. It reuses the PDF and image checks from `sniffImage` and adds the Office, ZIP and text checks.
- `lib/documents/queries.ts`: `listDocuments`, `getDocument` and `storageUsage`.

**New routes**

| Route | Method | Purpose |
| --- | --- | --- |
| `app/api/admin/documents/route.ts` | GET | List documents |
| `app/api/admin/documents/route.ts` | POST | Verify an uploaded file and create its row |
| `app/api/admin/documents/sign/route.ts` | POST | Start an upload |
| `app/api/admin/documents/[id]/route.ts` | GET | Read one document |
| `app/api/admin/documents/[id]/route.ts` | POST | Update its details |
| `app/api/admin/documents/[id]/delete/route.ts` | POST | Delete the row and the file |
| `app/api/admin/documents/[id]/link/route.ts` | POST | Get a signed URL for preview, download or sharing |

**New pages and components**
- `app/admin/(dashboard)/documents/page.tsx`
- `components/documents/`: `DocumentArchive.tsx` (the client container), `DocumentUploader.tsx`, `DocumentList.tsx`, `DocumentEditor.tsx` (a dialog), `DocumentPreview.tsx` (a modal) and `FileTypeIcon.tsx`.

**Changed**
- `lib/storage.ts`: add `"documents"` to `StorageBucket` and `PRIVATE_BUCKETS`.
- `components/admin/AdminShell.tsx`: a "Documents" nav item (the `FiArchive` icon) after "Job tracker".
- `.env.example`: no change (no new secrets).

## Implementation requirements

### Database (`20261005000000_documents.sql`)

```sql
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 150),
  description   text check (char_length(description) <= 2000),
  category      text not null default 'other' check (category in ('career','academic','achievements','projects','programs','business','personal','other')),
  tags          text[] not null default '{}' check (cardinality(tags) <= 10),
  file_path     text not null unique check (file_path ~ '^files/[0-9a-f-]{36}\.[a-z]{2,4}$'),
  file_name     text not null check (char_length(file_name) between 1 and 180),
  format        text not null check (format in ('pdf','png','jpg','webp','docx','xlsx','pptx','doc','xls','txt','csv','md','zip')),
  size_bytes    integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  issued_on     date,
  expires_on    date,
  is_favorite   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
```

- **Indexes:** `(category, created_at desc)`, and a partial index on `expires_on` where it isn't null.
- **Trigger:** the `set_updated_at` trigger.
- **RLS:** enabled, with four admin-only policies created in a loop (the same pattern as Phase 7).
- **Bucket:**
  - `insert into storage.buckets` creates `documents` as private, with a 10 MB limit, and `allowed_mime_types` set to the MIME types of the formats above plus `application/octet-stream`. Browsers often send that type for `.md` and `.csv`; the real check happens on the server.
  - It uses `on conflict do update`, so the migration can be re-run.
- **Storage policies:** four admin-only `storage.objects` policies for `bucket_id = 'documents'`.

### Server

- **`POST /documents/sign`**
  - Body: `{ fileName, size }`.
  - Validates the size (10 MB or less) and the extension against the allowed list.
  - Returns `{ path: "inbox/<uuid>.<ext>", signedUrl, token }`.
  - The client's file name is never used in the path.
- **`POST /documents`**
  - Body: `{ path, fileName, title?, category?, tags?, description?, issued_on?, expires_on? }`.
  - The path must match `^inbox/<uuid>\.<ext>$`.
  - The server downloads the file, checks its size, and detects its format with `sniffDocument(bytes, ext)`.
  - On success it moves the file to `files/<same uuid>.<ext>` with `storage.move`, inserts the row and returns it with status 201.
  - On any failure it removes the inbox file and returns a 400 or 413 with a clear message.
  - If the insert fails after the move, it removes the moved file.
- **`GET /documents`**
  - Query parameters: optional `q` (searches the title, file name, description and tags, up to 100 characters), `category`, `expiring=1`, `favorites=1`, and `sort` (`newest`, `oldest`, `name`, `size` or `expiry`).
  - Returns `{ documents, usage: { count, bytes } }`.
  - Runs the clean-up of abandoned inbox files (decision 11) on a best-effort basis; errors are logged and never fail the request.
- **`POST /documents/[id]`**
  - Updates title, description, category, tags, issued_on, expires_on and is_favorite.
  - Zod rejects unknown keys.
  - `expires_on` must not be before `issued_on`.
- **`POST /documents/[id]/delete`**
  - Deletes the row first, then the file. If removing the file fails, the error is logged and the request still succeeds, because the row is gone and the file isn't reachable from the UI.
- **`POST /documents/[id]/link`**
  - Body: `{ purpose: "preview" | "download" | "share", expiresIn?: 3600 | 86400 }`.
  - The validity is fixed by purpose: 300 s for previews, 60 s for downloads, and the chosen `expiresIn` for share links (the default is 86400).
  - Downloads and share links pass `{ download: file_name }`.
  - Previews are only allowed for PDFs and images; anything else returns 400.
  - Returns `{ url, expiresAt }`.
- **General**
  - Every route calls `requireAdminApi`, or `authWithId` for `[id]`.
  - Responses use `ok` and `fail`, and database errors go through `dbError`.
  - Responses carry no-store cache headers.
- **File-name clean-up**
  - Keep only the base name and strip control characters and the characters `/ \ : * ? " < > |`.
  - Collapse whitespace and trim to 180 characters.
  - The extension in the file name must match the detected format.

### Client UI (`/admin/documents`)

**Header**
- An eyebrow ("Archive"), the "Documents" title, and a muted line such as "24 files · 38.4 MB".
- The primary "Upload files" button (gradient pill) sits on the right. On phones it wraps below the title.

**Toolbar**
- A search input with a magnifier icon. It updates the URL with a 250 ms debounce (`?q=`), so filters survive a reload.
- Group chips in a horizontally scrollable row on phones: "All", the eight groups with counts, "★ Favourites" and "Expiring".
- A sort select.
- A grid/list view toggle, remembered in `localStorage` (wrapped in try/catch).

**Drop zone**
- Dragging files anywhere over the page shows a full-page overlay with a dashed accent border: "Drop to upload to <group>".
- When the archive is empty there's a large empty state that also accepts drops: "Your archive is empty. Drop certificates, IDs, contracts…".

**Upload queue**
- A card stacked above the list while uploads run.
- Each row shows the file name, size and a progress bar (XHR upload progress), then a check mark or a red error with a "Retry" action.
- The card collapses 3 s after every upload has finished.

**List view**
- Rows show:
  - a file-type icon tile (colour-coded: PDF rose, image sky, Word blue, Excel emerald, PowerPoint amber, text slate, ZIP violet);
  - the title, file name and size in muted text;
  - a group pill and tags;
  - an "Added" date, and an expiry badge if one applies;
  - a favourite star;
  - an actions menu: Preview, Download, Copy link (with the 1 h or 24 h submenu), Edit details and Delete.
- Clicking the row previews the file, or downloads it when it can't be previewed.

**Grid view**
- Cards with a large icon tile. Image documents load a thumbnail through a preview signed URL, lazily when they scroll into view.
- Each card shows the title, its group and the same menu.

**Editor dialog**
- Fields: title, group select (with its hint), tags (the existing `ChipsInput`), description textarea, issued and expiry dates, and a favourite toggle.
- Save and Cancel buttons.
- Inline Zod errors from the API `issues`.

**Preview modal**
- Full-screen on phones and `min(1100px, 92vw)` × 88vh on desktop.
- PDFs use an `<iframe>` and images an `<img>` with `object-contain`.
- The header shows the title, a Download button and a close button. Escape closes it.
- When the 5-minute URL expires, the preview refreshes it.

**Behaviour**
- Deleting uses `useDialog().confirm` with the danger tone: "Delete "<title>"? The file is removed permanently."
- Toasts confirm success and failure.
- The star toggles optimistically and is rolled back on error.

**Styling**
- Use the dashboard's existing tokens: `bg-card`, `border-white/10`, `text-muted` and `text-dim`, the accent gradient, `rounded-2xl` cards and `rounded-full` pills, with type sizes matching the Job tracker and Resumes pages.

**Responsiveness**
- At 375 px:
  - one column;
  - chips scroll horizontally;
  - the menu opens as a bottom sheet;
  - no horizontal scrolling on the page.
- At 768 px the grid has 2 to 3 columns.
- At 1200 px and wider the grid has 4 columns and the list rows sit on one line.

## Security requirements

**Storage and data access**
- The `documents` bucket is private. `publicImageUrl` is never used for it, and every access goes through a signed URL created server-side after `requireAdminApi`.
- RLS is enabled on `public.documents` and every operation is admin-only. The storage policies are admin-only too.

**Upload validation**
- Upload paths are generated on the server, and the client's file name is never part of a storage path.
- The type comes from the file's contents (magic bytes, or a text-validity check), and the extension must match it. Anything that doesn't match is deleted at once.
- Active formats (SVG, HTML, JS and executables) are rejected.
- The 10 MB limit is enforced in the bucket config, in the sign route and in the create route.

**Signed links**
- Expiry is capped: 24 hours at most for share links, 5 minutes for previews, 60 s for downloads.
- Share URLs are never stored or logged.

**Input handling**
- Zod validates every body and query parameter.
- The search text is passed to PostgREST through escaped `ilike` patterns: `%` and `_` are escaped, and `,` and parentheses are stripped so the `or()` filter can't be broken.
- The original file name is rendered as text only (React escapes it), and it's cleaned up before it's used in `Content-Disposition`.

**Nothing leaks**
- No file contents, signed URLs or tokens are logged.
- No personal documents are added to seeds or to the repo.

## Acceptance criteria

1. "Documents" appears in the sidebar after "Job tracker" and opens `/admin/documents`. The page and its API return 401 or redirect without an admin session.
2. Uploading a PDF, a JPG, a DOCX and a CSV at once works: each file shows progress and then appears in the list with the right icon, size and group.
3. A `.pdf` file that is really a PNG, a renamed `.exe`, an `.svg` and an 11 MB file are all rejected with clear messages. Nothing is left behind in `inbox/` or `files/`.
4. Search, group chips, Favourites, Expiring and sort all filter correctly, and the state survives a reload through the URL.
5. PDFs and images preview in the modal. Other formats download with the original file name.
6. "Copy link" with 24 h copies a URL that opens the file in a private browser window, and the UI states when it expires.
7. Editing details persists. An expiry date before the issue date is rejected inline. The expiry badges show correctly.
8. Delete asks for confirmation through the in-app dialog, then removes both the row and the stored file.
9. The layout has no horizontal scroll at 375, 768 and 1440 px, and the menu is reachable by keyboard (Escape closes the menu, the dialogs and the preview).
10. `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (new routes and migration-dependent pages)
- curl smoke tests without a session: every `/api/admin/documents*` route must return 401.

## Manual test steps (after implementation)

1. **Run the migration.** In Supabase Dashboard → SQL Editor, run `supabase/migrations/20261005000000_documents.sql`. Check that Storage now has a private `documents` bucket.
2. **Start the app.** Restart `npm run dev`, sign in, and open `/admin/documents`.
3. **Upload valid files.** Drag a PDF, a photo, a Word file and a CSV onto the page. Watch the progress bars, then confirm all four rows appear.
4. **Upload invalid files.** Rename a `.png` to `.pdf` and upload it, then try an `.svg` and a file over 10 MB. All three should show errors.
5. **Edit a document.** Edit the PDF: set the group to Achievements, add the tags `aws, cloud`, and set an expiry date 30 days from now. You should see the "Expires soon" badge, and the Expiring filter should show the PDF.
6. **Check search and filters.** Search for "aws", reload, and confirm the search is still applied.
7. **Preview and download.** Preview the PDF and the photo, then download the Word file and confirm its name is the original one.
8. **Test a share link.** Use Copy link → 24 h, and paste the link into a private window. The file should open.
9. **Delete a document.** Delete the CSV and confirm the dialog. In Supabase Storage, check that `documents/files/` no longer has its file.
10. **Check responsiveness.** Resize to a phone width: the chips should scroll, the menu should open as a sheet, and the page shouldn't scroll sideways.
11. **Check that the API is protected.** Each of these must return 401:

```bash
curl -i http://localhost:3000/api/admin/documents
curl -i -X POST http://localhost:3000/api/admin/documents/sign \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.pdf","size":1000}'
curl -i -X POST http://localhost:3000/api/admin/documents/00000000-0000-0000-0000-000000000000/link \
  -H "Content-Type: application/json" \
  -d '{"purpose":"download"}'
curl -i -X POST http://localhost:3000/api/admin/documents/00000000-0000-0000-0000-000000000000/delete
```
