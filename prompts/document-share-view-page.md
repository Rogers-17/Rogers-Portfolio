# Documents: a viewing page for share links, with download as an option

## Goal

Opening a document share link (`/d/<code>`) currently downloads the file straight away and leaves a blank tab. Change it so the link opens a page that **shows the document**, with a **Download** button the visitor can use if they want the file.

These links go on a CV, so the page has to work on phones as well as desktops.

## Skills read

- `AGENTS.md`: workflow, POST for mutations and GET for reads, checks, commit rule.
- No project skills apply.
- Next 16 docs:
  - `01-app/03-api-reference/03-file-conventions/route.md`: the download route is a `GET` Route Handler, because it's a link a browser navigates to.
  - `page.md` and `functions/redirect.md`, for redirects from a Route Handler.
- `node_modules/unpdf/README.md` (v1.8.1, already a dependency): it runs in the browser, inlines the PDF.js worker, and `getDocumentProxy(data)` returns a PDF.js document whose pages render to a `<canvas>`.

## Existing code inspected

- `app/d/[token]/page.tsx`: resolves the link, then calls `redirect()` to a 60-second download URL.
- `lib/documents/shares.ts`: `resolveDocumentShare` signs the file with `{ download: file_name }`.
- `supabase/migrations/20261008000000_document_shares.sql`:
  - `resolve_document_share(text, text)` returns `{ file_path, file_name }`.
  - Every lookup adds 1 to `open_count`.
- `components/documents/DocumentShareDialog.tsx`: shows "N opens".
- `components/documents/DocumentPreview.tsx`: the admin preview, which uses an `<iframe>` for PDFs and `<img>` for images.
- `components/resume/SharedResumeView.tsx`: the public resume page, used for its slim branded header and full-height layout.
- `components/documents/FileTypeIcon.tsx`, `components/share/LinkUnavailable.tsx`.
- `lib/documents/schema.ts`: `PREVIEWABLE` (pdf, png, jpg, webp), `formatBytes`.

## Decisions and assumptions

1. **"Downloads should be optional" means the visitor chooses to download.** Opening the link shows the file, and a Download button saves it.
   - No per-link switch to turn downloads off. Anyone who can view a PDF or image can still save or screenshot it, so the switch would only hide a button. It's easy to add later if wanted.
2. **PDFs are drawn on the page with PDF.js** (from `unpdf`, already installed, loaded only when a PDF is opened), not an `<iframe>`.
   - Android Chrome doesn't show PDFs inside an `<iframe>`, and iOS shows them poorly, so this works the same on every device.
   - Pages appear one under another at the page's width.
   - Each page is drawn when it scrolls into view.
   - The header shows "Page x of y".
3. **What each file type shows:**

   | Type | What the visitor sees |
   |---|---|
   | PDF | The pages, drawn on the page |
   | PNG, JPG, WEBP | The image, fitted to the screen |
   | TXT, MD, CSV | The text, in a scrollable monospace block; the first 1 MB only, with a note if cut off |
   | DOCX, XLSX, PPTX, DOC, XLS, ZIP | A file card (icon, name, size) with "This file can't be previewed in the browser" and a large Download button |

   Office files aren't converted, and they're never sent to Microsoft or Google viewers.
4. **Viewing URL:** the page gets a 5-minute signed URL for viewing, the same as the admin preview. The browser loads the file once, so the page keeps working after that.
5. **Download:** the button goes to **`/d/<code>/download`**. It checks the link again and then redirects to a fresh 60-second URL that saves the file under its original name.
6. **Expiring a link:**
   - New views and downloads stop at once.
   - A page already open keeps what it loaded.
   - A view URL already issued can work for up to 5 minutes. Before, the delay was 60 seconds.
7. **Separate counts:** views and downloads are counted separately (`open_count` becomes views, plus a new `download_count`). The dialog shows "3 views · 1 download". Link previews in chat apps may count as views.
8. **What the page shows about the document:**
   - Shown: the title, format and size.
   - Not shown: the description, tags, group and dates, which stay private.
   - The browser tab and link previews say "Shared document", so the title doesn't leak through chat-app previews.
