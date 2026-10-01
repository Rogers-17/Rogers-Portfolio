# Document archive: files up to 50 MB with resumable uploads

## Goal

Raise the archive's limit from 10 MB to 50 MB per document. 50 MB is the most the Supabase Free plan allows.

Two things have to change to make that work:
- Uploads move to Supabase's resumable, chunked upload (TUS). Large files then survive slow or flaky connections, show real progress, and can be cancelled.
- The server checks uploaded files without downloading them in full. It reads only the parts it needs.

Every other part of the archive stays as it is.

## Skills read

- `AGENTS.md`: the workflow, POST for mutations, the checks to run, and the commit format.
- **Supabase docs**
  - *Storage → File limits*: the Free plan's global maximum is 50 MB per file. Pro allows up to 500 GB, set through the "Global file size limit" in Storage Settings.
  - *Storage → Resumable uploads*: TUS is recommended for anything over 6 MB, and the chunk size must be exactly 6 MB. Signed upload tokens from `createSignedUploadUrl` work with TUS when they're sent in an `x-signature` header.
  - The official Supabase example `examples/storage/resumable-upload-signed-uppy` sets this up as follows:
    - endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable/sign`;
    - headers: `apikey` and `x-signature`;
    - metadata: `bucketName`, `objectName`, `contentType` and `cacheControl`;
    - options: `uploadDataDuringCreation` turned on.
- **Next 16 docs:** `route.md`, which is unchanged.

## Existing code inspected

- `supabase/migrations/20261005000000_documents.sql`: the bucket is 10 MB, and the `size_bytes` check is 10485760 or less.
- `lib/documents/schema.ts`: `MAX_DOCUMENT_BYTES` is 10 MB.
- `lib/documents/sniff.ts`: checks the contents of the whole file.
- `app/api/admin/documents/sign/route.ts`: returns `{ path, signedUrl, contentType }`. The `token` isn't returned yet.
- `app/api/admin/documents/route.ts`: the create route currently downloads the whole file with `storage.download`.
- `components/documents/DocumentUploader.tsx`: uploads with an XHR PUT of FormData to the signed URL.
- `components/documents/DocumentArchive.tsx`: the copy says "10 MB" in the empty state and in the drop overlay.
- `lib/env.ts`: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are public and safe in the browser. The publishable key alone grants nothing, because RLS and the signature decide access.
- `storage-js` 2.117: `storage.from(bucket).info(path)` returns the stored size without downloading the file.

## Decisions and assumptions

1. **The limit is 50 MB per file**, enforced in the bucket config, the sign route, the create route and the database check. Other buckets (images, resume assets) stay at 10 MB.
2. **Every document upload uses TUS**, through `tus-js-client` (v4, about 20 KB gzipped, loaded only on the Documents page). One code path is simpler than two, and small files finish in a single 6 MB chunk anyway.
3. **Resume on retry.** If a connection drops, `tus-js-client` retries after 0, 1, 3, 5 and 10 seconds. The upload queue's "Retry" button resumes from the last finished chunk instead of starting over. Resume fingerprints are kept in `localStorage`, where the library keeps them by default, and are deleted when the upload finishes.
4. **Uploads can be cancelled.** While an upload runs, a "Cancel" (×) button aborts it and removes the partial file. If removing it fails, the existing inbox clean-up deletes it within 24 hours anyway.
5. **Concurrency** stays at 3 parallel uploads.
6. **Checks without a full download.** The create route:
   - gets the size from `storage.info(path)`;
   - signs the inbox file for 60 seconds and reads two parts of it with HTTP `Range` requests: the first 64 KB, and the last 64 KB for files over 128 KB;
   - runs `sniffDocument` on those parts:
     - PDFs and images: the header at the start of the file.
     - DOCX, XLSX and PPTX: the ZIP header, plus the internal file names, found in either part. The ZIP index sits at the end of the file and lists every internal file name, so the tail part is reliable for large files.
     - DOC and XLS: the header.
     - TXT, CSV and MD: the first 64 KB must be valid UTF-8 (decoded so that a character split at the cut-off is allowed) and contain no NUL bytes.
   - If a `Range` request is ignored and the whole file comes back, only the first 64 KB is read and the rest of the stream is cancelled.
7. **Free plan setting.** The Storage "Global file size limit" in the Supabase dashboard must be 50 MB, which is the Free plan's default and maximum. The test steps include checking it.
8. **Out of scope:** files over 50 MB, and links to Google Drive or OneDrive. Both can come later, or with Pro.

## Files likely to change

- **New:** `supabase/migrations/20261006000000_documents_50mb.sql`
  - sets `file_size_limit` on the `documents` bucket to 50 MB;
  - replaces the `size_bytes` check with `<= 52428800`.
- **Changed**
  - `lib/documents/schema.ts`: `MAX_DOCUMENT_BYTES = 50 * 1024 * 1024`, plus `MAX_DOCUMENT_MB` for the UI copy.
  - `lib/documents/sniff.ts`: `sniffDocument({ head, tail }, format)`.
  - `lib/documents/queries.ts`: a `readRanges(supabase, path, size)` helper.
  - `app/api/admin/documents/sign/route.ts`: also returns the signed `token`.
  - `app/api/admin/documents/route.ts`: uses `info()` and the range reads instead of `download()`.
  - `components/documents/DocumentUploader.tsx`:
    - TUS uploads, with progress, retry and resume, and cancel;
    - a new `cancelled` status;
    - the pending signature is kept per item, so "Retry" can resume.
  - `components/documents/DocumentArchive.tsx`: the copy changes from 10 MB to 50 MB.
  - `package.json` and `pnpm-lock.yaml`: add `tus-js-client`. Use pnpm so Vercel's frozen lockfile stays in sync.

## Implementation requirements

### Migration

```sql
update storage.buckets set file_size_limit = 50 * 1024 * 1024 where id = 'documents';
alter table public.documents drop constraint if exists documents_size_bytes_check;
alter table public.documents add constraint documents_size_bytes_check check (size_bytes > 0 and size_bytes <= 52428800);
```

The migration must be safe to run again.

### Sign route

The body is still `{ fileName, size }`. The size must be 50 MB or less, otherwise the route returns 413 with "File is too large (max 50 MB)." It returns:

```
{ path, token, contentType, bucket: "documents" }
```

The `signedUrl` is no longer needed, so it's dropped.

### Client upload (tus-js-client)

```ts
new tus.Upload(file, {
  endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable/sign`,
  headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, "x-signature": token },
  uploadDataDuringCreation: true,
  removeFingerprintOnSuccess: true,
  chunkSize: 6 * 1024 * 1024,
  retryDelays: [0, 1000, 3000, 5000, 10000],
  metadata: { bucketName: "documents", objectName: path, contentType, cacheControl: "3600" },
  onProgress: (sent, total) => ...,
  onError, onSuccess,
})
```

- **Resuming:** call `findPreviousUploads()` and then `resumeFromPreviousUpload()` before `start()`, so a retry continues where it stopped.
- **Errors:** map them to friendly messages:
  - HTTP 413, or a body mentioning "size": "File is too large (max 50 MB)."
  - 415, or a body mentioning "mime": "That file type isn't allowed."
  - network errors: "Connection lost. Retry to continue where it stopped."
  - anything else: "Upload failed. Please try again."
- **Cancelling:** `upload.abort(true)` also ends the server-side TUS upload. The item's status becomes `cancelled`, and it's removed from the list.
- **Progress row:** shows "12.4 of 48.0 MB" for files over 5 MB.
- **Expired signature:** signed upload tokens last 2 hours. If a retry fails because the signature expired (HTTP 401 or 403), sign again and start a fresh upload.

### Create route

1. Validate the body as today.
2. Call `info(path)`. If it fails, return 404 "Upload not found".
3. If the size is over the limit, return 413; if it's 0, return 400 "empty". The file is deleted in both cases.
4. Read the head and tail parts with `readRanges`, using `fetch` with `Range` headers on a 60-second signed URL and a 15-second timeout.
5. Run `sniffDocument({ head, tail }, format)`. If it fails, return 400 and delete the file.
6. Move the file, insert the row and clean up exactly as today, using `size_bytes` from `info()`.

The route keeps no more than about 130 KB of the file in memory at any point.

### UI copy

Change "10 MB" to "50 MB" in the empty state, the drop overlay and the messages.

## Security requirements

- **No new browser access.** The browser can only write to the one server-generated `inbox/<uuid>.<ext>` path that the signed token covers. Tokens are single-path and expire after 2 hours. The publishable key gives no rights on its own (the bucket is private and RLS is admin-only).
- **Content checks** still decide what's accepted. The extension must match the contents; SVG, HTML and executables are rejected; files that fail are deleted.
- **Size** is enforced in four places: the bucket, the sign route, the create route (actual stored size from `info()`) and the database check.
- **Nothing sensitive is logged:** no tokens, signed URLs or file contents.
- **Server memory and time stay bounded:** at most about 130 KB is read per check, and every range fetch has a timeout.
- **Leftovers:** cancelled or abandoned uploads end up in the existing 24-hour inbox clean-up.

## Acceptance criteria

1. A 45 MB PDF uploads with smooth progress and appears in the list. Preview and download work.
2. A 55 MB file is rejected straight away in the browser. A crafted request to the sign route with a size over 50 MB returns 413.
3. Turning Wi-Fi off and on during a large upload resumes it: either automatically, or with "Retry", continuing from the last chunk rather than 0%.
4. Cancelling a running upload removes it from the queue, and no row is created.
5. A renamed `.exe` saved as `.pdf`, and a PNG renamed `.docx`, are still rejected and deleted. A large DOCX (over 128 KB) is accepted.
6. Small files (under 1 MB) still upload normally.
7. `npm run typecheck`, `npm run lint` and `npm run build` pass, and `pnpm-lock.yaml` is updated.

## Checks to run

- `pnpm add tus-js-client`, which updates `pnpm-lock.yaml`.
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- A node unit check of `sniffDocument` with head and tail buffers, covering a PDF, a DOCX with its internal file names in the tail only, a text file split in the middle of a UTF-8 character, and an EXE renamed `.pdf`.
- The curl sign route check with a size of 60 MB, which must return 401 without a session (413 is only reachable when signed in).

## Manual test steps (after implementation)

1. **Run the migration.** In the Supabase SQL Editor, run `supabase/migrations/20261006000000_documents_50mb.sql`.
2. **Check the global limit.** In Supabase Dashboard → Project Settings → Storage, "Global file size limit" should be 50 MB.
3. **Restart and open the archive.** Restart `npm run dev` and open `/admin/documents`.
4. **Upload a large file.** Upload a PDF of 30 to 50 MB. Watch the "x of y MB" progress, then preview and download it.
5. **Test resuming.** Start another large upload, turn Wi-Fi off for about 10 seconds, then turn it back on. The upload should resume, either by itself or after you click Retry, without starting again from 0%.
6. **Test cancelling.** Start a large upload and cancel it halfway. The row should disappear and nothing should be added to the list.
7. **Test the size limit.** Try a file over 50 MB. It should be rejected with "max 50 MB".
8. **Test fake files.** Rename a `.png` to `.docx` and upload it. It should be rejected.
9. **Check the API without a session.** This should return 401 (the size check is only reached when signed in):

```bash
curl -i -X POST http://localhost:3000/api/admin/documents/sign \
  -H "Origin: http://localhost:3000" -H "Content-Type: application/json" \
  -d '{"fileName":"big.pdf","size":62914560}'
```
