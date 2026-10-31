# Documents: share links that last until you expire them

## Goal

On the Documents page, sharing a file today means choosing "Valid for 1 hour" or "Valid for 24 hours" from the actions menu. Replace that with:

- **No expiry by default.** A new link keeps working until the admin expires it.
- **A dropdown to choose a time limit** when one is wanted.
- **An "Expire now" button**, so any link can be stopped at any moment.

Current links are Supabase signed URLs, which can't be revoked once issued. Manual expiry therefore needs links the app controls: a secret token stored as a hash in Supabase, and a public page that checks it on every open.

## Skills read

- `AGENTS.md`: workflow, POST for mutations and GET for reads, checks, commit rule.
- No project skills are named in this request or present in the repo.
- Next 16 docs: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`, and the `proxy.md` listing to confirm the file convention.

## Existing code inspected

- `components/documents/DocumentArchive.tsx`: `share()` copies a signed URL; its message says the link "can't be revoked".
- `components/documents/DocumentList.tsx`: `ActionsMenu` has the two "Valid for…" items; `Meta` renders the badges.
- `components/documents/DocumentEditor.tsx`: the `<dialog>` pattern to copy; `onSaved` rebuilds the record.
- `app/api/admin/documents/[id]/link/route.ts`: signs preview, download and share URLs.
- `lib/documents/schema.ts`: `SHARE_DURATIONS`, `documentLinkSchema`.
- `lib/documents/queries.ts`: `listDocuments`, `getDocumentRow`, `DOCUMENTS_BUCKET`.
- `supabase/migrations/20261005000000_documents.sql`: private bucket, admin-only RLS.
- Resume sharing, the pattern to follow:
  - `lib/resume/shares.ts`: `newToken`, `hashToken`, `TOKEN_PATTERN`
  - `app/r/[token]/page.tsx`
  - `components/resume/SharePanel.tsx`
  - `app/api/admin/resumes/[id]/shares/**`
  - `lib/resume/version-routes.ts`
  - the `resolve_resume_share` RPC in `supabase/migrations/20261004000000_resume_extras.sql`
- `lib/supabase/server.ts`, `lib/env.ts`: only the publishable key is configured today; there is no service client.
- `lib/admin/auth.ts`: cookie or bearer auth, with a same-origin check on cookie writes.
- `proxy.ts`: matches `/admin` and `/api/admin` only, so `/d/*` stays public.

## Decisions and assumptions

1. **"Automative" is read as automatic:** the admin doesn't have to pick a time, and "No expiry" is preselected.
2. **Dropdown options:** No expiry (default), 1 hour, 24 hours, 7 days, 30 days, 90 days. No custom date picker.
3. **New public URL: `/d/<token>`.** Each open checks the token, then redirects to a Supabase signed URL that lives 60 seconds and downloads the file under its original name. The long-lived link never exposes a storage URL that outlasts expiry.
4. **After "Expire now":** new opens fail at once. A visitor who opened the link in the previous 60 seconds can still start that download, and a download already running finishes.
5. **New server-only environment variable: `SUPABASE_SECRET_KEY`.**
   - A signed-out visitor has no permission to sign a file in a private bucket, so the server needs this key.
   - The alternative, an RLS policy letting `anon` read the bucket, would expose the private bucket through the public key, so it's rejected.
   - The key is used for exactly one call: signing the file after the token has been validated.
   - **The admin must add it to `.env.local` and to the hosting provider.** Without it, creating a link returns a clear 503 error and nothing else on the site is affected.
6. **Short links, because they go on CVs.** The token is 10 characters from a 31-character alphabet (lowercase letters and digits without `0`, `o`, `1`, `l`, `i`), for example `/d/k7m2xq9fbt`, so it can also be typed from a printed CV. Tokens are accepted in any letter case. That is about 49 bits of randomness, which the 120-lookups-per-hour limit makes impractical to guess online.
   **Only the token's SHA-256 hash is stored**, as with resume links, so the database never holds a usable link. A token this short could be recovered from its hash by someone who stole the database and brute-forced it offline, which is an accepted trade-off for short links. The full URL is shown once, right after creation. If it's lost, create a new link and expire the old one.
7. **A "Live link" badge appears on documents with active links.** With links that never expire, the archive has to show which private files are currently reachable.
8. **Opens are a simple counter** (`open_count`, `last_opened_at`), with no per-visitor dedupe. Link previews from chat apps may add to it.
9. **Links keep downloading the file**, as they do today. No public preview page.
10. **Not changed:**
    - The document's own "Expires on" date and the "Expiring" filter. They track the document (for example a certificate), not its links.
    - Admin preview and download through `/link`.
11. **Old signed links** can't be tracked or revoked; they die on their own within 24 hours.

## Files likely to change

**New**
- `supabase/migrations/20261008000000_document_shares.sql`
- `lib/documents/shares.ts`
- `app/api/admin/documents/[id]/shares/route.ts` (GET, POST)
- `app/api/admin/documents/[id]/shares/[childId]/revoke/route.ts` (POST)
- `app/api/admin/documents/[id]/shares/[childId]/delete/route.ts` (POST)
- `app/d/[token]/page.tsx`
- `components/documents/DocumentShareDialog.tsx`
- `components/share/LinkUnavailable.tsx` (moved out of `app/r/[token]/page.tsx`)

**Changed**
- `lib/supabase/server.ts`: add `createServiceSupabase()` and `hasServiceKey()`
- `lib/documents/schema.ts`: share options and schema; drop `share` from `documentLinkSchema`; remove `SHARE_DURATIONS`; add `active_links?: number` to `DocumentRecord`
- `lib/documents/queries.ts`: `listDocuments` adds the live-link count
- `app/api/admin/documents/[id]/link/route.ts`: preview and download only
- `components/documents/DocumentArchive.tsx`, `DocumentList.tsx`, `DocumentEditor.tsx`
- `app/r/[token]/page.tsx`: use the shared `LinkUnavailable`
- `.env.example`: document the new key

## Implementation requirements

### Database (`20261008000000_document_shares.sql`)

- `document_shares`:
  - `id`, `document_id` (FK, `on delete cascade`)
  - `token_hash` (unique, 64 chars)
  - `label` (≤ 80 chars)
  - `expires_at` (null = no expiry), `revoked_at`
  - `open_count` (default 0), `last_opened_at`, `created_at`
  - index on `(document_id, created_at desc)`
- `document_share_lookups` (`viewer_hash`, `looked_at`) for rate limiting, with an index.
- RLS on both tables. Admin-only policies on `document_shares`; no policies on lookups.
- `resolve_document_share(p_token_hash text, p_viewer_hash text) returns jsonb`:
  - `security definer`, `search_path = ''`
  - validates input lengths
  - limits to 120 lookups per visitor per hour and deletes lookups older than a day
  - finds a link that isn't revoked or past `expires_at`
  - increments the counter and sets `last_opened_at`
  - returns `{ file_path, file_name }`
  - `revoke all from public`; `grant execute to anon, authenticated`

### Server

- `lib/documents/shares.ts` (server-only):
  - `listDocumentShares`
  - `resolveDocumentShare(token, viewerHash)`, which returns a signed URL, `"rate_limited"` or `null`, and reuses `TOKEN_PATTERN` and `hashToken`
  - signs for 60 seconds with `{ download: file_name }`
- `documentShareCreateSchema` (strict): `label` (optional, ≤ 80) and `expires_in` (`null | 3600 | 86400 | 604800 | 2592000 | 7776000`). The server computes `expires_at`.
- Admin routes use `authWithId` and `authWithChild`:
  - `GET .../shares` lists links, never including `token_hash`.
  - `POST .../shares` returns 404 if the document is missing and 503 if the secret key is missing. Otherwise it responds 201 with `{ id, url, expires_at }`; this response is the only place the URL appears.
  - `POST .../revoke` sets `revoked_at`.
  - `POST .../delete` removes the row, which also stops the link.
  - Revoke and delete filter on both `document_id` and `id`.
- The URL origin comes from `NEXT_PUBLIC_SITE_URL`, falling back to the request origin, as in resume shares.

### Public page (`app/d/[token]/page.tsx`)

- Server Component using `createAnonSupabase()` and `hashIpFromHeaders`.
- Valid link: `redirect(signedUrl)`.
- Invalid, expired, expired-by-admin or deleted: the same "Link unavailable" page, so a guessed token reveals nothing.
- Rate limited: the "too many requests" message.
- Metadata: `noindex`, `referrer: no-referrer`.

### Dashboard

- `ActionsMenu`: replace the "Copy temporary link" heading and its two items with one **"Share link"** item (`LuLink`). `DocumentAction` changes from `share-1h` / `share-24h` to `share`.
- `DocumentArchive`: remove `share()` and the `purpose: "share"` path; hold `sharing` state and render the dialog; update `active_links` on the record when links change.
- `DocumentEditor.onSaved` keeps `active_links`, as it does `thumb_url`.
- `DocumentShareDialog` contains:
  - Form: optional label, the expiry dropdown and a "Create link" button.
  - After creating: the link in a read-only input, copied automatically when the browser allows it, with a Copy button and "Copy it now. It can't be shown again."
  - Link list: label or "Untitled link"; status (`No expiry`, `Expires in 3 days`, `Expires in 5 hours`, `Expired`); open count and last opened.
  - Row actions: **Expire now** with a warning confirm on active links, and Delete on every link.

## Visual interpretation (UI)

- **Layout:** same shell as `DocumentEditor`: full-screen `<dialog>` on phones, centred `min(40rem, 100vw - 2rem)` card from `md`, with a header showing the file icon, "Share link", file name and size, and a close button. The body scrolls.
- **Form:** two columns from `md` (label, expiry) with the button below; one column on phones. Under the dropdown, a hint that changes with the selection: "Works until you expire it." or "Stops working automatically after 7 days. You can still expire it sooner."
- **Typography:** existing scale: `text-base font-bold` title, `text-xs text-dim` secondary text, `text-sm font-bold` "Links" heading, `font-mono text-xs` for the URL.
- **Spacing:** `px-5 py-5` body, `gap-5` form grid, `gap-2` list rows, `p-3` per row.
- **Colors:**
  - Theme tokens only (`bg-card`, `border-white/6`, `text-muted`, `accent-1`).
  - The new-link panel matches the resume one (`border-accent-1/40 bg-accent-1/6`).
  - Expire now uses the amber style from `SharePanel`; Delete uses the rose hover.
  - Inactive rows are `opacity-60`.
  - The "Live link" badge is `bg-emerald-400/15 text-emerald-200`, in the same pill shape as the other `Meta` badges.
- **Controls:** `SelectField`, `TextField`, `primaryButtonClass`, `useDialog` confirm.
- **Responsiveness:** usable at 320px with no horizontal scroll, 44px touch targets on phones, and long URLs truncated inside the input.
- **Pixel-perfect expectation:** the dialog should look like a sibling of Edit details, and the row list should match the resume Share panel.

## Security requirements

- `SUPABASE_SECRET_KEY` is read only in the `server-only` `lib/supabase/server.ts`, never has a `NEXT_PUBLIC_` prefix, and is never logged or returned.
- The service client is used only for signing, after the RPC has validated the token. Admin routes keep using the session client and RLS.
- Tokens are 10 characters from `crypto.randomInt` (not `Math.random`). Only the SHA-256 hash is stored. Tokens, signed URLs and file paths are never logged, and `file_path` never reaches the dashboard.
- All admin routes require admin auth; cookie writes keep the same-origin check.
- Public failures are indistinguishable from each other.
- The expiry is validated against the allowed list and computed on the server.
- `/d/*` responses are not cached and not indexed.

## Acceptance criteria

1. "Share link" opens the dialog with **No expiry** preselected.
2. Creating with defaults gives a link that opens signed-out and downloads the file under its original name, with no expiry stored.
3. Choosing 1 hour stores an expiry one hour ahead, and the link fails after that time.
4. **Expire now** makes the link show "Link unavailable" on the next open that isn't using a URL already issued, and the row shows "Expired".
5. Deleting a document or a link stops its links.
6. The open count rises when a link is opened.
7. The "Live link" badge appears and disappears as links are created and expired, in list and grid views, without a reload.
8. A malformed or unknown token gives the same "Link unavailable" page.
9. Without `SUPABASE_SECRET_KEY`, creating a link shows a clear error, and existing pages still work.
10. Preview and download still work, and `purpose: "share"` on `/link` returns 400.
11. `typecheck`, `lint` and `build` pass.

## Checks to run

```
npm run typecheck
npm run lint
npm run build
```

Build is included because routes and server modules change. Commit once they pass.

## Manual test steps expected after implementation

**Setup**
1. Run `supabase/migrations/20261008000000_document_shares.sql` in the Supabase SQL Editor.
2. Add `SUPABASE_SECRET_KEY=<secret key from Project Settings -> API>` to `.env.local` and to the hosting provider, then restart `npm run dev`.

**UI**
3. Go to `/admin` → Documents → a file's `⋯` menu → **Share link**, and confirm No expiry is selected.
4. Create a link, then open it in a private window: the file downloads.
5. Click **Expire now**, wait just over a minute, and reopen the link: "Link unavailable".
6. Create a 1-hour link and confirm the row reads "Expires in 1 hour".

**API**, with a token from a signed-in session and a real document ID:

```bash
TOKEN="<supabase access token>"; DOC="<document uuid>"; BASE="http://localhost:3000"

# List links
curl -s "$BASE/api/admin/documents/$DOC/shares" -H "Authorization: Bearer $TOKEN"

# Create (no expiry)
curl -s -X POST "$BASE/api/admin/documents/$DOC/shares" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"label":"Test","expires_in":null}'

# Create (7 days)
curl -s -X POST "$BASE/api/admin/documents/$DOC/shares" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"label":"Test 7d","expires_in":604800}'

# Open the public link (expect a redirect to a signed URL)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "$BASE/d/<token from the url above>"

# Expire and delete
curl -s -X POST "$BASE/api/admin/documents/$DOC/shares/<share id>/revoke" -H "Authorization: Bearer $TOKEN"
curl -s -X POST "$BASE/api/admin/documents/$DOC/shares/<share id>/delete" -H "Authorization: Bearer $TOKEN"

# Rejected duration (expect 400)
curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BASE/api/admin/documents/$DOC/shares" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"expires_in":123}'
```
