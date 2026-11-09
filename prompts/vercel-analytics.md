# Add Vercel Web Analytics

## Goal

Track page views on the public site with Vercel Web Analytics, so the owner can see traffic, top pages, referrers, countries and devices in the Vercel dashboard. The data must not include admin activity or the secret tokens in share links.

## Skills read

- `AGENTS.md`
- No project skills exist in the repo.
- `node_modules/next/dist/docs/01-app/02-guides/analytics.md`: Next 16 points to Vercel's managed service for analytics. No Next API changes affect this work.

## Existing code inspected

- `package.json` / `pnpm-lock.yaml`: the project uses **pnpm**. `@vercel/analytics` is not installed.
- `app/layout.tsx`: the root layout. It is a Server Component and renders `<body>{children}</body>`. The analytics component goes here.
- `app/(site)/layout.tsx`: public layout with the Navbar and Footer.
- `app/admin/layout.tsx`: admin layout, already noindex.
- `app/d/[token]/page.tsx`, `app/d/[token]/download/route.ts`, `app/r/[token]/page.tsx`: document and resume share links. The `[token]` is a bearer secret, because anyone with the URL can open the file.
- `proxy.ts`: the matcher covers only `/admin/:path*` and `/api/admin/:path*`, so it won't intercept `/_vercel/insights/*`.
- `next.config.ts`: no Content-Security-Policy, so nothing blocks `/_vercel/insights/script.js`.

## Decisions

1. **Package:** `@vercel/analytics`, using the `<Analytics />` component from `@vercel/analytics/next`. That entry point reports Next routes as patterns, for example `/projects/[slug]`.
2. **Mount once in the root layout** (`app/layout.tsx`) through a small client wrapper. `beforeSend` is a function, and a Server Component can't pass a function to a Client Component as a prop, so the wrapper has to be a client file.
3. **Drop admin traffic.** `beforeSend` returns `null` for any URL whose path starts with `/admin`. Owner sessions shouldn't inflate the stats or leak admin URLs and query strings.
4. **Redact share tokens.** `beforeSend` rewrites `/d/<token>…` to `/d/[token]…` and `/r/<token>…` to `/r/[token]…`, and removes the query string on those paths. Views of share links are still counted, but the tokens never reach Vercel.
5. **Web Analytics only.** Speed Insights (`@vercel/speed-insights`) is a separate product and is left out unless the owner asks for it.
6. **No env vars and no consent banner.** Vercel Web Analytics sets no cookies and doesn't identify visitors. It only collects data on Vercel deployments where Analytics is enabled. In local dev it logs to the console in debug mode and sends nothing.

## Files likely to change

- `package.json`, `pnpm-lock.yaml`: add `@vercel/analytics`.
- `components/analytics/SiteAnalytics.tsx` (new): `"use client"` wrapper with `beforeSend`.
- `app/layout.tsx`: render `<SiteAnalytics />` inside `<body>` after `{children}`.

## Implementation requirements

- Install with `pnpm add @vercel/analytics`.
- `SiteAnalytics.tsx`:
  - `"use client"`; `import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next"`.
  - A pure `beforeSend(event: BeforeSendEvent): BeforeSendEvent | null` defined at module scope:
    - parse `event.url` with `new URL()`; return `null` if parsing fails.
    - `/admin` or `/admin/...` → `null`.
    - `^/(d|r)/[^/]+(/.*)?$` → replace the segment with `[token]`, clear `search` and `hash`, and return `{ ...event, url: u.toString() }`.
    - otherwise return the event unchanged.
  - Render `<Analytics beforeSend={beforeSend} />`.
- `app/layout.tsx`: import the wrapper and place it as the last child of `<body>`. Change nothing else in the layout or metadata.

## Security requirements

- Share tokens (`/d/[token]`, `/r/[token]`) must never appear in analytics payloads.
- No admin URLs or admin query strings are sent.
- No PII, cookies or user identifiers are added. No custom events carry form data such as contact or start-a-project inputs.
- No new env vars and no secrets.

## Acceptance criteria

- `@vercel/analytics` appears in `dependencies`.
- The `<Analytics />` script loads on every public page of a Vercel deployment, and page views appear under Vercel › Project › Analytics.
- Visiting `/admin/*` sends no analytics request.
- Visiting `/d/abc123` sends a payload whose URL contains `/d/[token]`, not `abc123`.
- Visual output is unchanged, because the component renders no UI.
- `npm run typecheck`, `npm run lint` and `npm run build` pass.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (the root layout changed)
- Then commit: `feat(analytics): add Vercel Web Analytics with admin and share-token filtering`

## Manual test steps after implementation

1. Vercel › Project › **Analytics** is enabled (the owner confirmed this is done).
2. Local smoke test: `npm run dev`, open `http://localhost:3000`, open the DevTools console, and confirm the `[Vercel Web Analytics]` debug log for the pageview.
   - Open `/admin/login`: no pageview log appears.
   - Open `/d/test-token`: the logged URL shows `/d/[token]`.
3. Deploy (push to `main` or a preview). On the deployed site, open DevTools › Network and filter `insights`. Expect `script.js` to load and a `POST /_vercel/insights/view` request per navigation.
4. Within a minute or two, check that visits appear in the Vercel Analytics dashboard.
5. There are no API routes to curl. Analytics is a client-side beacon only.
