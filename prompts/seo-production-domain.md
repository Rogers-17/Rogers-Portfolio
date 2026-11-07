# SEO, production domain and contact-email readiness

## Goal

Make the public portfolio indexable and shareable under the new primary domain **https://mohammednrogers.online**, without changing the design or any working feature. This covers:

- metadata: titles, descriptions, canonicals, Open Graph, X cards and icons
- structured data
- a dynamic sitemap and `robots.txt`
- indexing rules for private routes
- small accessibility and LCP fixes
- an optional Resend email notification when a Start-a-project request is saved

The owner is Mohammed N. Rogers, a full-stack software engineer based in Liberia. The audience is recruiters, employers, clients and collaborators.

Out of scope: deploying, changing DNS, changing Vercel or Supabase dashboard settings, or editing DB content. These are documented as manual steps.

## Skills read

- `AGENTS.md`: the workflow, POST for mutations and GET for reads, checks, and the commit rule.
- No project skills directory exists, so none apply.
- Next 16 docs in `node_modules/next/dist/docs/01-app/03-api-reference/`:
  - `03-file-conventions/01-metadata/sitemap.md` and `robots.md`: a `sitemap.ts` or `robots.ts` is a cached Route Handler that returns `MetadataRoute.Sitemap` or `MetadataRoute.Robots`.
  - `03-file-conventions/01-metadata/opengraph-image.md` and `app-icons.md`.
  - `04-functions/generate-metadata.md`. Three rules matter here:
    - `metadataBase` and `title.template` (with a required `default`) apply to child segments.
    - Metadata is **shallowly merged**, so a child's `openGraph` replaces the parent's entirely.
    - **File-based metadata overrides the metadata object.**
  - `04-functions/image-response.md`: fonts must be `ttf`, `otf` or `woff`. `assets/fonts/AtypDisplay-Regular.woff` is usable; the `woff2` files are not.
  - `02-components/image.md`: in v16 **`priority` is deprecated in favour of `preload`**.
  - `04-functions/after.md`: `after()` from `next/server` runs work after the response is sent.
  - `04-functions/generate-viewport.md`: `themeColor` belongs in `viewport`, not `metadata`.

## Existing code inspected

- `app/layout.tsx`: the root `metadata` is `title: "Rogers Portfolio"` with a placeholder description. No `metadataBase`, no viewport. It uses `next/font/local` (Atyp Display) and sets `lang="en"`.
- `app/(site)/layout.tsx`: Navbar plus Footer.
- `app/(site)/page.tsx`: the home page, with no metadata.
- Pages that hard-code titles as `"X | Rogers Portfolio"`:
  - `app/(site)/about/page.tsx`, `blog/page.tsx`, `gallery/page.tsx`, `projects/page.tsx`, `start-a-project/page.tsx`, `learn/coding-courses/page.tsx`.
  - `projects/[slug]/page.tsx`: `generateMetadata` sets only title, description and partial OG.
  - `blog/[slug]/page.tsx`: OG is set as an article. Inline `BlogPosting` JSON-LD has the author "Rogers" with no URL. The post's `canonical_url` is respected.
- `app/admin/layout.tsx`: `robots: noindex, nofollow`.
- `app/r/[token]/page.tsx` and `app/d/[token]/page.tsx`: noindex, no-referrer.
- `app/d/[token]/download/route.ts`: returns a file.
- `lib/blog/queries.ts`, `lib/blog/schema.ts`:
  - RLS only returns published posts that are past their publish date.
  - The post carries `published_at`, `updated_at`, `seo_description` and `canonical_url`, plus `summary` (the excerpt, or the auto excerpt).
- `lib/projects/queries.ts`, `lib/projects/schema.ts`:
  - Queries filter on `is_published`.
  - The detail row has name, tagline, summary, year, `website_url`, cover image and alt, and technologies.
  - The `projects.updated_at` column exists but is not selected.