9. **Rendering fails:** if a PDF can't be drawn (corrupt file, very old browser), the page says so and offers the Download button.
10. **Deployment order:** the new migration changes the database lookup's parameters, so **run the migration before deploying**. Otherwise share links show "Link unavailable" until it runs.

## Files likely to change

**New**
- `supabase/migrations/20261009000000_document_share_views.sql`
- `app/d/[token]/download/route.ts`
- `components/documents/SharedDocumentView.tsx` (client component: the page layout and the viewer for each type)
- `components/documents/PdfPages.tsx` (client component: the PDF.js renderer)

**Changed**
- `app/d/[token]/page.tsx`
- `lib/documents/shares.ts`
- `lib/documents/schema.ts`: `DocumentShare.download_count`
- `components/documents/DocumentShareDialog.tsx`: the view and download counts

## Implementation requirements

### Database (`20261009000000_document_share_views.sql`)

- `alter table document_shares add column if not exists download_count integer not null default 0`.
- `drop function if exists public.resolve_document_share(text, text)`.
- Create `resolve_document_share(p_token_hash text, p_viewer_hash text, p_kind text)`:
  - Same input checks, rate limit (120 per visitor per hour) and expiry/revocation rules as before.
  - `p_kind` must be `'view'` or `'download'`, otherwise it returns null. A view adds 1 to `open_count`, a download to `download_count`. Both set `last_opened_at`.
  - Returns `{ title, file_path, file_name, format, size_bytes }`.
  - `security definer`, `search_path = ''`, `revoke all from public`, `grant execute to anon, authenticated`.

### Server

- `lib/documents/shares.ts`:
  - `resolveDocumentShare(token, viewerHash, kind)` returns `"rate_limited"`, `null`, or `{ url, title, fileName, format, size }`.
  - A view signs for 300 seconds without `download`; a download signs for 60 seconds with `{ download: file_name }`.
  - `file_path` never leaves the server.
- `app/d/[token]/page.tsx`:
  - Resolves as a view.
  - Renders `<SharedDocumentView>` with the title, format, size, view URL and `downloadHref = /d/<code>/download`.
  - Keeps the current "Link unavailable" and rate-limit messages, plus `noindex` and `referrer: no-referrer`.
- `app/d/[token]/download/route.ts`, `GET`:
  - Resolves as a download.
  - Valid link: a 307 redirect to the signed URL, with `Cache-Control: no-store`, `Referrer-Policy: no-referrer` and `X-Robots-Tag: noindex`.
  - Otherwise: a 307 back to `/d/<code>`, which shows the right message.

### Client

- **`SharedDocumentView`:**
  - Header: the title (truncated), "Shared document · PDF · 1.2 MB", the "Powered by ROGERS" link, and a Download button (`<a href>`, no JavaScript needed).
  - Body: the viewer for the file type.
- **`PdfPages`:**
  - Fetches the view URL and shows a spinner and "Loading document…" while it loads.
  - Loads `unpdf` with `import()` and calls `getDocumentProxy`.
  - Draws each page into a `<canvas>` sized to the container width × `devicePixelRatio`, capped at 2.
  - Only draws pages near the screen, using `IntersectionObserver`, with placeholders kept at the right size.
  - Redraws when the width changes (with a debounce).
  - Tracks the current page.
  - Cleans up the PDF document when the component unmounts.

## Visual interpretation (UI)

- **Layout:** full-height page (`h-dvh`, flex column) like the shared resume:
  - a header bar (`bg-card`, `border-b border-white/6`, `px-4 py-3 md:px-6`);
  - a scrolling viewer area below it (`bg-[#525659]` for PDFs, as in the resume viewer; `bg-surface` for other types).
