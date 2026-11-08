# Branded email template for site emails

## Goal

Replace the plain-text Start-a-project notification with an HTML email in the portfolio's look. Build it as a **reusable layout**, so any future email (for example an auto-reply) uses the same frame. A plain-text version is still sent alongside, for clients that block HTML and for deliverability.

## Skills read

- `AGENTS.md`
- No project skills exist.
- Next 16: `route.md` and the Route Handlers guide, for the admin-only `GET` preview route.
- Resend "send email" API: `html` and `text` can be sent together, and `text` is shown when HTML is unavailable.

## Existing code inspected

- `lib/email/resend.ts`: `sendEmail({ from, to, subject, text })` over REST. It has no `html` yet.
- `lib/project-request/notify.ts`:
  - Builds the subject and a plain-text body.
  - Sends only to `CONTACT_NOTIFY_TO`.
  - Runs from `after()` in `app/api/project-requests/route.ts`.
- `lib/project-request/schema.ts`: the request fields. All are Zod-validated, but they are **visitor-controlled text**.
- `components/admin/InquiryDetail.tsx`: already builds `wa.me/<digits>` links from the visitor's phone.
- `app/globals.css` tokens:
  - surface `#05000a`, card `#131320`, fg `#e8e6f0`, muted `#8a8694`, dim `#5c586a`
  - accent-1 `#de0eff`, accent-2 `#751cff`, badge `#12041a`
- Visual language from `components/layout/Footer.tsx`, `sections/Hero.tsx` and the `PageHeader` badge:
  - the gradient "ROGERS" wordmark
  - the pill badge with a gradient border
  - the purple pill CTA
  - cards with a 6% white border
- `lib/admin/auth.ts`: `requireAdminApi(request)` is used by admin `GET` routes, e.g. `app/api/admin/ai/usage/route.ts`.
- `lib/site.ts`: `absoluteUrl()`, `site`. The generated `/icon` is a 192 px "R" monogram PNG.

## Decisions

1. **Scope.** The layout is reusable, and it is applied to the one email that exists: the owner notification.
   - A visitor auto-reply is out of scope. The form doesn't collect a visitor email address, and sending to visitor-supplied addresses would need its own abuse controls.
2. **A dark theme that matches the site.**
   - `#05000a` page, `#131320` card, `#e8e6f0` text, `#8a8694` labels.
   - The layout declares `color-scheme: dark`, so Apple Mail and iOS don't invert it.
   - Limitation: some Gmail and Outlook apps still force their own dark or light adjustments, which can't be fully controlled.
3. **Email-safe rendering:**
   - Table-based, 600 px max width, inline styles only, no external CSS or JS.
   - System font stack, because Atyp Display can't be loaded reliably in email clients.
   - Gradients carry a solid fallback (`#9b16ff`), because Outlook desktop ignores CSS gradients.
   - Gradient *text* isn't supported by most clients, so the "ROGERS" wordmark is solid accent-1 `#de0eff`, next to the monogram image (`absoluteUrl("/icon")`, 40 px, with alt text). The email still reads correctly when images are blocked.
4. **Layout structure** (`renderEmailLayout`):
   - A hidden preheader: the inbox preview line.
   - A header with the monogram and the ROGERS wordmark.
   - The card:
     - a pill badge (`#12041a` background, `#751cff` border)
     - a heading, with an accent-coloured highlight line in the site's "title + gradient highlight" pattern
     - the body
     - an optional bulletproof pill CTA button (table cell with a solid fallback, plus a gradient where supported)
   - A footer with muted small text: "Sent by mohammednrogers.online" and a link to the site.
5. **Project-request content** (`renderProjectRequestEmail`):
   - Badge: "New project request 🚀".
   - Heading: the business name. Highlight: `from <name>`.
   - A details table: location, project type, budget, deadline (or "Flexible"), preferred channel, phone if given.
   - A "Project details" block with the visitor's text. Line breaks are preserved as `<br>`.
   - Primary CTA: "Open in dashboard" → `/admin/inquiries/<id>`.
   - When a phone number is given, secondary text links "WhatsApp" (`https://wa.me/<digits>`) and "Call" (`tel:+<digits>`). The digits are extracted with `\D` removed, so nothing else from the visitor reaches an attribute.
   - The subject and plain-text body stay as they are, generated from the same data.
6. **Preview.** `GET /api/admin/email-preview` is admin-only (`requireAdminApi`).
   - It returns the HTML rendered with obviously fake sample data ("Sample Visitor", "Sample Co"). No real inquiry is read.
   - `Cache-Control: no-store`. The existing `X-Robots-Tag: noindex` on `/api/*` applies.
   - It's a read route, so `GET` is right. It lets the owner iterate on the design without submitting the form.
7. **No new dependencies** (no react-email or MJML). A small string-template renderer with one escaping helper.

## Files likely to change

New:

- `lib/email/html.ts`: `escapeHtml()`, the email tokens and `renderEmailLayout()`.
- `lib/email/templates/project-request.ts`: returns `{ subject, html, text }` for a request plus id.
- `app/api/admin/email-preview/route.ts`

Modified:

- `lib/email/resend.ts`: accept an optional `html`.
- `lib/project-request/notify.ts`: use the template.

## Implementation requirements

- **Escape every interpolated value** with `escapeHtml` (`& < > " '`) before it enters the HTML. Visitor text never goes into an attribute.
  - Only `absoluteUrl(...)`, the UUID id and digits-only phone strings are placed in `href` or `src`.
- **Keep the total HTML small** (under 102 KB, so Gmail doesn't clip it). No images except the monogram.
- **Every layout table** uses `role="presentation"`, `cellpadding/cellspacing="0"` and `border="0"`.
- **Images** have `width`, `height`, `alt` and `style="display:block"`.
- **Links** use the accent colour and `target="_blank"`.
- **`sendEmail`** sends `html` when given, and always sends `text`.
- **The `after()` / try-catch / no-op-without-env behaviour is unchanged.** A rendering error is caught like any other failure and never affects the submission.

## Security requirements

- HTML-escape all visitor data (test with `<script>`, `"><img onerror>`, `&`, and newlines).
- The preview route requires admin auth, uses sample data only and is never cached.
- No secrets or recipient addresses in the HTML.
- Recipients stay limited to `CONTACT_NOTIFY_TO`.

## Acceptance criteria

- The notification arrives as a dark, on-brand HTML email with:
  - the monogram and ROGERS wordmark
  - a badge, a heading with a highlight, a details table, the details text
  - an "Open in dashboard" button
  - WhatsApp and Call links when a phone number was given
- A plain-text alternative is included.
- Hostile input renders as literal text: there's no markup injection.
- `/api/admin/email-preview` returns 401 when signed out, and the rendered sample when signed in as admin.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (this adds a route).
- A script renders the sample and a hostile-input version, then confirms no raw `<script` or `onerror` appears and the size is under 102 KB.
- Headless Edge takes a screenshot of the rendered sample at 600 px and at mobile width for a visual check.

## Manual test steps

1. `npm run dev`, sign in at `/admin/login`, then open `http://localhost:3000/api/admin/email-preview`.
2. Signed out, this should return 401:

   ```bash
   curl -i http://localhost:3000/api/admin/email-preview
   ```

3. Submit the Start a Project form, with the Resend variables set. Check the email in Gmail on the web and on a phone.