- `lib/supabase/server.ts`: `createServerSupabase(tag)` uses force-cache plus tags. Admin saves call `revalidateTag(tag, { expire: 0 })` (`lib/admin/revalidate.ts`).
- `app/api/admin/{documents,resumes}/[id]/shares/route.ts`: these already use `NEXT_PUBLIC_SITE_URL || request origin` for share links. **They stay unchanged**, so preview deployments keep generating preview links.
- `lib/admin/auth.ts`, `isSameOrigin`: compares the `Origin` header with `host`. It is host-agnostic, so it works on the new domain unchanged.
- `app/api/project-requests/route.ts`:
  - Saves Start-a-project requests through the `submit_project_request` RPC.
  - It has a honeypot, a minimum fill time, a body cap, Zod validation and a per-IP / site-wide DB rate limit.
  - **No notification is sent.**
- `components/start-project/SendOptions.tsx`: "Send via Email" opens `mailto:` with `project_form_settings.contact_email`, which comes from the DB and is edited in the admin "Project form" page.
- `components/layout/Footer.tsx`:
  - All 4 social links are `href="#"`.
  - The text says "built … in Nigeria".
- `sections/Hero.tsx` (client component):
  - The main hero image is the LCP element. It has `alt="Hero Image"` and no `preload`.
  - The decorative outline image carries the descriptive alt.
  - "LET'S WORK" uses the relative `href="start-a-project/"`.
  - The "Corporate Profile" link is `href="#"`.
- `app/(site)/projects/page.tsx`: the `<h1>` is the "My Works 🤩" badge, and the real heading is a `<p>`.
- `priority` is used in `projects/[slug]/page.tsx`, `components/gallery/TornImage.tsx` and `components/about/TiltPhotos.tsx`.
- `app/favicon.ico` (16 and 32 px). There is no apple-touch icon and no larger icon.
- Grep of all code for `vercel.app`: **no occurrences**. The domain switch is env-driven.

## Decisions (confirmed with the user)

1. **Social profiles:** use only `https://github.com/Rogers-17`, in the footer and in Person `sameAs`. Remove the LinkedIn, X and Dribbble placeholder icons until real URLs exist. Adding one later is a single array entry in `lib/site.ts`.
2. **Location:** Liberia. Change the footer to "in Liberia" and set Person `address.addressCountry: "LR"`.
3. **Email:** add Resend notifications now, with these constraints:
   - Server-only and env-gated.
   - Uses Resend's REST API through `fetch`, so **no new dependency**.
   - Sent with `after()`, so it never slows or breaks a submission.
   - Inactive until the keys are set.
