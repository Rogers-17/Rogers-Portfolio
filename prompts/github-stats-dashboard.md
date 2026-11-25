# GitHub activity dashboard

## Goal

Make `/admin` a useful, read-only GitHub activity dashboard for the configured `Rogers-17` account, including contribution calendar, current and longest streaks, monthly commit chart, pull request and review activity, repository summary, and a clearly explained activity score. Include private-repository activity where the GitHub authorization allows it, aggregating private activity so private repository names and details are not exposed by default.

## Skills and guidance read

- `AGENTS.md`: prompt approval, current Next.js docs requirement before code, GET-only reads, Supabase/source conventions, required checks, manual API testing, and commit rule.
- No user-named or approved implementation skill applies to this dashboard feature.
- Official GitHub references: [GraphQL Users and contribution calendar](https://docs.github.com/en/graphql/reference/users), [GraphQL Commits](https://docs.github.com/en/graphql/reference/commits), [GraphQL rate limits](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api), and [Managing personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
- `prompts/admin-dashboard-phase-2.md` for the existing admin dashboard and visual conventions.

## Existing code inspected

- `app/admin/(dashboard)/page.tsx`: `/admin` currently redirects to `/admin/projects`.
- `app/admin/(dashboard)/layout.tsx` and `components/admin/AdminShell.tsx`: admin auth shell, responsive sidebar/nav, current navigation items, existing dark design system.
- `lib/site.ts`: verified GitHub profile handle and URL (`Rogers-17`).
- `app/globals.css`: admin theme colors and Tailwind 4 conventions.
- `lib/admin/auth.ts`, `lib/admin/client.ts`, and existing `app/api/admin/*` routes: authenticated admin read API conventions.
- `package.json`: Next.js 16.2.9, React 19, Zod 4, Tailwind 4; no chart library is installed.
- Existing `/admin` dashboard route and admin cards/charts referenced by `prompts/admin-dashboard-phase-2.md`.

## Decisions and assumptions

1. `/admin` becomes the GitHub overview page and gains a Dashboard entry in the sidebar. Projects remains available at `/admin/projects`.
2. Use the existing `site.socials` GitHub handle rather than duplicating an account-name setting.
3. GitHub data is read-only. The endpoint is `GET /api/admin/github/stats?year=YYYY`; no GitHub mutations or Supabase writes are needed.
4. Include private contributions only when a server-only GitHub credential has sufficient read access. Use the least-privilege supported read-only credential, preferably a fine-grained token restricted to this user's relevant repositories and only the account/repository read permissions needed. Never request or recommend a classic write-capable `repo` token as the default. Provide a clear setup/error state when the token or permissions are missing.
5. Private contribution totals may be shown in aggregates. Do not return private repository names, descriptions, commit messages, PR titles, or other private details to the browser. Public repo details may be shown.
6. Use GitHub contribution-calendar data for the daily heatmap. Do not label its combined contributions as commits. Use actual commit contribution counts for commit charts and clearly label the GitHub-defined commit scope. Show PR opened/merged/review counts only when the selected-year API data supports them; distinguish missing/unavailable data from zero.
7. Provide years supported by the API and a useful empty state for no activity. Use a short server cache or equivalent deduplication (about 10 minutes) to reduce upstream calls and respect rate limits, while keeping errors and partial data explicit.
8. The activity score is a custom 0–100 score, not an official GitHub score. For the selected year, calculate and disclose: `round(50 × min(commits / 365, 1) + 30 × min(merged PRs / 30, 1) + 20 × min(reviews / 50, 1))`. Show each component and denominator in an info tooltip/help panel; missing metrics must not silently count as zero.
9. Charts can use accessible SVG/CSS; do not add a chart dependency unless the implementation demonstrates that it is needed.

## Files likely to change

- `app/admin/(dashboard)/page.tsx` (render dashboard instead of redirect)
- `components/admin/AdminShell.tsx` (Dashboard navigation item and home link target)
- `app/admin/(dashboard)/github-dashboard/*` or `components/admin/github/*` (responsive dashboard UI)
- `app/api/admin/github/stats/route.ts` (admin-authenticated read-only GET)
- `lib/github/*` (server-only GitHub client, validated response mapping, calculations/cache as appropriate)
- `.env.example` (`GITHUB_READ_TOKEN`, server-only documentation)
- `prompts/github-stats-dashboard.md`
- No database migration is expected; no write endpoint or service-role credential is expected.

## Implementation requirements

1. Read applicable Next.js 16 documentation under `node_modules/next/dist/docs/` before writing code, including route handlers, server/client components, and the current caching directive/API. Do not use deprecated `unstable_cache` if current docs say it is replaced; ensure account/token-scoped data cannot leak through a shared cache.
2. Build a server-only GitHub API module. Keep the token out of client bundles, returned JSON, logs, and error messages. Set an explicit upstream timeout, send a GitHub API version and user agent, validate response status and payload, and map rate-limit/auth/permission/network errors to safe dashboard states.
3. Require admin auth on the GET route using current `requireAdminApi` and standard response helpers. Validate year bounds and never allow arbitrary GitHub API URLs/GraphQL strings from the request.
4. Fetch only fields necessary for selected-year statistics. Use GitHub GraphQL contribution collection/calendar fields for day-level contributions, total commit contributions, pull-request contributions, review contributions, and repositories where available. Resolve merged PR counts accurately for the selected year and be explicit about which values are unavailable. Do not substitute total contributions for commits or opened PRs for merged PRs.
5. Calculate current streak and longest streak from the selected year's daily activity with documented semantics (current streak is consecutive active days ending today, or yesterday if today has no contribution; longest streak uses all selected-year days). Define an active day consistently as a day with at least one contribution-calendar contribution.
6. Aggregate daily commit counts into calendar-month bins for a 12-month selected-year chart. Respect GitHub GraphQL connection limits/pagination and contribution repository limits; if a metric is incomplete, indicate the limitation instead of fabricating complete totals. Cross-check chart totals against the API's selected-year commit total where possible.
7. Return a stable, minimal, typed JSON shape with `year`, `generatedAt`, data source/freshness, totals, streaks, daily calendar values, monthly commit values, PR/review counts, and score inputs. Omit private repo names/details. Use partial/error metadata for unsupported fields or missing permissions.
8. Use a shared short cache for calls with safe keying. Do not key only by year if multiple GitHub identities/tokens can be configured in one deployment; do not cache secrets or include them in rendered data. Surface stale cached data if an upstream rate limit occurs and label its timestamp.
9. Build the page around the existing admin shell and its dark palette. Include loading, no-token/configuration, rate-limited/stale, API-error, and no-activity states; a year selector; contribution heatmap with text/accessible labels; current/longest streaks; monthly commit chart; PR opened/merged/review summary; score card with formula disclosure; and a source/freshness label.
10. Document the exact least-privilege GitHub credential setup in `.env.example` or a short admin setup note, including how to keep `GITHUB_READ_TOKEN` server-only. Private contribution aggregation may also depend on the GitHub profile's private-contribution sharing setting; show this as an actionable setup hint when the data indicates it.

## Visual interpretation and UI expectations

- Use the established admin shell and compact, high-contrast dark surface (`#05000a` page, `#131320` cards, `#e8e6f0` primary text, muted grays, purple/magenta accents `#751cff` and `#de0eff`). Match existing rounded card borders, restrained glow, focus rings, and typography; do not create a separate visual theme.
- At desktop widths, place a page heading with GitHub identity, selected year and freshness first; then a score/streak/top-metric row; then the full-width contribution calendar; then a 12-month commits chart beside PR/review summaries and any public repository breakdown. Keep private activity aggregate-only.
- At tablet and mobile widths, collapse into a single readable column, keep the year selector reachable, make the heatmap horizontally scrollable or reflowed without clipping, and provide a text equivalent for every chart.
- Use consistent spacing from existing admin pages (roughly 16–24 px card padding and 16 px gaps), clear numeric hierarchy, concise labels, keyboard-operable controls, and visible loading/error states. Avoid gratuitous animation and avoid adding a new charting library.
- Pixel expectation: the dashboard should look native beside `/admin/projects`; no horizontal overflow at 360 px, readable labels at 200% zoom, and useful empty/error states that preserve the same card layout.

## Security requirements

- `GITHUB_READ_TOKEN` must be server-only; never prefix it `NEXT_PUBLIC_`, render it, log it, or include it in errors/API responses.
- Use admin authentication for the endpoint and do not let caller input control upstream URL, query text, repository selection, or arbitrary GraphQL.
- Request no write permissions. Do not use a classic `repo` scope by default. Restrict private repository access to read-only and only the intended repositories/account.
- Do not disclose private repository names or private event details in API output, logs, client HTML, metadata, or charts. Only aggregated counts are permitted for private activity.
- Apply upstream timeout, bounded pagination and response sizes, year validation, safe cache isolation, and graceful rate-limit handling.
- Never present estimates, incomplete data, or unavailable metrics as exact zero values.

## Acceptance criteria

1. `/admin` displays a real authenticated GitHub activity overview and the sidebar has a working Dashboard link; `/admin/projects` is unchanged.
2. The selected year shows a contribution heatmap, current and longest streak, actual monthly commit totals, PR opened/merged and review totals where available, and a 0–100 score with its full formula and inputs visible.
3. Private activity appears only as aggregate counts; no private repository identifiers or content reach the client.
4. Missing token/permission, private-contribution setting disabled, no activity, timeout, and rate limit each produce an understandable state; stale data is labeled if used.
5. GitHub API credentials stay server-only, all upstream calls are bounded/cached, and the endpoint remains read-only and admin-authenticated.
6. `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Checks to run

From the repository root, run and report the exact output for:

```bash
npm run typecheck
npm run lint
npm run build
```

Build is required because the change adds a route and server integration. After checks pass, commit with a concise message as required by `AGENTS.md`.

## Exact manual test steps expected after implementation

1. Set `GITHUB_READ_TOKEN` in `.env.local` using the documented read-only permissions and ensure it is not prefixed with `NEXT_PUBLIC_`. Start `npm run dev`, sign in to `/admin`, and confirm the Dashboard page loads for `Rogers-17`.
2. Select the current year and another year. Check that heatmap, streaks, monthly commits, PR/review totals, score inputs, and freshness label update consistently. Compare counts with the GitHub profile/activity for the same year; note GitHub contribution-graph rules for commits.
3. Inspect the browser network response/DOM for the stats endpoint and confirm only aggregates and public repository information are present; no private repository name, title, message, or token appears.
4. Temporarily remove the token and reload: verify the credential setup state. Restore it. To test rate-limit handling, use a controlled mock or temporarily force a safe upstream 403/timeout in local development; verify errors are clear and any stale value is labeled.
5. Verify mobile at 360 px and tablet/desktop widths, keyboard navigation, accessible labels/text equivalents, and no horizontal page overflow.
6. With the signed-in admin access token, make the read-only request:

```bash
curl -sS "http://localhost:3000/api/admin/github/stats?year=2026" \
  -H "Authorization: Bearer $TOKEN"
```

The endpoint is GET-only and has no JSON body. Update the year in the command to a year supported by the implementation.