- **Header:**
  - Left: the title (`text-sm md:text-base font-bold`, truncated), with `text-xs text-muted` meta under it.
  - Right: "Page 2 of 5" (`text-xs text-muted`, PDFs only, hidden under `sm`), then the Download button (the gradient pill from `primaryButtonClass`, `min-h-10`, icon only under `sm`, with an `sr-only` label).
  - "Powered by ROGERS" moves to a small footer line on phones.
- **PDF pages:** centred column, `max-w-[900px]`, `gap-3 md:gap-4`, `p-2 md:p-6`, white pages with a soft shadow (`shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)]`), no rounded corners.
- **Images:** centred, `object-contain`, inside the viewport with `p-2 md:p-6`.
- **Text:** `font-mono text-[13px] leading-relaxed`, `whitespace-pre-wrap break-words`, a `bg-card` panel with `rounded-2xl border border-white/6 p-4 md:p-6`, `max-w-[900px]`.
- **No preview:** a centred card (`max-w-sm`, `rounded-2xl border border-white/6 bg-card p-8`) with a large `FileTypeIcon`, the file name, the size, a one-line note and a full-width Download button.
- **Typography and colors:** existing tokens only (`text-muted`, `text-dim`, `accent-1` and `accent-2` gradient, `bg-card`, `bg-surface`).
- **Responsiveness:**
  - At 320px: no horizontal scroll and PDF pages fill the width; tap targets are at least 44px.
  - The header stays on one line: the title truncates, and the Download button stays visible.
- **Pixel-perfect expectation:** the page should look like the shared resume page with a PDF in it, and look identical on desktop Chrome, Safari and mobile browsers.

## Security requirements

- Storage paths and the secret key never reach the browser; only signed URLs do.
- Downloads check the link again on every request, so a download link can't outlive "Expire now".
- Invalid, expired, deleted and unknown links all give the same "Link unavailable" result. The download route redirects to it and never reveals which case applies.
- `p_kind` is checked in the database.
- No signed URL or token is logged.
- `/d/*` stays `noindex` and `no-referrer`, and the download response is `no-store`.
- Text files are shown as plain text (React escapes them). Markdown is never rendered as HTML.
- PDF.js never runs JavaScript inside PDFs: scripting is off unless a viewer turns it on. This build has no eval-based font path, so there's no `isEvalSupported` option to set.

## Acceptance criteria

1. Opening a PDF link shows its pages on desktop and on phones (Android Chrome, iOS Safari), with no automatic download.
2. Download saves the file under its original name, and the view count doesn't change because of it.
3. Images show fitted to the screen. TXT, MD and CSV files show as text. Office and ZIP files show the card with Download.
4. After "Expire now", reloading the page shows "Link unavailable", and `/d/<code>/download` goes to that page instead of downloading.
5. The share dialog shows separate view and download counts.
6. A broken PDF shows a message and the Download button.
7. There is no horizontal scroll at 320px.
8. `typecheck`, `lint` and `build` pass.

## Checks to run

```
npm run typecheck
npm run lint
npm run build
```

Build is included because routes and server modules change. Commit once they pass.

## Manual test steps expected after implementation

**Setup**
1. Run `supabase/migrations/20261009000000_document_share_views.sql` in the Supabase SQL Editor before deploying.
2. Run `npm run dev`.

**In the browser**
3. Documents → a PDF's `⋯` → Share link → Create link.
4. Open `http://localhost:3000/d/<code>` (localhost, because copied links point to the live site). The pages show, and nothing downloads.
5. Click **Download**: the file saves under its original name.
6. Repeat with an image, a `.txt` file and a `.docx` file.
7. In Chrome DevTools, switch to a phone size (for example 360 × 740) and check the PDF fits the width with no sideways scroll.
8. Back in the dialog, check it shows "1 view · 1 download". Click **Expire now**, then reload the page and click Download: both show "Link unavailable".

**curl**

```bash
# The page (expect 200 and HTML, not a redirect)
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/d/<code>"

# The download (expect 307 to <project>.supabase.co)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/d/<code>/download"

# A bad code (expect 307 back to /d/<code>)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" "http://localhost:3000/d/aaaaaaaaaa/download"
```