4. **The Corporate Profile link stays as it is** (user's choice). It is listed as an outstanding item.

## Approved revisions (these override the engineering decisions below where they conflict)

- **R1, indexing.** `isIndexable` is true **only** when `VERCEL_ENV === "production"`. There is no `NODE_ENV` fallback, so a preview, a local build or an unknown host is never indexable.
  - To check the production robots output locally, build with `VERCEL_ENV=production` set in the shell for that command only.
- **R2, `after()` and Resend.**
  - The docs confirm `after()` is supported in Route Handlers on Node and Vercel, where it is backed by `waitUntil`, and is bounded by the route's max duration.
  - The callback is fully try/caught and the fetch times out after 8 s. The response is already sent, so a failure can't change the 201.
  - Limitations to document:
    - No retries and no queue.
    - Delivery depends on Resend, the domain verification and the recipient's spam filtering.
    - The DB row, shown in Admin › Inquiries, stays the source of truth.
- **R3, canonical URLs.** A post's `canonical_url` is validated at render time by `safeCanonical()`:
  - It must parse as a URL with `http:` or `https:`, a dotted hostname, no credentials, and 300 characters or fewer.
  - Otherwise the page falls back to `/blog/<slug>`.
  - The "Originally published on" link uses the same validated value.
  - A valid canonical that equals the post's own URL counts as self-canonical, so the post stays in the sitemap.
- **R4, sitemap invalidation.** The docs only promise that `revalidateTag` affects *pages* that use the tag, so `revalidateProjects()` and `revalidateBlog()` also call `revalidatePath("/sitemap.xml")`, which the docs say covers route handlers.
  - Every publish, unpublish, update, delete and reorder route already calls these helpers.
  - `revalidate = 3600` remains as the backstop.
- **R5, images.**
  - `preload` only on the home hero portrait, the single unambiguous LCP image.
  - The project cover (shown only when there's no gallery) gets `loading="eager"` + `fetchPriority="high"`.
  - The About primary photo and the Gallery hero image can each be the LCP or below the fold depending on viewport, so they get `loading="eager"` with no preload. The docs advise against preload in that case.
- **R6, preview URLs** stay functional:
  - No redirects are added in code.
  - Share-link origin logic is untouched.
  - Only SEO metadata, canonicals, the sitemap and robots point to the production domain.
- **R7, env vars.** The code default and `NEXT_PUBLIC_SITE_URL` in Vercel Production are both exactly `https://mohammednrogers.online`.
  - `NEXT_PUBLIC_SITE_URL` is **not** set in Preview, so preview share links keep their own origin.
  - An invalid `NEXT_PUBLIC_SITE_URL` fails the build loudly instead of silently falling back.
  - The Resend vars are set in Production. They are optional in Preview: leave them unset to avoid test emails.
- **R8, JSON-LD.** The serializer escapes `<`, `>`, `&`, U+2028 and U+2029 as `\uXXXX`, and this is verified with a script.
- **R9, page audit.** Check the rendered public pages for duplicate titles and descriptions, placeholder links and accidental `noindex`, and report the results.
- **R10, redirects.** The Vercel-domain redirect is documented as a step to take **only after** `mohammednrogers.online` is verified, serves HTTPS and loads the portfolio.
  - Deploy order: connect the domain first, then deploy this change, because canonicals point to the new domain as soon as it ships.

## Decisions (engineering)

5. **One source of truth, `lib/site.ts`:**
   - `SITE_URL` comes from `NEXT_PUBLIC_SITE_URL` (validated with Zod, trailing slash stripped) and defaults to `https://mohammednrogers.online`.
   - The identity constants live here too: name, alternate name "Rogers", job title, default description, locale `en_US`, country, and `sameAs`.
6. **Previews and dev are never indexed:**
   - `isIndexable` is true when `VERCEL_ENV === "production"`. Outside Vercel, it is true when `NODE_ENV === "production"`, so a local `next build && next start` can be tested.
   - When it's false: the root metadata is `noindex, nofollow`, `robots.txt` is `Disallow: /`, and `next.config.ts` adds `X-Robots-Tag: noindex` to every response.
   - Canonicals always point to the production domain, including on previews. Previews must not compete with production.
7. **Canonical per page, never in the root layout.** A root canonical would be inherited by every page that forgets its own. A `pageMetadata()` helper in `lib/seo.ts` builds the full block, because shallow merging would otherwise drop `siteName` and other fields:
   - `title`, `description`, `alternates.canonical`
   - full `openGraph`: `url`, `siteName`, `locale`, `type`, `images`
   - `twitter`: `card: summary_large_image`, `title`, `description`, `images`
8. **Default social image.** A route at `app/og/route.tsx` returns a 1200×630 `ImageResponse`:
   - Brand gradient on `#05000a`, with "Mohammed N. Rogers" and "Full-Stack Software Engineer" set in Atyp Display (`.woff`).
   - It uses no request-time APIs, so it is statically cached.
   - It's an explicit route instead of `opengraph-image.tsx` because file-based images take priority over config. Project and blog pages must be able to use their own cover image predictably.
   - Pages without a cover image use `/og`.
9. **Title template.** In the root layout: `{ default: "Mohammed N. Rogers | Full-Stack Software Engineer", template: "%s | Mohammed N. Rogers" }`.
   - The home page uses the default through `title.absolute`.
   - Every page title drops its hard-coded `| Rogers Portfolio`.
10. **Descriptions** are natural and based on facts the site and the brief already state. No invented claims.
    - Home: the brief's suggested description, verbatim.
    - About: "About Mohammed N. Rogers, a full-stack software engineer based in Liberia: background, journey and approach to building web products."
    - Projects: "Software, web applications and websites designed and built by Mohammed N. Rogers, with the problem, solution and technology behind each one."
    - Blog: "Articles by Mohammed N. Rogers on software engineering, full-stack web development and building digital products."
    - Gallery: "Photos from Mohammed N. Rogers: moments, places and people from behind the builds."
    - Start a Project: "Tell Mohammed N. Rogers about your project in a few quick steps, then send it via WhatsApp, email, or request a call."
    - Coding Courses: "Project-based coding courses from Mohammed N. Rogers. Launching soon."
11. **Coding Courses** is a "coming soon" placeholder with thin content. It gets `noindex, follow` and stays out of the sitemap until the courses launch. A comment marks where to flip it.
12. **Blog pagination.** `/blog` is canonical for page 1 and for invalid values. `/blog?page=n` is canonical to itself for valid n > 1. Only `/blog` goes in the sitemap.
13. **Blog posts with an external `canonical_url`** keep that canonical and are **left out of the sitemap**, because a sitemap lists canonical URLs only.
14. **`robots.txt` in production:**
    - `Allow: /` and `Disallow: /admin`, `/api/`.
    - Plus `Sitemap: https://mohammednrogers.online/sitemap.xml` and `Host`.
    - `/r/` and `/d/` are **not** disallowed. Crawlers must be able to fetch them to see their `noindex`, and these links can appear on public CVs.
    - Defense in depth: `next.config.ts` sends `X-Robots-Tag: noindex, nofollow` on `/admin/:path*`, `/api/:path*`, `/r/:path*` and `/d/:path*`. This also covers the non-HTML download response.
    - robots.txt is not an access control. Auth is unchanged.
15. **Sitemap contents:**
    - `/`, `/about`, `/projects`, the published `/projects/[slug]` pages, `/blog`, the published and self-canonical `/blog/[slug]` pages, `/gallery` and `/start-a-project`.
    - `lastModified` comes only from real data: the project's `updated_at`, the post's `updated_at`, and on the listings, the newest child date. Static pages carry no invented dates.
    - `export const revalidate = 3600` as a backstop. Tag revalidation from admin saves also refreshes it.
16. **Structured data**, rendered through a `JsonLd` server component that escapes `<` (as the blog page already does). The Person has a stable `@id` of `${SITE_URL}/#person`, and other nodes reference it.
    - **Home:** `WebSite` (name, url, inLanguage, publisher → Person) and `Person`:
      - name, alternateName, url, jobTitle "Full-Stack Software Engineer", image (the hero portrait as an absolute URL), `address.addressCountry` "LR"
      - `sameAs` [GitHub]
      - `knowsAbout` [Next.js, React, TypeScript, Node.js, Supabase], all named in the brief or used on the site
    - **/about:** `ProfilePage` with `mainEntity` → Person, and a `BreadcrumbList` (Home › About).
    - **/blog/[slug]:** `BlogPosting`:
      - headline, description, image, url, `mainEntityOfPage`
      - `datePublished` from `published_at` and `dateModified` from `updated_at`
      - author and publisher → Person with name and url, inLanguage
      - plus a `BreadcrumbList` (Home › Blog › Post)
    - **/projects/[slug]:** `CreativeWork`:
      - name, description, url, image, `dateCreated` = the project year, `creator` → Person
      - `keywords` = the technology names, and `sameAs` = `website_url` when present
      - plus a `BreadcrumbList` (Home › Projects › Name)
      - Not `SoftwareApplication`: Google requires offers or ratings for that, and those would have to be invented.
17. **Icons.** Keep `favicon.ico`. Add generated `app/icon.tsx` (192×192, a multiple of 48 as Google asks) and `app/apple-icon.tsx` (180×180): an "R" monogram in the brand gradient on `#05000a`.
18. **Viewport:** `themeColor: "#05000a"` (the `--color-surface` value).
19. **Related articles.** Under a blog post, show "More articles": up to 3 other recent published posts, using the existing `PostCard` and grid classes. The section renders only when there is at least one other post. This adds internal links without new styles.
20. **No rewrite of the hero animation or other speculative performance work.** Only the measured or obvious LCP and accessibility fixes listed below.

## Files likely to change

New:

- `lib/site.ts`: identity, `SITE_URL`, `isIndexable`, `absoluteUrl()`.
- `lib/seo.ts`: `pageMetadata()` and the JSON-LD builders (person, website, profile page, breadcrumbs, blog posting, creative work).
- `components/seo/JsonLd.tsx`
- `app/sitemap.ts`, `app/robots.ts`
- `app/og/route.tsx`, `app/icon.tsx`, `app/apple-icon.tsx`
- `lib/email/resend.ts`: `sendEmail()`, server-only.
- `lib/project-request/notify.ts`: builds and sends the new-request notification.

Modified:

- `app/layout.tsx`: `metadataBase`, title template, default OG and X, robots, `viewport`.
- `app/(site)/page.tsx`: metadata plus Person and WebSite JSON-LD.
- `app/(site)/about/page.tsx`, `gallery/page.tsx`, `start-a-project/page.tsx`, `learn/coding-courses/page.tsx`
- `app/(site)/projects/page.tsx`: metadata, plus the heading semantics with identical classes.
- `app/(site)/projects/[slug]/page.tsx`: metadata, JSON-LD, `priority` → `preload`.
- `app/(site)/blog/page.tsx`: switches to `generateMetadata` for the pagination canonical.
- `app/(site)/blog/[slug]/page.tsx`: metadata, JSON-LD and related posts.
- `lib/blog/queries.ts`: `getSitemapPosts()` (slug, updated_at, canonical_url) and `getRecentPosts(excludeSlug, 3)`.
- `lib/projects/queries.ts`: `getSitemapProjects()` (slug, updated_at).
- `components/layout/Footer.tsx`: GitHub only (`rel="me noopener noreferrer"`, `target="_blank"`), and "Liberia".
- `sections/Hero.tsx`:
  - The main image gets `preload` and `alt="Portrait of Mohammed N. Rogers"`.
  - The outline image gets `alt=""`.
  - LET'S WORK gets `href="/start-a-project"`.
- `components/gallery/TornImage.tsx`, `components/about/TiltPhotos.tsx`: `priority` → `preload`.
- `app/api/project-requests/route.ts`: `after(() => notifyNewProjectRequest(...))` on success.
- `next.config.ts`: the `X-Robots-Tag` headers.
- `.env.example`: the new variables, documented.

## Implementation requirements

- **Use the framework's native APIs only:** `Metadata`, `Viewport`, `MetadataRoute`, `ImageResponse`, `after`. No SEO packages, no new dependencies.
- **Absolute URLs** in JSON-LD and the sitemap are built with `absoluteUrl(path)` from `SITE_URL`. Metadata URLs are relative and resolved by `metadataBase`.
- **Supabase storage URLs** (covers) are already absolute. Use them as they are.
- **Cover alt text:** use the DB value. Fall back to the project name or post title.
- **Project title:** `${name} — ${tagline}` when it's 60 characters or fewer, otherwise just `name`.
- **Blog post description:** `seo_description ?? summary`.
- **OG for posts:** `type: "article"`, `publishedTime`, `modifiedTime`, `authors: [absoluteUrl("/about")]`.
- **Not-found pages:** `generateMetadata` for a missing project or post must not throw, and must not emit a canonical.
- **Sitemap queries:**
  - Use the existing cached public client and tags (`PROJECTS_CACHE_TAG`, `BLOG_CACHE_TAG`).
  - Projects filter `is_published = true`. Blog relies on RLS, which already hides drafts and scheduled posts.
  - A missing-table error degrades to an empty list, as the existing blog handling does.
- **Visuals:** the `/projects` heading change keeps exactly the same classes and rendered look. Only the element types swap: the badge becomes `<p>` and the heading becomes `<h1>`.
- **Footer:** the social markup and styling stay as they are, with only the array shortened.
- **Resend sender (`lib/email/resend.ts`):**
  - `import "server-only"`.
  - `POST https://api.resend.com/emails` with `Authorization: Bearer ${RESEND_API_KEY}` and JSON `{ from, to, subject, text }`.
  - `cache: "no-store"`, `signal: AbortSignal.timeout(8000)`.
  - Returns `{ ok: boolean }`. Logs the status code only: no body, no PII, never the key.
- **Notification (`notifyNewProjectRequest(request, id)`):**
  - It's a no-op unless `RESEND_API_KEY`, `CONTACT_NOTIFY_TO` and `CONTACT_FROM_EMAIL` are all set.
  - Subject: `New project request: <business_name>`, with CR/LF stripped and the length capped at 120.
  - Plain-text body (no HTML, so no injection surface): name, location, project type, business, budget, deadline (or "Flexible"), preferred channel, phone if given, details, and the admin link `${SITE_URL}/admin/inquiries/${id}`.
  - It runs only after a successful insert. Bot or honeypot results and rate-limited requests send nothing.
  - Any failure is caught and logged, and never surfaces to the visitor.
- **API methods:** no changes. The only new route, `GET /og`, is a read route.

## Security requirements

- No secrets in client code. `RESEND_API_KEY`, `CONTACT_NOTIFY_TO` and `CONTACT_FROM_EMAIL` are server-only, never `NEXT_PUBLIC_`. `lib/email/*` imports `server-only`.
- No production secrets or dashboard settings are changed.
- Admin auth, the proxy, RLS and `isSameOrigin` stay unchanged. Indexing directives are a supplement, never a replacement.
- **JSON-LD:**
  - Escaped with `<` → `<`.
  - Only public, published data is used.
  - No email address or phone number goes into the markup, to avoid scraping.
- **The sitemap never lists** `/admin`, `/api`, `/r`, `/d`, drafts, unpublished projects or externally canonical posts.
- **The notification email** carries visitor data only to the owner's configured inbox. Nothing is sent to the visitor, so the endpoint can't be used to send mail to arbitrary addresses.
- **Share-link origin logic is not touched.**

## Acceptance criteria

- **Home:** `<title>` is "Mohammed N. Rogers | Full-Stack Software Engineer", with the brief's description and the canonical `https://mohammednrogers.online/`.
- **Every public page has:**
  - a unique title in the form `X | Mohammed N. Rogers`
  - a description
  - a self canonical on the new domain
  - `og:url`, `og:site_name`, `og:image`
  - `twitter:card = summary_large_image`
- **Project and post pages** use their cover image for OG when they have one, and `/og` otherwise.
- **`/sitemap.xml`** is valid XML, lists only the URLs in decision 15 on `https://mohammednrogers.online`, and uses real dates only.
- **`/robots.txt`** in production matches decision 14. In non-production it is `Disallow: /`.
- **Private routes:** `/admin/*` HTML has `noindex`, and `/admin`, `/api`, `/r` and `/d` responses carry `X-Robots-Tag: noindex, nofollow`.
- **Coding Courses** has `noindex, follow`.
- **JSON-LD:**
  - Person and WebSite on home, ProfilePage on /about, BlogPosting plus BreadcrumbList on posts, CreativeWork plus BreadcrumbList on projects.
  - All of them parse as valid JSON and use correct Schema.org types and properties.
- **Icons:** `/og` returns a 1200×630 PNG, and `/icon` and `/apple-icon` render.
- **No `vercel.app` URL** appears anywhere in the output.
- **Images:** no `priority` prop remains, and the hero main image has a descriptive alt plus `preload`.
- **Contact form:** with the Resend env vars unset, submitting works exactly as before and logs nothing alarming. With them set, one plain-text email arrives after a successful submission.
- **No visual regressions:** footer, hero and projects heading look identical apart from the removed placeholder icons and the "Liberia" text.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

```bash
npm run typecheck
npm run lint
npm run build
```

Then `npm run start`, and verify with curl:

- `/`, `/about`, `/projects`, a project, `/blog`, `/blog?page=2`, a post, `/learn/coding-courses`: titles, canonicals, OG, robots and JSON-LD.
- `/sitemap.xml`, `/robots.txt`, `/og`, `/icon`, `/apple-icon`.
- The `X-Robots-Tag` header on `/admin/login` and `/api/project-requests`.
- Every JSON-LD block parses with `node -e JSON.parse`.

## Manual test steps (to be shared after implementation)

1. `npm run build && npm run start`.
2. Check the home head and the canonical. On Windows, use `curl.exe` instead of `curl`.

   ```bash
   curl -s http://localhost:3000/ | grep -oE '<title>[^<]*</title>|<link rel="canonical"[^>]*>|<meta property="og:[^"]*" content="[^"]*"'
   ```

3. Check the sitemap and robots.

   ```bash
   curl -s http://localhost:3000/sitemap.xml
   curl -s http://localhost:3000/robots.txt
   ```

4. Check that admin, API and share-link responses carry the noindex header.

   ```bash
   curl -sI http://localhost:3000/admin/login | grep -i x-robots-tag
   curl -sI http://localhost:3000/api/project-requests | grep -i x-robots-tag
   ```

5. Open `http://localhost:3000/og`. It should be a 1200×630 brand image.
6. Run a project URL and a post URL through https://validator.schema.org (paste the page source) and the Rich Results Test after deploy.
7. Submit a Start-a-project request (or use the curl below). Without the Resend vars, nothing changes. With them set in `.env.local`, an email arrives.

   ```bash
   curl -s -X POST http://localhost:3000/api/project-requests \
     -H "Content-Type: application/json" \
     -d '{"name":"Test User","location":"Liberia","project_type":"Website","business_name":"Test Co","is_flexible":true,"deadline_date":null,"deadline_time":null,"budget":"$500 - $1,000","details":"Testing the notification email end to end.","channel":"callback","visitor_phone":"+231 770 000 000","website":"","started_at":<ms-timestamp-at-least-3s-ago>}'
   ```

8. Visually compare `/`, `/projects` and the footer with production.

## Manual configuration documented in the final report (not done by code)

- **Vercel:**
  - Add `mohammednrogers.online` and `www`, and set the apex as primary with `www` redirecting to it.
  - Set the `rogers-portfolio-theta.vercel.app` domain to redirect to the apex.
  - Set `NEXT_PUBLIC_SITE_URL` for **Production only**, plus the Resend vars.
- **Namecheap BasicDNS:**
  - The A and CNAME records exactly as Vercel's domain screen shows them.
  - Email forwarding for `hello@`. Its MX and SPF records stay on the apex.
  - Resend's records (MX and SPF on the `send` subdomain, DKIM `resend._domainkey`, optional DMARC) copied from the Resend dashboard. These don't conflict with forwarding.
- **Admin dashboard:** set the Project form `contact_email` to `hello@mohammednrogers.online`.
- **Supabase Auth:** optionally update the Site URL. Login is email and password through the API, so there are no OAuth or callback URLs to change.
- **Google Search Console:** add a Domain property, verify through a DNS TXT record in Namecheap, then submit `/sitemap.xml` and inspect the key URLs.
